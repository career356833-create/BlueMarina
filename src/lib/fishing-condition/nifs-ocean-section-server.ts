import "server-only";

import {
  buildNifsOceanSectionDataset,
  isNifsOceanSectionRegion,
  NIFS_OCEAN_SECTION_PROVIDER,
  NIFS_OCEAN_SECTION_QUALITY_CLASS,
  NIFS_OCEAN_SECTION_REGIONS,
  NIFS_OCEAN_SECTION_SOURCE_ID,
  NIFS_OCEAN_SECTION_TIMEZONE,
  type NifsOceanSectionProfile,
  type NifsOceanSectionQuality,
  type NifsOceanSectionRegion,
  type NifsOceanSectionStation,
} from "./nifs-ocean-section";

const DEFAULT_CODE_URL = "https://www.nifs.go.kr/OpenAPI_json?id=sooCode";
const DEFAULT_LIST_URL = "https://www.nifs.go.kr/OpenAPI_json?id=sooList";
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 4_000_000;
const MAX_NORMALIZED_RESPONSE_BYTES = 15_000_000;
const MAX_PROFILE_ROWS = 10_000;
const MAX_CACHE_ENTRIES = 16;
export const NIFS_OCEAN_SECTION_CACHE_SECONDS = 12 * 60 * 60;
export const NIFS_OCEAN_SECTION_METADATA_CACHE_SECONDS = 24 * 60 * 60;
export const NIFS_OCEAN_SECTION_STALE_SECONDS = 7 * 24 * 60 * 60;

export type NifsOceanSectionQuery = {
  region?: NifsOceanSectionRegion;
  lineCode?: string;
  stationCode?: string;
  startDate: string;
  endDate: string;
};

type NifsOceanSectionQueryInput = Omit<Partial<NifsOceanSectionQuery>, "region"> & { region?: string };

export type NifsOceanSectionResponse = {
  ok: true;
  source: {
    provider: typeof NIFS_OCEAN_SECTION_PROVIDER;
    sourceId: typeof NIFS_OCEAN_SECTION_SOURCE_ID;
    qualityClass: typeof NIFS_OCEAN_SECTION_QUALITY_CLASS;
  };
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  delivery: "live" | "stale_fallback";
  sourceTime: { timezone: typeof NIFS_OCEAN_SECTION_TIMEZONE };
  queryWindow: { startDate: string; endDate: string; maxDays: 365 };
  filters: { region: NifsOceanSectionRegion | null; lineCode: string | null; stationCode: string | null };
  resultCounts: { stations: number; profiles: number; depthSamples: number };
  stationMetadata: NifsOceanSectionStation[];
  profiles: NifsOceanSectionProfile[];
  quality: NifsOceanSectionQuality;
};

type CacheEntry = { response: NifsOceanSectionResponse; expiresAt: number; staleUntil: number };
type MetadataCache = { rows: Partial<Record<NifsOceanSectionRegion, Record<string, unknown>[]>>; expiresAt: number; staleUntil: number };
const cache = new Map<string, CacheEntry>();
let metadataCache: MetadataCache | null = null;

export class NifsOceanSectionSourceError extends Error {
  constructor(public readonly code: "INVALID_QUERY" | "SOURCE_DISABLED" | "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE" | "UPSTREAM_CONTRACT_ERROR" | "UPSTREAM_ROW_LIMIT") {
    super(code);
  }
}

function compactDate(value: Date) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function validDate(value: string) {
  if (!/^\d{8}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function dateMs(value: string) {
  return Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
}

export function defaultNifsOceanSectionWindow(now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 364);
  return { startDate: compactDate(start), endDate: compactDate(end) };
}

export function validateNifsOceanSectionQuery(input: NifsOceanSectionQueryInput, now = new Date()): NifsOceanSectionQuery {
  const defaults = defaultNifsOceanSectionWindow(now);
  const startDate = input.startDate ?? defaults.startDate;
  const endDate = input.endDate ?? defaults.endDate;
  if (!validDate(startDate) || !validDate(endDate) || dateMs(startDate) > dateMs(endDate) || dateMs(endDate) - dateMs(startDate) > 365 * 86_400_000) {
    throw new NifsOceanSectionSourceError("INVALID_QUERY");
  }
  if (input.region && !isNifsOceanSectionRegion(input.region)) throw new NifsOceanSectionSourceError("INVALID_QUERY");
  for (const value of [input.lineCode, input.stationCode]) {
    if (value !== undefined && !/^[A-Za-z0-9_-]{1,32}$/.test(value)) throw new NifsOceanSectionSourceError("INVALID_QUERY");
  }
  return { region: input.region as NifsOceanSectionRegion | undefined, lineCode: input.lineCode, stationCode: input.stationCode, startDate, endDate };
}

function rows(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = root.body && typeof root.body === "object" ? root.body as Record<string, unknown> : null;
  const item = body?.item;
  if (Array.isArray(item)) return item.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  return item && typeof item === "object" ? [item as Record<string, unknown>] : [];
}

function resultCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const header = (payload as Record<string, unknown>).header;
  if (!header || typeof header !== "object") return null;
  const code = (header as Record<string, unknown>).resultCode;
  return code === undefined ? null : String(code);
}

async function fetchRows(baseUrl: string, apiKey: string, parameters: Record<string, string>) {
  const url = new URL(baseUrl);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), headers: { accept: "application/json" } });
    if (!response.ok) throw new NifsOceanSectionSourceError("UPSTREAM_ERROR");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new NifsOceanSectionSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder("utf-8").decode(buffer));
    } catch {
      throw new NifsOceanSectionSourceError("UPSTREAM_CONTRACT_ERROR");
    }
    if (resultCode(payload) !== "00") throw new NifsOceanSectionSourceError("UPSTREAM_CONTRACT_ERROR");
    return rows(payload);
  } catch (error) {
    if (error instanceof NifsOceanSectionSourceError) throw error;
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new NifsOceanSectionSourceError(timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR");
  }
}

