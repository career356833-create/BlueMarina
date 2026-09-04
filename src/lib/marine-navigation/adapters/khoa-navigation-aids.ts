import { XMLParser } from "fast-xml-parser";
import type { LayerSpecification } from "maplibre-gl";

export const KHOA_NAVIGATION_AIDS_ENDPOINT = "https://apis.data.go.kr/1192136/Buoy/getBuoyInfo";
export const KHOA_NAVIGATION_AIDS_SOURCE = "국립해양조사원(KHOA)" as const;
export const KHOA_NAVIGATION_AIDS_REVALIDATE_SECONDS = 86_400;
export const KHOA_NAVIGATION_AIDS_LAYER_ID = "khoa-navigation-aids";
export const KHOA_NAVIGATION_AIDS_DATA_URL = "/api/sea-info/navigation-aids";

export const KHOA_NAVIGATION_AID_CATEGORY_LABELS = {
  A01: "고정표지",
  A02: "이동표지",
  A03: "교량등",
  A04: "무신호",
  A05: "레이콘",
  A06: "AIS",
  A07: "로란-C",
  A08: "DGPS",
  A09: "항공무선표지국",
} as const;

export type KhoaNavigationAidCategoryCode = keyof typeof KHOA_NAVIGATION_AID_CATEGORY_LABELS;

export type KhoaNavigationAid = {
  id: string;
  sourceRecordId: string;
  koreanName: string | null;
  englishName: string | null;
  aidCategoryCode: KhoaNavigationAidCategoryCode | null;
  aidTypeLabelRaw: string | null;
  detailedTypeLabelRaw: string | null;
  coastlineTypeRaw: string | null;
  lightCharacteristicRaw: string | null;
  latitude: number;
  longitude: number;
  remarks: string | null;
  source: typeof KHOA_NAVIGATION_AIDS_SOURCE;
};

