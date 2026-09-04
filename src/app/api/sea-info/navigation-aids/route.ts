import { NextResponse } from "next/server";
import {
  KHOA_NAVIGATION_AIDS_ENDPOINT,
  KHOA_NAVIGATION_AID_CATEGORY_LABELS,
  KHOA_NAVIGATION_AIDS_REVALIDATE_SECONDS,
  isKhoaNavigationAidCategoryCode,
  parseKhoaNavigationAidsXml,
  toKhoaNavigationAidsGeoJson,
  type KhoaNavigationAidCategoryCode,
  type KhoaNavigationAidPage,
} from "@/lib/marine-navigation/adapters/khoa-navigation-aids";

export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_ROWS = 100;
const INVENTORY_ROWS = 5_000;
const CATEGORY_CODES = Object.keys(KHOA_NAVIGATION_AID_CATEGORY_LABELS) as KhoaNavigationAidCategoryCode[];

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function parseBoundedInteger(value: string | null, fallback: number, minimum: number, maximum: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function normalizeServiceKey(value: string) {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

async function fetchPage(serviceKey: string, category: KhoaNavigationAidCategoryCode, pageNo: number, numOfRows: number) {
  const upstream = new URL(KHOA_NAVIGATION_AIDS_ENDPOINT);
  upstream.searchParams.set("ServiceKey", normalizeServiceKey(serviceKey));
  upstream.searchParams.set("buoyNm", category);
  upstream.searchParams.set("numOfRows", String(numOfRows));
  upstream.searchParams.set("pageNo", String(pageNo));
  const response = await fetch(upstream, {
    next: { revalidate: KHOA_NAVIGATION_AIDS_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("UPSTREAM_STATUS");
  const parsed = parseKhoaNavigationAidsXml(await response.text(), category);
  if (!parsed.ok) throw new Error(parsed.code);
  return parsed.data;
}

function combinePages(pages: KhoaNavigationAidPage[], sumTotalCount = false): KhoaNavigationAidPage {
  const items = [...new Map(pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()];
  const duplicateIds = new Set(pages.flatMap((page) => page.quality.duplicateIds));
  const sum = (field: Exclude<keyof KhoaNavigationAidPage["quality"], "duplicateIds">) => pages.reduce((total, page) => total + page.quality[field], 0);
  return {
    items,
    pageNo: 1,
    numOfRows: items.length,
    totalCount: sumTotalCount ? pages.reduce((total, page) => total + page.totalCount, 0) : pages[0]?.totalCount ?? 0,
    quality: {
      duplicateIds: [...duplicateIds].sort(),
      invalidRecordCount: sum("invalidRecordCount"),
      invalidCoordinateCount: sum("invalidCoordinateCount"),
      missingNameCount: sum("missingNameCount"),
      missingKoreanNameCount: sum("missingKoreanNameCount"),
      missingEnglishNameCount: sum("missingEnglishNameCount"),
      missingTypeCount: sum("missingTypeCount"),
      missingLightCharacteristicCount: sum("missingLightCharacteristicCount"),
    },
  };
}

async function fetchCategoryInventory(serviceKey: string, category: KhoaNavigationAidCategoryCode) {
  const first = await fetchPage(serviceKey, category, 1, INVENTORY_ROWS);
  const pageCount = Math.ceil(first.totalCount / INVENTORY_ROWS);
  if (pageCount <= 1) return first;
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(serviceKey, category, index + 2, INVENTORY_ROWS)),
  );
  return combinePages([first, ...remaining]);
}

export async function GET(request: Request) {
  if (process.env.KHOA_NAVIGATION_AIDS_ENABLED !== "true") {
    return errorResponse(
      "SOURCE_CREDENTIAL_REQUIRED",
      "KHOA 항로표지 API의 별도 활용승인과 검증이 필요합니다.",
      503,
    );
  }

  const serviceKey = process.env.KHOA_NAVIGATION_AIDS_API_KEY;
  if (!serviceKey) {
    return errorResponse("API_KEY_MISSING", "KHOA 항로표지 전용 API 키가 필요합니다.", 503);
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("aidTypeCode");
  if (category !== null && !isKhoaNavigationAidCategoryCode(category)) {
    return errorResponse("INVALID_AID_TYPE", "지원하지 않는 공식 항로표지 구분코드입니다.", 400);
  }

  const pageNo = parseBoundedInteger(searchParams.get("page"), 1, 1, 100_000);
  const numOfRows = parseBoundedInteger(searchParams.get("rows"), 50, 1, MAX_ROWS);
  if (pageNo === null || numOfRows === null) {
    return errorResponse("INVALID_PAGINATION", "page 또는 rows 범위가 올바르지 않습니다.", 400);
  }

  try {
    const pages = category
      ? [await fetchPage(serviceKey, category, pageNo, numOfRows)]
      : await Promise.all(CATEGORY_CODES.map((code) => fetchCategoryInventory(serviceKey, code)));
    const data = combinePages(pages, category === null);

    return NextResponse.json({
      ok: true,
      data,
      geoJson: toKhoaNavigationAidsGeoJson(data),
      source: "국립해양조사원(KHOA)",
      cacheSeconds: KHOA_NAVIGATION_AIDS_REVALIDATE_SECONDS,
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return errorResponse(
      timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
      timeout ? "KHOA 항로표지 API 응답 시간이 초과되었습니다." : "KHOA 항로표지 API 호출에 실패했습니다.",
      timeout ? 504 : 502,
    );
  }
}