async function stationRows(apiKey: string, now: number) {
  if (metadataCache && now <= metadataCache.expiresAt) return metadataCache.rows;
  try {
    const entries = await Promise.all(NIFS_OCEAN_SECTION_REGIONS.map(async (region) => [region, await fetchRows(process.env.NIFS_SOO_CODE_URL ?? DEFAULT_CODE_URL, apiKey, { gru_nam: region })] as const));
    const result = Object.fromEntries(entries) as Partial<Record<NifsOceanSectionRegion, Record<string, unknown>[]>>;
    if (Object.values(result).some((items) => !items || items.length === 0)) throw new NifsOceanSectionSourceError("UPSTREAM_CONTRACT_ERROR");
    metadataCache = { rows: result, expiresAt: now + NIFS_OCEAN_SECTION_METADATA_CACHE_SECONDS * 1_000, staleUntil: now + NIFS_OCEAN_SECTION_STALE_SECONDS * 1_000 };
    return result;
  } catch (error) {
    if (metadataCache && now <= metadataCache.staleUntil) return metadataCache.rows;
    throw error;
  }
}

function filteredResponse(response: NifsOceanSectionResponse, query: NifsOceanSectionQuery) {
  const matches = (profile: NifsOceanSectionProfile) => (!query.region || profile.regionCode === query.region) && (!query.lineCode || profile.lineCode === query.lineCode) && (!query.stationCode || profile.stationCode === query.stationCode);
  const profiles = response.profiles.filter(matches);
  const stationIds = new Set(profiles.map((profile) => profile.stationId));
  const stationMetadata = response.stationMetadata.filter((station) => stationIds.has(station.stationId));
  return {
    ...response,
    filters: { region: query.region ?? null, lineCode: query.lineCode ?? null, stationCode: query.stationCode ?? null },
    resultCounts: { stations: stationMetadata.length, profiles: profiles.length, depthSamples: profiles.reduce((count, profile) => count + profile.samples.length, 0) },
    stationMetadata,
    profiles,
  };
}

export function clearNifsOceanSectionCache() {
  cache.clear();
  metadataCache = null;
}

export async function getNifsOceanSection(input: NifsOceanSectionQueryInput = {}): Promise<NifsOceanSectionResponse> {
  if (process.env.NIFS_OCEAN_SECTION_ENABLED !== "true") throw new NifsOceanSectionSourceError("SOURCE_DISABLED");
  const apiKey = process.env.NIFS_SOO_API_KEY;
  if (!apiKey) throw new NifsOceanSectionSourceError("API_KEY_MISSING");
  const query = validateNifsOceanSectionQuery(input);
  const cacheKey = `${query.startDate}:${query.endDate}`;
  const now = Date.now();
  const existing = cache.get(cacheKey);
  if (existing && now <= existing.expiresAt) return filteredResponse(existing.response, query);
  try {
    const [metadataRows, profileRows] = await Promise.all([
      stationRows(apiKey, now),
      fetchRows(process.env.NIFS_SOO_LIST_URL ?? DEFAULT_LIST_URL, apiKey, { sdate: query.startDate, edate: query.endDate }),
    ]);
    if (profileRows.length === 0) throw new NifsOceanSectionSourceError("UPSTREAM_CONTRACT_ERROR");
    if (profileRows.length > MAX_PROFILE_ROWS) throw new NifsOceanSectionSourceError("UPSTREAM_ROW_LIMIT");
    const normalized = buildNifsOceanSectionDataset(metadataRows, profileRows);
    if (normalized.profiles.length === 0 || normalized.quality.conflictingDuplicateRows > 0) throw new NifsOceanSectionSourceError("UPSTREAM_CONTRACT_ERROR");
    const fetchedAt = new Date(now).toISOString();
    const response: NifsOceanSectionResponse = {
      ok: true,
      source: { provider: NIFS_OCEAN_SECTION_PROVIDER, sourceId: NIFS_OCEAN_SECTION_SOURCE_ID, qualityClass: NIFS_OCEAN_SECTION_QUALITY_CLASS },
      fetchedAt,
      lastSuccessfulFetchAt: fetchedAt,
      delivery: "live",
      sourceTime: { timezone: NIFS_OCEAN_SECTION_TIMEZONE },
      queryWindow: { startDate: query.startDate, endDate: query.endDate, maxDays: 365 },
      filters: { region: null, lineCode: null, stationCode: null },
      resultCounts: { stations: normalized.stations.length, profiles: normalized.profiles.length, depthSamples: normalized.quality.depthSamples },
      stationMetadata: normalized.stations,
      profiles: normalized.profiles,
      quality: normalized.quality,
    };
    if (new TextEncoder().encode(JSON.stringify(response)).byteLength > MAX_NORMALIZED_RESPONSE_BYTES) throw new NifsOceanSectionSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    cache.set(cacheKey, { response, expiresAt: now + NIFS_OCEAN_SECTION_CACHE_SECONDS * 1_000, staleUntil: now + NIFS_OCEAN_SECTION_STALE_SECONDS * 1_000 });
    while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    return filteredResponse(response, query);
  } catch (error) {
    if (existing && now <= existing.staleUntil) return filteredResponse({ ...existing.response, fetchedAt: new Date(now).toISOString(), delivery: "stale_fallback" }, query);
    if (error instanceof NifsOceanSectionSourceError) throw error;
    throw new NifsOceanSectionSourceError("UPSTREAM_ERROR");
  }
}
