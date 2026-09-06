import { XMLParser } from "fast-xml-parser";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import type { NavigationMarineLayerConfig } from "./navigation-map-adapter";

export const KHOA_NAVIGATION_WARNINGS_DATA_URL = "/api/sea-info/navigation-warnings";
export const KHOA_NAVIGATION_WARNINGS_LAYER_ID = "khoa-navigation-warnings";
export const KHOA_NAVIGATION_WARNING_CACHE_SECONDS = 600;
export const KHOA_NAVIGATION_WARNING_FRESH_MS = 15 * 60 * 1_000;
export const KHOA_NAVIGATION_WARNING_UNAVAILABLE_MS = 60 * 60 * 1_000;
export const KHOA_NAVIGATION_WARNING_SAFETY_NOTICE = "항행경보는 공식 공개 안전정보의 참고 표시이며 실제 통항 가능 여부를 자동 판정하지 않습니다. 출항 전 최신 관계기관 안내와 공식 항법정보를 확인하세요.";

export type NavigationWarningStatus = "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUPERSEDED" | "UNKNOWN";
export type NavigationWarningFreshness = "fresh" | "stale" | "unavailable";
export type NavigationWarningGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export type KhoaNavigationWarningListItem = {
  documentNumber: string;
  documentType: string | null;
  governmentCode: string | null;
  noticeCategory: string | null;
  applicationCategory: string | null;
  title: string | null;
  basic: string | null;
  content: string | null;
  area: string | null;
};

export type KhoaNavigationWarningDetailItem = {
  documentNumber: string;
  area: string | null;
  positionName: string | null;
  rawPositionText: string | null;
  positionDescription: string | null;
  alarmDate: string | null;
  alarmTime: string | null;
  seaPositionText: string | null;
};

export type KhoaNavigationWarning = KhoaNavigationWarningListItem & KhoaNavigationWarningDetailItem & {
  id: string;
  status: NavigationWarningStatus;
  geometry: NavigationWarningGeometry | null;
  geometryIssue: "none" | "missing" | "malformed" | "ambiguous";
  fetchedAt: string;
  source: "국립해양조사원(KHOA)";
};

export type KhoaNavigationWarningPage<T> = {
  items: T[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  resultCode: string;
  resultMsg: string;
};

export type KhoaNavigationWarningGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: NavigationWarningGeometry;
    properties: Omit<KhoaNavigationWarning, "geometry"> & { geometryType: NavigationWarningGeometry["type"] };
  }>;
};

export type KhoaNavigationWarningsResponse = {
  ok: true;
  warnings: KhoaNavigationWarning[];
  geoJson: KhoaNavigationWarningGeoJson;
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  freshness: NavigationWarningFreshness;
  cacheSeconds: number;
  source: "국립해양조사원(KHOA)";
  quality: {
    listCount: number;
    detailCount: number;
    detailJoinCount: number;
    pointCount: number;
    lineCount: number;
    polygonCount: number;
    geometryNullCount: number;
    malformedPositionCount: number;
    unknownLifecycleCount: number;
  };
};

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
});

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function integer(value: unknown): number {
  const parsed = Number(text(value) ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function sourceItems(body: Record<string, unknown>): Record<string, unknown>[] {
  const items = record(body.items);
  const item = items?.item;
  if (Array.isArray(item)) return item.map(record).filter((entry): entry is Record<string, unknown> => entry !== null);
  const single = record(item);
  return single ? [single] : [];
}

function envelope(xml: string) {
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return { ok: false as const, code: "INVALID_XML", message: "KHOA XML 응답을 해석할 수 없습니다." };
  }
  const response = record(record(parsed)?.response);
  const header = record(response?.header);
  const body = record(response?.body);
  if (!header || !body) return { ok: false as const, code: "INVALID_XML", message: "KHOA XML 응답 구조가 올바르지 않습니다." };
  const resultCode = text(header.resultCode) ?? "";
  const resultMsg = text(header.resultMsg) ?? "";
  if (resultCode !== "0" && resultCode !== "00") return { ok: false as const, code: "UPSTREAM_ERROR", message: resultMsg || `KHOA resultCode ${resultCode}` };
  return { ok: true as const, body, resultCode, resultMsg };
}

export function parseKhoaNavigationWarningListXml(xml: string): { ok: true; data: KhoaNavigationWarningPage<KhoaNavigationWarningListItem> } | { ok: false; code: string; message: string } {
  const parsed = envelope(xml);
  if (!parsed.ok) return parsed;
  const items = sourceItems(parsed.body).flatMap((item) => {
    const documentNumber = text(item.doc_num);
    if (!documentNumber) return [];
    return [{
      documentNumber,
      documentType: text(item.doc_type),
      governmentCode: text(item.gov_cd),
      noticeCategory: text(item.noti_cat),
      applicationCategory: text(item.app_cat),
      title: text(item.title),
      basic: text(item.basic),
      content: text(item.content),
      area: text(item.area),
    }];
  });
  return { ok: true, data: { items, pageNo: integer(parsed.body.pageNo), numOfRows: integer(parsed.body.numOfRows), totalCount: integer(parsed.body.totalCount), resultCode: parsed.resultCode, resultMsg: parsed.resultMsg } };
}

export function parseKhoaNavigationWarningDetailXml(xml: string): { ok: true; data: KhoaNavigationWarningPage<KhoaNavigationWarningDetailItem> } | { ok: false; code: string; message: string } {
  const parsed = envelope(xml);
  if (!parsed.ok) return parsed;
  const items = sourceItems(parsed.body).flatMap((item) => {
    const documentNumber = text(item.doc_num);
    if (!documentNumber) return [];
    return [{
      documentNumber,
      area: text(item.area),
      positionName: text(item.position_nm),
      rawPositionText: text(item.position),
      positionDescription: text(item.position_desc),
      alarmDate: text(item.alarm_date),
      alarmTime: text(item.alarm_time),
      seaPositionText: text(item.sea_pos),
    }];
  });
  return { ok: true, data: { items, pageNo: integer(parsed.body.pageNo), numOfRows: integer(parsed.body.numOfRows), totalCount: integer(parsed.body.totalCount), resultCode: parsed.resultCode, resultMsg: parsed.resultMsg } };
}

const dmsPairPattern = /(\d{1,2})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)\s*([NS])\s*,\s*(\d{1,3})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)\s*([EW])/gi;

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string) {
  if (minutes >= 60 || seconds >= 60) return null;
  const value = degrees + minutes / 60 + seconds / 3600;
  const signed = direction === "S" || direction === "W" ? -value : value;
  return Number.isFinite(signed) ? signed : null;
}

