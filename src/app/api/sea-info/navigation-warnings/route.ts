import { NextResponse } from "next/server";
import {
  KHOA_NAVIGATION_WARNING_CACHE_SECONDS,
  KHOA_NAVIGATION_WARNING_UNAVAILABLE_MS,
  normalizeKhoaNavigationWarnings,
  parseKhoaNavigationWarningDetailXml,
  parseKhoaNavigationWarningListXml,
  summarizeKhoaNavigationWarningQuality,
  toKhoaNavigationWarningsGeoJson,
  type KhoaNavigationWarningsResponse,
} from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";

const LIST_ENDPOINT = "https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningInfo";
const DETAIL_ENDPOINT = "https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningDetailInfo";
const TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_LIST_PAGES = 10;
const MAX_DETAIL_PAGES = 10;
let cachedSnapshot: KhoaNavigationWarningsResponse | null = null;

function normalizeServiceKey(value: string) {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

async function fetchXml(endpoint: string, serviceKey: string, params: Record<string, string>) {
  const url = new URL(endpoint);
  url.searchParams.set("ServiceKey", normalizeServiceKey(serviceKey));
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/xml" } });
  if (!response.ok) throw new Error("KHOA_HTTP_ERROR");
  const xml = await response.text();
  if (Buffer.byteLength(xml, "utf8") > MAX_RESPONSE_BYTES) throw new Error("KHOA_RESPONSE_TOO_LARGE");
  return xml;
}

async function fetchSnapshot(serviceKey: string): Promise<KhoaNavigationWarningsResponse> {
  const fetchedAt = new Date().toISOString();
  const firstListXml = await fetchXml(LIST_ENDPOINT, serviceKey, { numOfRows: "100", pageNo: "1" });
  const firstList = parseKhoaNavigationWarningListXml(firstListXml);
  if (!firstList.ok) throw new Error(firstList.code);
  const pageCount = Math.max(1, Math.ceil(firstList.data.totalCount / 100));
  if (pageCount > MAX_LIST_PAGES) throw new Error("KHOA_LIST_PAGE_LIMIT");
  const remainingPages = await Promise.all(Array.from({ length: pageCount - 1 }, async (_, index) => {
    const xml = await fetchXml(LIST_ENDPOINT, serviceKey, { numOfRows: "100", pageNo: String(index + 2) });
    const page = parseKhoaNavigationWarningListXml(xml);
    if (!page.ok) throw new Error(page.code);
    return page.data.items;
  }));
  const listItems = [...firstList.data.items, ...remainingPages.flat()];
  const uniqueDocuments = [...new Set(listItems.map((item) => item.documentNumber))];
  const detailPages = await Promise.all(uniqueDocuments.map(async (documentNumber) => {
    const firstXml = await fetchXml(DETAIL_ENDPOINT, serviceKey, { doc_num: documentNumber, numOfRows: "100", pageNo: "1" });
    const first = parseKhoaNavigationWarningDetailXml(firstXml);
    if (!first.ok) throw new Error(first.code);
    const detailPageCount = Math.max(1, Math.ceil(first.data.totalCount / 100));
    if (detailPageCount > MAX_DETAIL_PAGES) throw new Error("KHOA_DETAIL_PAGE_LIMIT");
    const remaining = await Promise.all(Array.from({ length: detailPageCount - 1 }, async (_, index) => {
      const xml = await fetchXml(DETAIL_ENDPOINT, serviceKey, { doc_num: documentNumber, numOfRows: "100", pageNo: String(index + 2) });
      const page = parseKhoaNavigationWarningDetailXml(xml);
      if (!page.ok) throw new Error(page.code);
      return page.data.items;
    }));
    return [...first.data.items, ...remaining.flat()];
  }));
  const warnings = normalizeKhoaNavigationWarnings(listItems, detailPages.flat(), fetchedAt);
  return {
    ok: true,
    warnings,
    geoJson: toKhoaNavigationWarningsGeoJson(warnings),
    fetchedAt,
    lastSuccessfulFetchAt: fetchedAt,
    freshness: "fresh",
    cacheSeconds: KHOA_NAVIGATION_WARNING_CACHE_SECONDS,
    source: "국립해양조사원(KHOA)",
    quality: summarizeKhoaNavigationWarningQuality(listItems.length, warnings),
  };
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function GET() {
  if (process.env.KHOA_NAVIGATION_WARNING_ENABLED !== "true") return errorResponse("SOURCE_DISABLED", "KHOA 항행경보 연결이 비활성화되어 있습니다.", 503);
  const serviceKey = process.env.KHOA_NAVIGATION_WARNING_API_KEY;
  if (!serviceKey) return errorResponse("API_KEY_MISSING", "KHOA 항행경보 전용 API 키가 필요합니다.", 503);
  const now = Date.now();
  if (cachedSnapshot && now - Date.parse(cachedSnapshot.lastSuccessfulFetchAt) <= KHOA_NAVIGATION_WARNING_CACHE_SECONDS * 1_000) return NextResponse.json(cachedSnapshot);
  try {
    cachedSnapshot = await fetchSnapshot(serviceKey);
    return NextResponse.json(cachedSnapshot);
  } catch (error) {
    if (cachedSnapshot) {
      const age = now - Date.parse(cachedSnapshot.lastSuccessfulFetchAt);
      if (age <= KHOA_NAVIGATION_WARNING_UNAVAILABLE_MS) {
        return NextResponse.json({ ...cachedSnapshot, fetchedAt: new Date().toISOString(), freshness: "stale" });
      }
    }
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return errorResponse(timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE", timeout ? "KHOA 항행경보 응답 시간이 초과되었습니다." : "KHOA 항행경보를 불러올 수 없습니다.", timeout ? 504 : 502);
  }
}
