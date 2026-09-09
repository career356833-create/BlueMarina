import "server-only";

import {
  buildNifsFemoEnvironment,
  deriveNifsFemoFreshness,
  NIFS_FEMO_PROVIDER,
  NIFS_FEMO_QUALITY_CLASS,
  NIFS_FEMO_SOURCE_ID,
  NIFS_FEMO_SOURCE_TIMEZONE,
  type NifsFemoFreshness,
  type NifsFemoQuality,
  type NifsFisheryEnvironmentSample,
} from "./nifs-fishery-environment";
import { formatAsiaSeoulWallClock } from "./nifs-realtime-fishing";

const DEFAULT_SEA_URL = "https://www.nifs.go.kr/OpenAPI_json?id=femoSeaList";
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 3_000_000;
export const NIFS_FEMO_CACHE_SECONDS = 24 * 60 * 60;
export const NIFS_FEMO_STALE_FALLBACK_SECONDS = 7 * 24 * 60 * 60;

export type NifsFisheryEnvironmentResponse = {
  ok: true;
  source: {
    provider: typeof NIFS_FEMO_PROVIDER;
    sourceId: typeof NIFS_FEMO_SOURCE_ID;
    qualityClass: typeof NIFS_FEMO_QUALITY_CLASS;
  };
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  latestSampledAt: string | null;
  freshness: NifsFemoFreshness;
  delivery: "live" | "stale_fallback";
  sourceTime: { timezone: typeof NIFS_FEMO_SOURCE_TIMEZONE };
  queryWindow: { startDate: string; endDate: string };
  samples: NifsFisheryEnvironmentSample[];
  quality: NifsFemoQuality;
};

type CacheEntry = { response: NifsFisheryEnvironmentResponse; expiresAt: number; staleUntil: number };
let cache: CacheEntry | null = null;

export class NifsFisheryEnvironmentSourceError extends Error {
  constructor(public readonly code: "SOURCE_DISABLED" | "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE" | "UPSTREAM_CONTRACT_ERROR") {
    super(code);
  }
}

function items(payload: unknown): Record<string, unknown>[] {
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
  const value = (header as Record<string, unknown>).resultCode;
  return value === undefined ? null : String(value);
}

function queryWindow(now: Date) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 365);
  const format = (value: Date) => value.toISOString().slice(0, 10).replaceAll("-", "");
  return { startDate: format(start), endDate: format(end) };
}

async function fetchRows(baseUrl: string, apiKey: string, startDate: string, endDate: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("sdate", startDate);
  url.searchParams.set("edate", endDate);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), headers: { accept: "application/json" } });
    if (!response.ok) throw new NifsFisheryEnvironmentSourceError("UPSTREAM_ERROR");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new NifsFisheryEnvironmentSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder("utf-8").decode(buffer));
    } catch {
      throw new NifsFisheryEnvironmentSourceError("UPSTREAM_CONTRACT_ERROR");
    }
    if (resultCode(payload) !== "00") throw new NifsFisheryEnvironmentSourceError("UPSTREAM_CONTRACT_ERROR");
    return items(payload);
  } catch (error) {
    if (error instanceof NifsFisheryEnvironmentSourceError) throw error;
    const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new NifsFisheryEnvironmentSourceError(timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR");
  }
}

export function clearNifsFisheryEnvironmentCache() {
  cache = null;
}

export async function getNifsFisheryEnvironment(): Promise<NifsFisheryEnvironmentResponse> {
  if (process.env.NIFS_FISHERY_ENVIRONMENT_ENABLED !== "true") throw new NifsFisheryEnvironmentSourceError("SOURCE_DISABLED");
  const apiKey = process.env.NIFS_FEMO_API_KEY;
  if (!apiKey) throw new NifsFisheryEnvironmentSourceError("API_KEY_MISSING");
  const now = Date.now();
  if (cache && now <= cache.expiresAt) return cache.response;
  try {
    const window = queryWindow(new Date(now));
    const rows = await fetchRows(process.env.NIFS_FEMO_SEA_URL ?? DEFAULT_SEA_URL, apiKey, window.startDate, window.endDate);
    if (rows.length === 0) throw new NifsFisheryEnvironmentSourceError("UPSTREAM_CONTRACT_ERROR");
    const fetchedAt = new Date(now).toISOString();
    const normalized = buildNifsFemoEnvironment(rows, fetchedAt, formatAsiaSeoulWallClock(new Date(now)));
    if (normalized.samples.length === 0) throw new NifsFisheryEnvironmentSourceError("UPSTREAM_CONTRACT_ERROR");
    if (normalized.quality.conflictingDuplicateRows > 0) throw new NifsFisheryEnvironmentSourceError("UPSTREAM_CONTRACT_ERROR");
    const response: NifsFisheryEnvironmentResponse = {
      ok: true,
      source: { provider: NIFS_FEMO_PROVIDER, sourceId: NIFS_FEMO_SOURCE_ID, qualityClass: NIFS_FEMO_QUALITY_CLASS },
      fetchedAt,
      lastSuccessfulFetchAt: fetchedAt,
      latestSampledAt: normalized.quality.latestSampledAt,
      freshness: deriveNifsFemoFreshness(normalized.quality.latestSampledAt, formatAsiaSeoulWallClock(new Date(now))),
      delivery: "live",
      sourceTime: { timezone: NIFS_FEMO_SOURCE_TIMEZONE },
      queryWindow: window,
      samples: normalized.samples,
      quality: normalized.quality,
    };
    cache = { response, expiresAt: now + NIFS_FEMO_CACHE_SECONDS * 1_000, staleUntil: now + NIFS_FEMO_STALE_FALLBACK_SECONDS * 1_000 };
    return response;
  } catch (error) {
    if (cache && now <= cache.staleUntil) return { ...cache.response, fetchedAt: new Date(now).toISOString(), delivery: "stale_fallback" };
    if (error instanceof NifsFisheryEnvironmentSourceError) throw error;
    throw new NifsFisheryEnvironmentSourceError("UPSTREAM_ERROR");
  }
}
