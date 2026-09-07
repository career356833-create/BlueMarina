import "server-only";

import {
  parseKmaBuoyDetailObservations,
  parseKmaMarineObservations,
  parseKmaMarineStations,
  type KmaBuoyDetailObservation,
  type KmaMarineObservation,
  type KmaStationParseResult,
} from "./kma-marine-observation";

const KMA_ENDPOINT_ROOT = "https://apihub.kma.go.kr/api/typ01/url";
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const STATION_FRESH_MS = 24 * 60 * 60 * 1_000;
const STATION_STALE_MS = 7 * 24 * 60 * 60 * 1_000;
const OBSERVATION_FRESH_MS = 10 * 60 * 1_000;
const OBSERVATION_STALE_MS = 90 * 60 * 1_000;

type SourceName = "stations" | "seaObservation" | "buoyDetail";
type CacheEntry<T> = { data: T; fetchedAt: string; expiresAt: number; staleUntil: number };
type Snapshot<T> = { data: T; freshness: "fresh" | "stale"; fetchedAt: string; lastSuccessfulFetchAt: string };

const stationCache = new Map<SourceName, CacheEntry<KmaStationParseResult>>();
const observationCache = new Map<SourceName, CacheEntry<KmaMarineObservation[]>>();
const buoyCache = new Map<SourceName, CacheEntry<KmaBuoyDetailObservation[]>>();

export class KmaMarineObservationSourceError extends Error {
  constructor(public readonly code: "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE") {
    super(code);
  }
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function decodeText(buffer: ArrayBuffer, contentType: string) {
  const encoding = /euc-?kr/i.test(contentType) ? "euc-kr" : "utf-8";
  return new TextDecoder(encoding).decode(buffer);
}

async function fetchKmaText(path: string, key: string, params: Record<string, string>) {
  const url = new URL(`${KMA_ENDPOINT_ROOT}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("authKey", key);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!response.ok) throw new KmaMarineObservationSourceError("UPSTREAM_ERROR");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new KmaMarineObservationSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    return decodeText(buffer, response.headers.get("content-type") ?? "");
  } catch (error) {
    if (error instanceof KmaMarineObservationSourceError) throw error;
    throw new KmaMarineObservationSourceError(isTimeout(error) ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR");
  }
}

function cached<T>(entry: CacheEntry<T> | undefined, allowStale: boolean): Snapshot<T> | null {
  if (!entry) return null;
  const now = Date.now();
  if (now <= entry.expiresAt) return { data: entry.data, freshness: "fresh", fetchedAt: new Date().toISOString(), lastSuccessfulFetchAt: entry.fetchedAt };
  if (allowStale && now <= entry.staleUntil) return { data: entry.data, freshness: "stale", fetchedAt: new Date().toISOString(), lastSuccessfulFetchAt: entry.fetchedAt };
  return null;
}

function save<T>(cache: Map<SourceName, CacheEntry<T>>, source: SourceName, data: T, freshMs: number, staleMs: number): Snapshot<T> {
  const fetchedAt = new Date().toISOString();
  cache.set(source, { data, fetchedAt, expiresAt: Date.now() + freshMs, staleUntil: Date.now() + staleMs });
  return { data, freshness: "fresh", fetchedAt, lastSuccessfulFetchAt: fetchedAt };
}

export async function getKmaMarineStations(): Promise<Snapshot<KmaStationParseResult>> {
  const source: SourceName = "stations";
  const current = cached(stationCache.get(source), false);
  if (current) return current;
  const key = process.env.KMA_MARINE_STATION_API_KEY;
  if (!key) throw new KmaMarineObservationSourceError("API_KEY_MISSING");
  try {
    const text = await fetchKmaText("stn_inf.php", key, { inf: "BUOY", stn: "0", help: "0" });
    const parsed = parseKmaMarineStations(text);
    if (parsed.stations.length === 0) throw new KmaMarineObservationSourceError("UPSTREAM_ERROR");
    return save(stationCache, source, parsed, STATION_FRESH_MS, STATION_STALE_MS);
  } catch (error) {
    const stale = cached(stationCache.get(source), true);
    if (stale) return stale;
    throw error;
  }
}

export async function getKmaMarineObservationSnapshot(): Promise<Snapshot<KmaMarineObservation[]>> {
  const source: SourceName = "seaObservation";
  const current = cached(observationCache.get(source), false);
  if (current) return current;
  const key = process.env.KMA_MARINE_OBSERVATION_API_KEY;
  if (!key) throw new KmaMarineObservationSourceError("API_KEY_MISSING");
  try {
    const fetchedAt = new Date().toISOString();
    const text = await fetchKmaText("sea_obs.php", key, { stn: "0", help: "0" });
    const parsed = parseKmaMarineObservations(text, fetchedAt);
    if (parsed.length === 0) throw new KmaMarineObservationSourceError("UPSTREAM_ERROR");
    return save(observationCache, source, parsed, OBSERVATION_FRESH_MS, OBSERVATION_STALE_MS);
  } catch (error) {
    const stale = cached(observationCache.get(source), true);
    if (stale) return stale;
    throw error;
  }
}

export async function getKmaBuoyDetailSnapshot(): Promise<Snapshot<KmaBuoyDetailObservation[]>> {
  const source: SourceName = "buoyDetail";
  const current = cached(buoyCache.get(source), false);
  if (current) return current;
  const key = process.env.KMA_MARINE_BUOY_API_KEY;
  if (!key) throw new KmaMarineObservationSourceError("API_KEY_MISSING");
  try {
    const fetchedAt = new Date().toISOString();
    const text = await fetchKmaText("kma_buoy.php", key, { stn: "0", help: "0" });
    const parsed = parseKmaBuoyDetailObservations(text, fetchedAt);
    if (parsed.length === 0) throw new KmaMarineObservationSourceError("UPSTREAM_ERROR");
    return save(buoyCache, source, parsed, OBSERVATION_FRESH_MS, OBSERVATION_STALE_MS);
  } catch (error) {
    const stale = cached(buoyCache.get(source), true);
    if (stale) return stale;
    throw error;
  }
}