export type KhoaNavigationAidPage = {
  items: KhoaNavigationAid[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  quality: {
    duplicateIds: string[];
    invalidRecordCount: number;
    invalidCoordinateCount: number;
    missingNameCount: number;
    missingKoreanNameCount: number;
    missingEnglishNameCount: number;
    missingTypeCount: number;
    missingLightCharacteristicCount: number;
  };
};

export type KhoaNavigationAidParseResult =
  | { ok: true; data: KhoaNavigationAidPage }
  | { ok: false; code: "INVALID_XML" | "UPSTREAM_ERROR"; message: string };

type UnknownRecord = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asNonNegativeInteger(value: unknown): number {
  const parsed = Number(asString(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function asCoordinate(value: unknown, minimum: number, maximum: number): number | null {
  const raw = asString(value);
  if (!raw) return null;
  const decimal = Number(raw);
  if (Number.isFinite(decimal) && decimal >= minimum && decimal <= maximum) return decimal;

  const directionalDecimal = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*([NSEW])$/i);
  if (directionalDecimal) {
    const absolute = Math.abs(Number(directionalDecimal[1]));
    const sign = /[SW]/i.test(directionalDecimal[2]) ? -1 : 1;
    const parsed = sign * absolute;
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
  }

  const direction = raw.match(/[NSEW]\s*$/i)?.[0].trim().toUpperCase() ?? null;
  const components = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (components.length !== 3) return null;
  const [degrees, minutes, seconds] = components;
  if (minutes >= 60 || seconds >= 60) return null;
  const sign = direction === "S" || direction === "W" || raw.trimStart().startsWith("-") ? -1 : 1;
  const parsed = sign * (degrees + minutes / 60 + seconds / 3_600);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

export function isKhoaNavigationAidCategoryCode(value: string): value is KhoaNavigationAidCategoryCode {
  return Object.hasOwn(KHOA_NAVIGATION_AID_CATEGORY_LABELS, value);
}

export function parseKhoaNavigationAidsXml(
  xml: string,
  requestedCategoryCode: KhoaNavigationAidCategoryCode | null = null,
): KhoaNavigationAidParseResult {
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return { ok: false, code: "INVALID_XML", message: "KHOA 항로표지 XML을 해석할 수 없습니다." };
  }

  const root = asRecord(parsed);
  const response = asRecord(root?.response);
  const header = asRecord(response?.header);
  const body = asRecord(response?.body);
  const resultCode = asString(header?.resultCode);

  if (!response || !header || !body) {
    return { ok: false, code: "INVALID_XML", message: "KHOA 항로표지 응답 구조가 올바르지 않습니다." };
  }
  if (resultCode !== "00") {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: asString(header.resultMsg) ?? "KHOA 항로표지 API가 오류를 반환했습니다.",
    };
  }

  const itemContainer = asRecord(body.items);
  const rawItems = normalizeItems(itemContainer?.item);
  const items: KhoaNavigationAid[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const duplicateIds = new Set<string>();
  let invalidRecordCount = 0;
  let invalidCoordinateCount = 0;
  let missingNameCount = 0;
  let missingKoreanNameCount = 0;
  let missingEnglishNameCount = 0;
  let missingTypeCount = 0;
  let missingLightCharacteristicCount = 0;

  for (const value of rawItems) {
    const item = asRecord(value);
    const id = asString(item?.blfrNo);
    if (!item || !id) {
      invalidRecordCount += 1;
      continue;
    }

    const latitude = asCoordinate(item.wgs84North, -90, 90);
    const longitude = asCoordinate(item.wgs84East, -180, 180);
    if (latitude === null || longitude === null) {
      invalidCoordinateCount += 1;
      continue;
    }

    const koreanName = asString(item.buoyKr);
    const englishName = asString(item.buoyEn);
    const aidTypeLabelRaw = asString(item.buoyNm);
    const detailedTypeLabelRaw = asString(item.kindCd);
    const lightCharacteristicRaw = asString(item.lgt_property);
    if (!koreanName && !englishName) missingNameCount += 1;
    if (!koreanName) missingKoreanNameCount += 1;
    if (!englishName) missingEnglishNameCount += 1;
    if (!aidTypeLabelRaw) missingTypeCount += 1;
    if (!lightCharacteristicRaw) missingLightCharacteristicCount += 1;

    if (seenIds.has(id)) duplicateIds.add(id);
    seenIds.add(id);
    const signature = [requestedCategoryCode, id, latitude, longitude, koreanName, aidTypeLabelRaw, detailedTypeLabelRaw].join("|");
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    items.push({
      id: `khoa-${requestedCategoryCode?.toLowerCase() ?? "unknown"}-${id}-${stableHash(signature)}`,
      sourceRecordId: id,
      koreanName,
      englishName,
      aidCategoryCode: requestedCategoryCode,
      aidTypeLabelRaw,
      detailedTypeLabelRaw,
      coastlineTypeRaw: asString(item.seaNm),
      lightCharacteristicRaw,
      latitude,
      longitude,
      remarks: asString(item.remark),
      source: KHOA_NAVIGATION_AIDS_SOURCE,
    });
  }

  return {
    ok: true,
    data: {
      items,
      pageNo: asNonNegativeInteger(body.pageNo),
      numOfRows: asNonNegativeInteger(body.numOfRows),
      totalCount: asNonNegativeInteger(body.totalCount),
      quality: {
        duplicateIds: [...duplicateIds].sort(),
        invalidRecordCount,
        invalidCoordinateCount,
        missingNameCount,
        missingKoreanNameCount,
        missingEnglishNameCount,
        missingTypeCount,
        missingLightCharacteristicCount,
      },
    },
  };
}

export function toKhoaNavigationAidsGeoJson(page: KhoaNavigationAidPage) {
  return {
    type: "FeatureCollection" as const,
    features: page.items.map((item) => ({
      type: "Feature" as const,
      id: item.id,
      geometry: {
        type: "Point" as const,
        coordinates: [item.longitude, item.latitude] as [number, number],
      },
      properties: { ...item },
    })),
  };
}

type KhoaNavigationAidGeoJson = ReturnType<typeof toKhoaNavigationAidsGeoJson>;

export function parseKhoaNavigationAidFeatureProperties(value: unknown): KhoaNavigationAid | null {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || !item.id.startsWith("khoa-") || typeof item.sourceRecordId !== "string") return null;
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const category = asString(item.aidCategoryCode);
  if (category !== null && !isKhoaNavigationAidCategoryCode(category)) return null;
  return {
    id: item.id,
    sourceRecordId: item.sourceRecordId,
    koreanName: asString(item.koreanName),
    englishName: asString(item.englishName),
    aidCategoryCode: category,
    aidTypeLabelRaw: asString(item.aidTypeLabelRaw),
    detailedTypeLabelRaw: asString(item.detailedTypeLabelRaw),
    coastlineTypeRaw: asString(item.coastlineTypeRaw),
    lightCharacteristicRaw: asString(item.lightCharacteristicRaw),
    latitude,
    longitude,
    remarks: asString(item.remarks),
    source: KHOA_NAVIGATION_AIDS_SOURCE,
  };
}

export function parseKhoaNavigationAidsGeoJson(value: unknown): KhoaNavigationAidGeoJson {
  const collection = asRecord(value);
  if (!collection || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("Invalid KHOA navigation-aids FeatureCollection");
  }
  const features = collection.features.map((candidate) => {
    const feature = asRecord(candidate);
    const geometry = asRecord(feature?.geometry);
    const properties = parseKhoaNavigationAidFeatureProperties(feature?.properties);
    if (!feature || feature.type !== "Feature" || geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || !properties) {
      throw new Error("Invalid KHOA navigation-aid feature");
    }
    const longitude = Number(geometry.coordinates[0]);
    const latitude = Number(geometry.coordinates[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error("Invalid KHOA navigation-aid coordinates");
    return {
      type: "Feature" as const,
      id: properties.id,
      geometry: { type: "Point" as const, coordinates: [longitude, latitude] as [number, number] },
      properties,
    };
  });
  return { type: "FeatureCollection", features };
}

export function createKhoaNavigationAidsLayerConfig(data: KhoaNavigationAidGeoJson, visible = false) {
  const layers: LayerSpecification[] = [
    {
      id: "clusters",
      type: "circle",
      source: "",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#173f49",
        "circle-radius": ["step", ["get", "point_count"], 14, 50, 18, 250, 23],
        "circle-stroke-color": "#d2b178",
        "circle-stroke-width": 1,
        "circle-opacity": 0.88,
      },
    },
    {
      id: "cluster-count",
      type: "symbol",
      source: "",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 10 },
      paint: { "text-color": "#f2eee3" },
    },
    {
      id: "markers",
      type: "circle",
      source: "",
      minzoom: 7,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 5,
        "circle-color": ["match", ["get", "aidCategoryCode"], "A01", "#d2b178", "A02", "#6f9e9d", "A03", "#c4cbc7", "#788d8d"],
        "circle-stroke-color": "#06131a",
        "circle-stroke-width": 1.25,
        "circle-opacity": 0.92,
      },
    },
  ];
  return {
    id: KHOA_NAVIGATION_AIDS_LAYER_ID,
    order: 30,
    visible,
    source: {
      type: "geojson" as const,
      data,
      attribution: KHOA_NAVIGATION_AIDS_SOURCE,
      cluster: true,
      clusterMaxZoom: 10,
      clusterRadius: 46,
    },
    layers,
  };
}
