import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS,
  NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
  type OceanSectionTemperatureClimatology,
} from "./nifs-ocean-section-climatology";
import { NIFS_OCEAN_SECTION_PROVIDER, NIFS_OCEAN_SECTION_SOURCE_ID } from "./nifs-ocean-section";

const ARTIFACT_ROOT = path.join(process.cwd(), "data", "nifs", "fishing-condition", "ocean-section", "climatology", "v1");
const MANIFEST_PATH = path.join(ARTIFACT_ROOT, "manifest.json");
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;
export const NIFS_OCEAN_SECTION_CLIMATOLOGY_CACHE_SECONDS = 24 * 60 * 60;

type ManifestFile = { month: number; path: string; cells: number; bytes: number; sha256: string };
type Manifest = {
  schemaVersion: "1.0";
  generatedAt: string;
  source: { provider: "NIFS"; sourceId: "nifs-soo-climatology"; qualityClass: "DERIVED_HISTORICAL_BASELINE"; derivedFrom: "nifs-soo" };
  historyWindow: { startYear: number; endYear: number; years: number[] };
  minSamples: number;
  cellCount: number;
  files: ManifestFile[];
  artifactSha256: string;
};

export type OceanSectionClimatologyQuery = { stationId?: string; month?: number; depth?: number; limit?: number };
type CacheEntry = { expiresAt: number; manifest: Manifest; byMonth: Map<number, OceanSectionTemperatureClimatology[]> };
let cache: CacheEntry | null = null;

export class NifsOceanSectionClimatologyError extends Error {
  constructor(public readonly code: "INVALID_QUERY" | "ARTIFACT_UNAVAILABLE" | "ARTIFACT_INTEGRITY_ERROR") {
    super(code);
  }
}

function validateQuery(input: OceanSectionClimatologyQuery) {
  if (input.stationId !== undefined && !/^[A-Za-z0-9_-]{1,65}$/.test(input.stationId)) throw new NifsOceanSectionClimatologyError("INVALID_QUERY");
  if (input.month !== undefined && (!Number.isInteger(input.month) || input.month < 1 || input.month > 12)) throw new NifsOceanSectionClimatologyError("INVALID_QUERY");
  if (input.depth !== undefined && !Number.isFinite(input.depth)) throw new NifsOceanSectionClimatologyError("INVALID_QUERY");
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new NifsOceanSectionClimatologyError("INVALID_QUERY");
  return { ...input, limit };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadArtifact() {
  const now = Date.now();
  if (cache && now <= cache.expiresAt) return cache;
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
    if (manifest.schemaVersion !== "1.0" || manifest.source.sourceId !== NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID || manifest.source.derivedFrom !== NIFS_OCEAN_SECTION_SOURCE_ID || manifest.files.length !== 12) {
      throw new NifsOceanSectionClimatologyError("ARTIFACT_INTEGRITY_ERROR");
    }
    const byMonth = new Map<number, OceanSectionTemperatureClimatology[]>();
    for (const file of manifest.files) {
      const content = await readFile(path.join(ARTIFACT_ROOT, file.path), "utf8");
      if (sha256(content) !== file.sha256) throw new NifsOceanSectionClimatologyError("ARTIFACT_INTEGRITY_ERROR");
      const cells = content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as OceanSectionTemperatureClimatology);
      if (cells.length !== file.cells || cells.some((cell) => cell.month !== file.month || cell.sourceId !== NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID)) {
        throw new NifsOceanSectionClimatologyError("ARTIFACT_INTEGRITY_ERROR");
      }
      byMonth.set(file.month, cells);
    }
    const artifactSha256 = sha256(manifest.files.map((file) => `${file.month}:${file.sha256}`).join("\n"));
    if (artifactSha256 !== manifest.artifactSha256) throw new NifsOceanSectionClimatologyError("ARTIFACT_INTEGRITY_ERROR");
    cache = { expiresAt: now + NIFS_OCEAN_SECTION_CLIMATOLOGY_CACHE_SECONDS * 1_000, manifest, byMonth };
    return cache;
  } catch (error) {
    if (error instanceof NifsOceanSectionClimatologyError) throw error;
    throw new NifsOceanSectionClimatologyError("ARTIFACT_UNAVAILABLE");
  }
}

export function clearNifsOceanSectionClimatologyCache() {
  cache = null;
}

export async function getNifsOceanSectionClimatology(input: OceanSectionClimatologyQuery = {}) {
  const query = validateQuery(input);
  const artifact = await loadArtifact();
  const months = query.month ? [query.month] : artifact.manifest.files.map((file) => file.month);
  const matches = months.flatMap((month) => artifact.byMonth.get(month) ?? []).filter((cell) =>
    (!query.stationId || cell.stationId === query.stationId) &&
    (query.depth === undefined || cell.depthValue === query.depth),
  );
  const cells = matches.slice(0, query.limit);
  return {
    ok: true,
    source: {
      provider: NIFS_OCEAN_SECTION_PROVIDER,
      sourceId: NIFS_OCEAN_SECTION_CLIMATOLOGY_SOURCE_ID,
      qualityClass: NIFS_OCEAN_SECTION_CLIMATOLOGY_QUALITY_CLASS,
      derivedFrom: NIFS_OCEAN_SECTION_SOURCE_ID,
    },
    generatedAt: artifact.manifest.generatedAt,
    historyWindow: artifact.manifest.historyWindow,
    minSamples: artifact.manifest.minSamples,
    filters: { stationId: query.stationId ?? null, month: query.month ?? null, depth: query.depth ?? null },
    result: { totalMatched: matches.length, returned: cells.length, limit: query.limit, truncated: matches.length > cells.length },
    cells,
  };
}