export function parseKhoaNavigationWarningPosition(rawPositionText: string | null): { coordinates: [number, number][]; malformed: boolean } {
  if (!rawPositionText) return { coordinates: [], malformed: false };
  const normalized = rawPositionText.replaceAll("&amp;#xD;", "\n").replaceAll("&#xD;", "\n").replaceAll("&#13;", "\n");
  const coordinates: [number, number][] = [];
  const residue = normalized.replace(dmsPairPattern, (_match, latDegrees: string, latMinutes: string, latSeconds: string, latDirection: string, lonDegrees: string, lonMinutes: string, lonSeconds: string, lonDirection: string) => {
    const latitude = dmsToDecimal(Number(latDegrees), Number(latMinutes), Number(latSeconds), latDirection.toUpperCase());
    const longitude = dmsToDecimal(Number(lonDegrees), Number(lonMinutes), Number(lonSeconds), lonDirection.toUpperCase());
    if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) coordinates.push([longitude, latitude]);
    return "";
  }).replace(/[\s,;]+/g, "");
  return { coordinates, malformed: coordinates.length === 0 || residue.length > 0 };
}

export function toKhoaNavigationWarningGeometry(rawPositionText: string | null, positionDescription: string | null): { geometry: NavigationWarningGeometry | null; issue: KhoaNavigationWarning["geometryIssue"] } {
  if (!rawPositionText) return { geometry: null, issue: "missing" };
  const parsed = parseKhoaNavigationWarningPosition(rawPositionText);
  if (parsed.malformed) return { geometry: null, issue: "malformed" };
  if (parsed.coordinates.length === 1) return { geometry: { type: "Point", coordinates: parsed.coordinates[0] }, issue: "none" };
  const description = positionDescription ?? "";
  if (parsed.coordinates.length >= 3 && description.includes("순차 연결") && description.includes("선내 해역")) {
    const ring = [...parsed.coordinates];
    const first = ring[0];
    const last = ring.at(-1);
    if (!last || first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    return { geometry: { type: "Polygon", coordinates: [ring] }, issue: "none" };
  }
  if (parsed.coordinates.length === 2 && description.includes("순차 연결") && !description.includes("선내 해역")) {
    return { geometry: { type: "LineString", coordinates: parsed.coordinates }, issue: "none" };
  }
  return { geometry: null, issue: "ambiguous" };
}

export function normalizeKhoaNavigationWarnings(listItems: KhoaNavigationWarningListItem[], detailItems: KhoaNavigationWarningDetailItem[], fetchedAt: string): KhoaNavigationWarning[] {
  const listByDocument = new Map(listItems.map((item) => [item.documentNumber, item]));
  const detailsByDocument = new Map<string, KhoaNavigationWarningDetailItem[]>();
  for (const detail of detailItems) detailsByDocument.set(detail.documentNumber, [...(detailsByDocument.get(detail.documentNumber) ?? []), detail]);
  const warnings: KhoaNavigationWarning[] = [];
  for (const list of listByDocument.values()) {
    const details = detailsByDocument.get(list.documentNumber) ?? [];
    if (details.length === 0) {
      warnings.push({ ...list, area: list.area, positionName: null, rawPositionText: null, positionDescription: null, alarmDate: null, alarmTime: null, seaPositionText: null, id: `${list.documentNumber}:list`, status: "UNKNOWN", geometry: null, geometryIssue: "missing", fetchedAt, source: "국립해양조사원(KHOA)" });
      continue;
    }
    for (const detail of details) {
      const mapped = toKhoaNavigationWarningGeometry(detail.rawPositionText, detail.positionDescription);
      warnings.push({ ...list, ...detail, id: `${list.documentNumber}:${detail.area ?? "detail"}`, status: "UNKNOWN", geometry: mapped.geometry, geometryIssue: mapped.issue, fetchedAt, source: "국립해양조사원(KHOA)" });
    }
  }
  return warnings;
}

export function toKhoaNavigationWarningsGeoJson(warnings: KhoaNavigationWarning[]): KhoaNavigationWarningGeoJson {
  return {
    type: "FeatureCollection",
    features: warnings.flatMap((warning) => {
      if (!warning.geometry) return [];
      const { geometry, ...properties } = warning;
      return [{ type: "Feature" as const, id: warning.id, geometry, properties: { ...properties, geometryType: geometry.type } }];
    }),
  };
}

export function summarizeKhoaNavigationWarningQuality(listCount: number, warnings: KhoaNavigationWarning[]) {
  return {
    listCount,
    detailCount: warnings.filter((warning) => !warning.id.endsWith(":list")).length,
    detailJoinCount: new Set(warnings.filter((warning) => !warning.id.endsWith(":list")).map((warning) => warning.documentNumber)).size,
    pointCount: warnings.filter((warning) => warning.geometry?.type === "Point").length,
    lineCount: warnings.filter((warning) => warning.geometry?.type === "LineString").length,
    polygonCount: warnings.filter((warning) => warning.geometry?.type === "Polygon").length,
    geometryNullCount: warnings.filter((warning) => warning.geometry === null).length,
    malformedPositionCount: warnings.filter((warning) => warning.geometryIssue === "malformed").length,
    unknownLifecycleCount: warnings.filter((warning) => warning.status === "UNKNOWN").length,
  };
}

export function warningGeometryPoints(geometry: NavigationWarningGeometry | null): Array<{ latitude: number; longitude: number }> {
  if (!geometry) return [];
  const coordinates = geometry.type === "Point" ? [geometry.coordinates] : geometry.type === "LineString" ? geometry.coordinates : geometry.coordinates[0];
  return coordinates.map(([longitude, latitude]) => ({ longitude, latitude }));
}

export function parseKhoaNavigationWarningFeatureProperties(value: unknown): KhoaNavigationWarning | null {
  const item = record(value);
  const id = text(item?.id);
  const documentNumber = text(item?.documentNumber);
  if (!item || !id || !documentNumber || text(item.source) !== "국립해양조사원(KHOA)") return null;
  const geometryIssue = text(item.geometryIssue);
  return {
    id,
    documentNumber,
    documentType: text(item.documentType),
    governmentCode: text(item.governmentCode),
    noticeCategory: text(item.noticeCategory),
    applicationCategory: text(item.applicationCategory),
    title: text(item.title),
    basic: text(item.basic),
    content: text(item.content),
    area: text(item.area),
    positionName: text(item.positionName),
    rawPositionText: text(item.rawPositionText),
    positionDescription: text(item.positionDescription),
    alarmDate: text(item.alarmDate),
    alarmTime: text(item.alarmTime),
    seaPositionText: text(item.seaPositionText),
    status: "UNKNOWN",
    geometry: null,
    geometryIssue: geometryIssue === "none" || geometryIssue === "missing" || geometryIssue === "malformed" || geometryIssue === "ambiguous" ? geometryIssue : "missing",
    fetchedAt: text(item.fetchedAt) ?? "",
    source: "국립해양조사원(KHOA)",
  };
}

export function createKhoaNavigationWarningsLayerConfig(geoJson: KhoaNavigationWarningGeoJson, visible = false): NavigationMarineLayerConfig<SourceSpecification, LayerSpecification> {
  return {
    id: KHOA_NAVIGATION_WARNINGS_LAYER_ID,
    order: 40,
    visible,
    source: { type: "geojson", data: geoJson },
    layers: [
      { id: "areas", type: "fill", source: "", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#b56f55", "fill-opacity": 0.14 } },
      { id: "boundaries", type: "line", source: "", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#d9a06e", "line-width": 1.6, "line-opacity": 0.9, "line-dasharray": [3, 2] } },
      { id: "lines", type: "line", source: "", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#d9a06e", "line-width": 2, "line-opacity": 0.9, "line-dasharray": [2, 2] } },
      { id: "points", type: "circle", source: "", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": "#9f563f", "circle-stroke-color": "#f1c892", "circle-stroke-width": 1.5, "circle-opacity": 0.9 } },
    ],
  };
}

export function parseKhoaNavigationWarningsResponse(value: unknown): KhoaNavigationWarningsResponse {
  const input = record(value);
  if (!input || input.ok !== true || !Array.isArray(input.warnings) || !record(input.geoJson)) throw new Error("Invalid KHOA navigation-warning response");
  return value as KhoaNavigationWarningsResponse;
}
