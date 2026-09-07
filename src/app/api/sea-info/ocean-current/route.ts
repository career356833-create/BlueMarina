import { NextResponse } from "next/server";
import { buildKhoaRomsCacheKey, extractKhoaRomsEnvelope, KHOA_ROMS_MAX_PAGES, KHOA_ROMS_MAX_ROWS, KHOA_ROMS_PAGE_SIZE, normalizeKhoaRomsRows, parseKhoaRomsBbox, type KhoaRomsBbox } from "@/lib/sea-info/khoa-roms";

const ENDPOINT = "https://apis.data.go.kr/1192136/roms/GetRomsApiService";
const UPSTREAM_TIMEOUT_MS = 12_000;
const FRESH_CACHE_MS = 30 * 60 * 1_000;
const STALE_CACHE_MS = 2 * 60 * 60 * 1_000;
const MAX_RAW_RESPONSE_BYTES = 400_000;

type Success = {
  ok: true;
  data: { type: "FeatureCollection"; features: Array<{ type: "Feature"; id: string; geometry: { type: "Point"; coordinates: [number, number] }; properties: ReturnType<typeof normalizeKhoaRomsRows>["points"][number] }> };
  validTimes: string[];
  selectedValidAt: string;
  freshness: "fresh" | "stale";
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  meta: { pages: number; rawRows: number; renderedPoints: number; directionConvention: "UNKNOWN"; timeSemantic: "UNKNOWN"; timezone: "UNSPECIFIED" };
};

const cache = new Map<string, Success>();

function normalizeServiceKey(value: string) {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

function buildUrl(apiKey: string, bbox: KhoaRomsBbox, pageNo: number) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("type", "json");
  url.searchParams.set("numOfRows", String(KHOA_ROMS_PAGE_SIZE));
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("ymin", String(bbox.ymin));
  url.searchParams.set("ymax", String(bbox.ymax));
  url.searchParams.set("xmin", String(bbox.xmin));
  url.searchParams.set("xmax", String(bbox.xmax));
  return url;
}

function isAbort(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbox = parseKhoaRomsBbox(searchParams);
  const validAt = searchParams.get("validAt");
  if (!bbox) return NextResponse.json({ ok: false, code: "INVALID_BBOX", message: "bbox는 유효한 좌표이며 각 축 1도 이하여야 합니다." }, { status: 400 });
  if (validAt && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(validAt)) return NextResponse.json({ ok: false, code: "INVALID_VALID_TIME" }, { status: 400 });
  if (process.env.KHOA_ROMS_ENABLED !== "true") return NextResponse.json({ ok: false, code: "FEATURE_DISABLED" }, { status: 503 });
  const apiKey = process.env.KHOA_ROMS_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, code: "API_KEY_MISSING" }, { status: 503 });

  const cacheKey = buildKhoaRomsCacheKey(bbox, validAt);
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - Date.parse(cached.lastSuccessfulFetchAt) <= FRESH_CACHE_MS) return NextResponse.json(cached);

  try {
    const rows: unknown[] = [];
    let totalCount = 0;
    let totalBytes = 0;
    let pages = 0;
    for (let pageNo = 1; pageNo <= KHOA_ROMS_MAX_PAGES; pageNo += 1) {
      const response = await fetch(buildUrl(normalizeServiceKey(apiKey), bbox, pageNo), { cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
      const text = await response.text();
      totalBytes += Buffer.byteLength(text);
      if (totalBytes > MAX_RAW_RESPONSE_BYTES) throw new Error("RESPONSE_LIMIT_EXCEEDED");
      const envelope = extractKhoaRomsEnvelope(JSON.parse(text));
      if (envelope.resultCode !== "00") throw new Error(`UPSTREAM_RESULT_${envelope.resultCode}`);
      totalCount = envelope.totalCount;
      rows.push(...envelope.items);
      pages = pageNo;
      if (rows.length >= totalCount) break;
    }
    if (totalCount > KHOA_ROMS_MAX_ROWS || rows.length < totalCount) throw new Error("PAGE_LIMIT_EXCEEDED");
    const fetchedAt = new Date().toISOString();
    const normalized = normalizeKhoaRomsRows(rows, fetchedAt, validAt);
    if (!normalized.selectedValidAt || normalized.points.length === 0) throw new Error(validAt ? "VALID_TIME_NOT_FOUND" : "EMPTY_RESPONSE");
    const payload: Success = {
      ok: true,
      data: { type: "FeatureCollection", features: normalized.points.map((point) => ({ type: "Feature", id: point.id, geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, properties: point })) },
      validTimes: normalized.validTimes,
      selectedValidAt: normalized.selectedValidAt,
      freshness: "fresh",
      fetchedAt,
      lastSuccessfulFetchAt: fetchedAt,
      meta: { pages, rawRows: rows.length, renderedPoints: normalized.points.length, directionConvention: "UNKNOWN", timeSemantic: "UNKNOWN", timezone: "UNSPECIFIED" },
    };
    cache.set(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    if (cached && now - Date.parse(cached.lastSuccessfulFetchAt) <= STALE_CACHE_MS) return NextResponse.json({ ...cached, freshness: "stale", fetchedAt: new Date().toISOString() });
    const timeout = isAbort(error);
    return NextResponse.json({ ok: false, code: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE", message: "KHOA ROMS 모델 자료를 현재 불러올 수 없습니다." }, { status: timeout ? 504 : 502 });
  }
}
