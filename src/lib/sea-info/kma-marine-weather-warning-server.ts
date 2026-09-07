import "server-only";

import {
  KMA_MARINE_WEATHER_WARNINGS_LAYER_ID,
  normalizeKmaMarineWeatherWarnings,
  parseKmaCurrentWarnings,
  parseKmaWarningHistory,
  parseKmaWarningZones,
  summarizeKmaMarineWeatherWarnings,
  type KmaMarineWeatherWarningsResponse,
  type KmaWarningHistoryRow,
  type KmaWarningZone,
} from "@/lib/marine-navigation/adapters/kma-marine-weather-warnings";

const ROOT = "https://apihub.kma.go.kr/api/typ01/url";
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 2_000_000;
const CURRENT_FRESH_MS = 5 * 60 * 1_000;
const CURRENT_STALE_MS = 60 * 60 * 1_000;
const HISTORY_FRESH_MS = 20 * 60 * 1_000;
const HISTORY_STALE_MS = 60 * 60 * 1_000;
const ZONE_FRESH_MS = 24 * 60 * 60 * 1_000;
const ZONE_STALE_MS = 7 * 24 * 60 * 60 * 1_000;

type Entry<T> = { data: T; fetchedAt: string; expiresAt: number; staleUntil: number };
let currentCache: Entry<KmaMarineWeatherWarningsResponse> | null = null;
let historyCache: Entry<KmaWarningHistoryRow[]> | null = null;
let zoneCache: Entry<KmaWarningZone[]> | null = null;

export class KmaMarineWeatherWarningSourceError extends Error {
  constructor(public readonly code: "SOURCE_DISABLED" | "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE") { super(code); }
}

function kstCompact(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}`;
}

async function fetchKma(path: string, key: string, params: Record<string, string>, encoding: "utf-8" | "euc-kr") {
  const url = new URL(`${ROOT}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("authKey", key);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new KmaMarineWeatherWarningSourceError("UPSTREAM_ERROR");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) throw new KmaMarineWeatherWarningSourceError("UPSTREAM_RESPONSE_TOO_LARGE");
    return new TextDecoder(encoding).decode(buffer);
  } catch (error) {
    if (error instanceof KmaMarineWeatherWarningSourceError) throw error;
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new KmaMarineWeatherWarningSourceError(timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR");
  }
}

async function cachedSupporting<T>(entry: Entry<T> | null, freshMs: number, staleMs: number, loader: () => Promise<T>, save: (next: Entry<T>) => void) {
  const now = Date.now();
  if (entry && now <= entry.expiresAt) return entry.data;
  try {
    const data = await loader();
    const fetchedAt = new Date().toISOString();
    save({ data, fetchedAt, expiresAt: now + freshMs, staleUntil: now + staleMs });
    return data;
  } catch {
    if (entry && now <= entry.staleUntil) return entry.data;
    return [] as T;
  }
}

export async function getKmaMarineWeatherWarnings(): Promise<KmaMarineWeatherWarningsResponse> {
  if (process.env.KMA_MARINE_WARNING_ENABLED !== "true") throw new KmaMarineWeatherWarningSourceError("SOURCE_DISABLED");
  const key = process.env.KMA_MARINE_WARNING_API_KEY;
  if (!key) throw new KmaMarineWeatherWarningSourceError("API_KEY_MISSING");
  const now = Date.now();
  if (currentCache && now <= currentCache.expiresAt) return currentCache.data;
  try {
    const [currentText, history, zones] = await Promise.all([
      fetchKma("wrn_now_data_new.php", key, { fe: "e", tm: "", disp: "1", help: "0" }, "utf-8"),
      cachedSupporting(historyCache, HISTORY_FRESH_MS, HISTORY_STALE_MS, async () => {
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1_000);
        return parseKmaWarningHistory(await fetchKma("wrn_met_data.php", key, { reg: "0", wrn: "A", tmfc1: kstCompact(start), tmfc2: kstCompact(end), disp: "1", help: "0" }, "euc-kr"));
      }, (entry) => { historyCache = entry; }),
      cachedSupporting(zoneCache, ZONE_FRESH_MS, ZONE_STALE_MS, async () => parseKmaWarningZones(await fetchKma("wrn_reg.php", key, { tmfc: "0", help: "0" }, "euc-kr")), (entry) => { zoneCache = entry; }),
    ]);
    const fetchedAt = new Date().toISOString();
    const current = parseKmaCurrentWarnings(JSON.parse(currentText), fetchedAt, now);
    const warnings = normalizeKmaMarineWeatherWarnings(current, history, zones);
    const response: KmaMarineWeatherWarningsResponse = { ok: true, warnings, fetchedAt, lastSuccessfulFetchAt: fetchedAt, freshness: "fresh", source: "기상청(KMA)", logicalLayerId: KMA_MARINE_WEATHER_WARNINGS_LAYER_ID, geometryCount: 0, quality: summarizeKmaMarineWeatherWarnings(current, warnings, history, zones) };
    currentCache = { data: response, fetchedAt, expiresAt: now + CURRENT_FRESH_MS, staleUntil: now + CURRENT_STALE_MS };
    return response;
  } catch (error) {
    if (currentCache && now <= currentCache.staleUntil) return { ...currentCache.data, fetchedAt: new Date().toISOString(), freshness: "stale" };
    if (error instanceof KmaMarineWeatherWarningSourceError) throw error;
    throw new KmaMarineWeatherWarningSourceError("UPSTREAM_ERROR");
  }
}
