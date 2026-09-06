import { NextResponse } from "next/server";
import { normalizeTideRequestDate } from "@/lib/sea-info/tide-normalize";
import { parseKhoaTideObservationPayload } from "@/lib/sea-info/tide-observation-normalize";
import type { TideObservationResponse } from "@/lib/sea-info/types";

type CachedObservation = {
  data: TideObservationResponse;
  fetchedAt: string;
  expiresAt: number;
  staleUntil: number;
};

const KHOA_TIDE_OBSERVATION_ENDPOINT = "https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService";
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const FRESH_CACHE_MS = 10 * 60 * 1_000;
const STALE_CACHE_MS = 60 * 60 * 1_000;
const observationCache = new Map<string, CachedObservation>();

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function normalizeServiceKey(value: string) {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

function staleResponse(cached: CachedObservation | undefined) {
  if (!cached || Date.now() > cached.staleUntil) return null;
  return NextResponse.json({ ok: true, data: cached.data, freshness: "stale", lastSuccessfulFetchAt: cached.fetchedAt });
}

export async function GET(request: Request) {
  if (process.env.KHOA_TIDE_OBSERVATION_ENABLED !== "true") {
    return errorResponse("SOURCE_DISABLED", "KHOA 실측 조위 연결이 비활성화되어 있습니다.", 503);
  }

  const serviceKey = process.env.KHOA_TIDE_OBSERVATION_API_KEY;
  if (!serviceKey) return errorResponse("API_KEY_MISSING", "KHOA 실측 조위 전용 API 키가 필요합니다.", 503);

  const { searchParams } = new URL(request.url);
  const obsCode = searchParams.get("obsCode") ?? searchParams.get("stationId") ?? "";
  const reqDate = normalizeTideRequestDate(searchParams.get("date") ?? "");
  if (!obsCode) return errorResponse("MISSING_STATION", "obsCode 또는 stationId가 필요합니다.", 400);
  if (!reqDate) return errorResponse("INVALID_DATE", "date는 yyyyMMdd 또는 yyyy-MM-dd 형식이어야 합니다.", 400);

  const cacheKey = `${obsCode}:${reqDate}`;
  const cached = observationCache.get(cacheKey);
  if (cached && Date.now() <= cached.expiresAt) {
    return NextResponse.json({ ok: true, data: cached.data, freshness: "fresh", lastSuccessfulFetchAt: cached.fetchedAt });
  }

  const url = new URL(KHOA_TIDE_OBSERVATION_ENDPOINT);
  url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
  url.searchParams.set("type", "json");
  url.searchParams.set("obsCode", obsCode);
  url.searchParams.set("reqDate", reqDate);
  url.searchParams.set("min", "10");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "300");

  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!response.ok) return staleResponse(cached) ?? errorResponse("UPSTREAM_UNAVAILABLE", "KHOA 실측 조위 응답 상태가 비정상입니다.", 502);
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) return errorResponse("UPSTREAM_RESPONSE_TOO_LARGE", "KHOA 실측 조위 응답 크기가 제한을 초과했습니다.", 502);
    const payload: unknown = JSON.parse(text);
    const parsed = parseKhoaTideObservationPayload(payload, obsCode, reqDate);
    if (!parsed.ok) return staleResponse(cached) ?? errorResponse(parsed.code, parsed.message, 502);

    const fetchedAt = new Date().toISOString();
    observationCache.set(cacheKey, { data: parsed.data, fetchedAt, expiresAt: Date.now() + FRESH_CACHE_MS, staleUntil: Date.now() + STALE_CACHE_MS });
    return NextResponse.json({ ok: true, data: parsed.data, freshness: "fresh", lastSuccessfulFetchAt: fetchedAt });
  } catch (error) {
    const stale = staleResponse(cached);
    if (stale) return stale;
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return errorResponse(timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE", timeout ? "KHOA 실측 조위 응답 시간이 초과되었습니다." : "KHOA 실측 조위를 불러올 수 없습니다.", timeout ? 504 : 502);
  }
}
