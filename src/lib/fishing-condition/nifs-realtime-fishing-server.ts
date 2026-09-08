import "server-only";

import {
  buildNifsRisaEnvironment,
  deriveNifsRisaFreshness,
  formatAsiaSeoulWallClock,
  NIFS_RISA_PROVIDER,
  NIFS_RISA_QUALITY_CLASS,
  NIFS_RISA_SOURCE_ID,
  NIFS_RISA_SOURCE_TIMEZONE,
  NIFS_RISA_UNIT,
  type FishingConditionRealtimeEnvironment,
  type NifsRealtimeFreshness,
  type NifsRealtimeQuality,
} from "./nifs-realtime-fishing";

const DEFAULT_CODE_URL = "https://www.nifs.go.kr/api/OpenAPI_json?id=risaCode";
const DEFAULT_LIST_URL = "https://www.nifs.go.kr/api/OpenAPI_json?id=risaList";
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
export const NIFS_RISA_CACHE_SECONDS = 10 * 60;
export const NIFS_RISA_STALE_SECONDS = 2 * 60 * 60;

export type NifsRealtimeEnvironmentResponse = {
  ok: true;
  source: {
    provider: typeof NIFS_RISA_PROVIDER;
    sourceId: typeof NIFS_RISA_SOURCE_ID;
    qualityClass: typeof NIFS_RISA_QUALITY_CLASS;
    waterTemperatureUnit: typeof NIFS_RISA_UNIT;
  };
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  freshness: NifsRealtimeFreshness;
  sourceTime: {
    timezone: typeof NIFS_RISA_SOURCE_TIMEZONE;
    freshnessBasis: "NIFS_SOURCE_LOCAL_CLOCK_COMPARED_WITH_ASIA_SEOUL_OPERATIONAL_CLOCK";
  };
  stations: FishingConditionRealtimeEnvironment[];
  quality: NifsRealtimeQuality;
};

type CacheEntry = {
  response: NifsRealtimeEnvironmentResponse;
  expiresAt: number;
  staleUntil: number;
};

let cache: CacheEntry | null = null;

export class NifsRealtimeFishingSourceError extends Error {
  constructor(public readonly code: "SOURCE_DISABLED" | "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE" | "UPSTREAM_CONTRACT_ERROR") {
    super(code);
  }
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function items(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const response = root.response && typeof root.response === "object" ? root.response as Record<string, unknown> : null;
  const body = (root.body && typeof root.body === "object" ? root.body : response?.body) as Record<string, unknown> | undefined;
  const item = body?.item;
  if (Array.isArray(item)) return item.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  return item && typeof item === "object" ? [item as Record<string, unknown>] : [];
}

function resultCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const response = root.response && typeof root.response === "object" ? root.response as Record<string, unknown> : null;
  const header = (root.header && typeof root.header === "object" ? root.header : response?.header) as Record<string, unknown> | undefined;
  return header?.resultCode === undefined ? null : String(header.resultCode);
}

async function fetchNifsRows(baseUrl: string, apiKey: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("key", apiKey);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), headers: { accept: "application/json" } });
    if (!response.ok) throw new NifsRealtimeFishingSourceError("UPSTREAM_ERROR");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new NifsRealtimeFishingSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder("utf-8").decode(buffer));
    } catch {
      throw new NifsRealtimeFishingSourceError("UPSTREAM_CONTRACT_ERROR");
    }
    if (resultCode(payload) !== "00") throw new NifsRealtimeFishingSourceError("UPSTREAM_CONTRACT_ERROR");
    return items(payload);
  } catch (error) {
    if (error instanceof NifsRealtimeFishingSourceError) throw error;
    throw new NifsRealtimeFishingSourceError(isTimeout(error) ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR");
  }
}

function degradedFreshness(current: NifsRealtimeFreshness): NifsRealtimeFreshness {
  return current === "unavailable" ? "unavailable" : "stale";
}

export function clearNifsRealtimeFishingCache() {
  cache = null;
}

export async function getNifsRealtimeFishingEnvironment(): Promise<NifsRealtimeEnvironmentResponse> {
  if (process.env.NIFS_REALTIME_FISHING_ENABLED !== "true") throw new NifsRealtimeFishingSourceError("SOURCE_DISABLED");
  const apiKey = process.env.NIFS_RISA_API_KEY;
  if (!apiKey) throw new NifsRealtimeFishingSourceError("API_KEY_MISSING");
  const now = Date.now();
  if (cache && now <= cache.expiresAt) return cache.response;

  try {
    const [stationRows, observationRows] = await Promise.all([
      fetchNifsRows(process.env.NIFS_RISA_CODE_URL ?? DEFAULT_CODE_URL, apiKey),
      fetchNifsRows(process.env.NIFS_RISA_LIST_URL ?? DEFAULT_LIST_URL, apiKey),
    ]);
    if (stationRows.length === 0 || observationRows.length === 0) throw new NifsRealtimeFishingSourceError("UPSTREAM_CONTRACT_ERROR");
    const fetchedAt = new Date().toISOString();
    const sourceLocalNow = formatAsiaSeoulWallClock();
    const normalized = buildNifsRisaEnvironment(stationRows, observationRows, fetchedAt, sourceLocalNow);
    if (normalized.stations.length === 0) throw new NifsRealtimeFishingSourceError("UPSTREAM_CONTRACT_ERROR");
    const freshness = deriveNifsRisaFreshness(normalized.quality.newestObservedAt, sourceLocalNow);
    const response: NifsRealtimeEnvironmentResponse = {
      ok: true,
      source: { provider: NIFS_RISA_PROVIDER, sourceId: NIFS_RISA_SOURCE_ID, qualityClass: NIFS_RISA_QUALITY_CLASS, waterTemperatureUnit: NIFS_RISA_UNIT },
      fetchedAt, lastSuccessfulFetchAt: fetchedAt, freshness,
      sourceTime: { timezone: NIFS_RISA_SOURCE_TIMEZONE, freshnessBasis: "NIFS_SOURCE_LOCAL_CLOCK_COMPARED_WITH_ASIA_SEOUL_OPERATIONAL_CLOCK" },
      stations: normalized.stations, quality: normalized.quality,
    };
    cache = { response, expiresAt: now + NIFS_RISA_CACHE_SECONDS * 1_000, staleUntil: now + NIFS_RISA_STALE_SECONDS * 1_000 };
    return response;
  } catch (error) {
    if (cache && now <= cache.staleUntil) {
      return {
        ...cache.response,
        fetchedAt: new Date().toISOString(),
        freshness: degradedFreshness(cache.response.freshness),
        stations: cache.response.stations.map((station) => ({ ...station, freshness: degradedFreshness(station.freshness) })),
      };
    }
    if (error instanceof NifsRealtimeFishingSourceError) throw error;
    throw new NifsRealtimeFishingSourceError("UPSTREAM_ERROR");
  }
}
