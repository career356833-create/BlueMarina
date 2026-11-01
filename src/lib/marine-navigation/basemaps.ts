export const BASEMAP_OPTIONS = [
  { id: "standard", label: "기본", description: "OpenStreetMap · 기존 지도", mapId: null },
  { id: "ocean", label: "해양", description: "해저 지형·등심선 참고", mapId: "ocean-v4" },
  { id: "satellite", label: "위성", description: "위성영상 + 지명", mapId: "hybrid-v4" },
  { id: "night", label: "야간", description: "어두운 해양 지도", mapId: "ocean-v4-dark" },
] as const;
export type BasemapId = typeof BASEMAP_OPTIONS[number]["id"];
export type BasemapState = { selected: BasemapId; displayed: BasemapId; status: "LOADING" | "READY" | "UNAVAILABLE"; reason?: "KEY_REQUIRED" | "SOURCE_ERROR" | "TIMEOUT" };
export const INITIAL_BASEMAP_STATE: BasemapState = { selected: "standard", displayed: "standard", status: "LOADING" };
export const BASEMAP_FALLBACK_ID = "temporary-osm-raster";
export function isBasemapId(value: unknown): value is BasemapId { return BASEMAP_OPTIONS.some(option => option.id === value); }
export function hasMapTilerKey(key: string | undefined): boolean { return Boolean(key?.trim()); }
