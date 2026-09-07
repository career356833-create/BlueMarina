export const KHOA_ROMS_MAX_BBOX_SPAN = 1;
export const KHOA_ROMS_PRODUCT_BBOX_SPAN = 0.1;
export const KHOA_ROMS_PAGE_SIZE = 300;
export const KHOA_ROMS_MAX_PAGES = 8;
export const KHOA_ROMS_MAX_ROWS = KHOA_ROMS_PAGE_SIZE * KHOA_ROMS_MAX_PAGES;
export const KHOA_ROMS_DIRECTION_CONVENTION = "UNKNOWN" as const;

export type KhoaRomsPoint = {
  id: string;
  latitude: number;
  longitude: number;
  validAtRaw: string;
  currentSpeedMps: number;
  currentDirectionDegreesRaw: number;
  modelWaterTemperatureCelsius: number;
  source: "KHOA";
  dataKind: "ROMS_MODEL_FORECAST";
  directionConvention: "UNKNOWN";
  fetchedAt: string;
};

export type KhoaRomsBbox = { ymin: number; ymax: number; xmin: number; xmax: number };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseKhoaRomsBbox(searchParams: URLSearchParams): KhoaRomsBbox | null {
  const bbox = {
    ymin: finiteNumber(searchParams.get("ymin")),
    ymax: finiteNumber(searchParams.get("ymax")),
    xmin: finiteNumber(searchParams.get("xmin")),
    xmax: finiteNumber(searchParams.get("xmax")),
  };
  if (bbox.ymin === null || bbox.ymax === null || bbox.xmin === null || bbox.xmax === null) return null;
  if (bbox.ymin < -90 || bbox.ymax > 90 || bbox.xmin < -180 || bbox.xmax > 180) return null;
  if (bbox.ymax <= bbox.ymin || bbox.xmax <= bbox.xmin) return null;
  if (bbox.ymax - bbox.ymin > KHOA_ROMS_MAX_BBOX_SPAN || bbox.xmax - bbox.xmin > KHOA_ROMS_MAX_BBOX_SPAN) return null;
  return bbox as KhoaRomsBbox;
}

export function buildKhoaRomsCacheKey(bbox: KhoaRomsBbox, validAt?: string | null) {
  return [bbox.ymin, bbox.ymax, bbox.xmin, bbox.xmax].map((value) => value.toFixed(5)).join(":") + `:${validAt ?? "first"}`;
}

export function parseKhoaRomsItem(value: unknown, fetchedAt: string): Omit<KhoaRomsPoint, "id"> | null {
  const item = record(value);
  const latitude = finiteNumber(item?.lat);
  const longitude = finiteNumber(item?.lot);
  const currentSpeedMps = finiteNumber(item?.crsp);
  const currentDirectionDegreesRaw = finiteNumber(item?.crdir);
  const modelWaterTemperatureCelsius = finiteNumber(item?.wtem);
  const validAtRaw = typeof item?.predcDt === "string" ? item.predcDt.trim() : "";
  if (latitude === null || longitude === null || currentSpeedMps === null || currentDirectionDegreesRaw === null || modelWaterTemperatureCelsius === null || !validAtRaw) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || currentSpeedMps < 0 || currentDirectionDegreesRaw < 0 || currentDirectionDegreesRaw > 360) return null;
  return { latitude, longitude, validAtRaw, currentSpeedMps, currentDirectionDegreesRaw, modelWaterTemperatureCelsius, source: "KHOA", dataKind: "ROMS_MODEL_FORECAST", directionConvention: KHOA_ROMS_DIRECTION_CONVENTION, fetchedAt };
}

export function extractKhoaRomsEnvelope(value: unknown) {
  const root = record(value);
  const response = record(root?.response);
  const header = record(response?.header) ?? record(root?.header);
  const body = record(response?.body) ?? record(root?.body);
  const itemsNode = record(body?.items);
  const rawItems = itemsNode?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return {
    resultCode: String(header?.resultCode ?? ""),
    resultMsg: String(header?.resultMsg ?? ""),
    totalCount: finiteNumber(body?.totalCount) ?? 0,
    items,
  };
}

export function normalizeKhoaRomsRows(rows: unknown[], fetchedAt: string, requestedValidAt?: string | null) {
  const parsed = rows.map((row) => parseKhoaRomsItem(row, fetchedAt)).filter((row): row is NonNullable<ReturnType<typeof parseKhoaRomsItem>> => row !== null);
  const validTimes = [...new Set(parsed.map((row) => row.validAtRaw))].sort();
  const selectedValidAt = requestedValidAt && validTimes.includes(requestedValidAt) ? requestedValidAt : validTimes[0] ?? null;
  const seen = new Set<string>();
  const points: KhoaRomsPoint[] = [];
  for (const row of parsed) {
    if (row.validAtRaw !== selectedValidAt) continue;
    const coordinateKey = `${row.latitude.toFixed(6)}:${row.longitude.toFixed(6)}`;
    if (seen.has(coordinateKey)) continue;
    seen.add(coordinateKey);
    points.push({ ...row, id: `roms:${coordinateKey}:${row.validAtRaw}` });
  }
  return { points, validTimes, selectedValidAt };
}

export function buildViewportSampleBbox(longitude: number, latitude: number): KhoaRomsBbox {
  const half = KHOA_ROMS_PRODUCT_BBOX_SPAN / 2;
  const centerLongitude = Math.round(longitude * 10) / 10;
  const centerLatitude = Math.round(latitude * 10) / 10;
  return {
    ymin: Number((centerLatitude - half).toFixed(5)),
    ymax: Number((centerLatitude + half).toFixed(5)),
    xmin: Number((centerLongitude - half).toFixed(5)),
    xmax: Number((centerLongitude + half).toFixed(5)),
  };
}
