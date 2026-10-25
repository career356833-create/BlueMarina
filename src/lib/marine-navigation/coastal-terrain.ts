// Display-only land relief. Never a depth or navigability model.
export const COASTAL_DEM = {
  id: "navigation-land-dem-v1",
  tiles: "/api/navigation/terrain/v1/{z}/{x}/{y}",
  bounds: [124, 32, 132, 39.5] as [number, number, number, number],
  minzoom: 7,
  maxzoom: 12,
  exaggeration: 1,
  attribution: 'Land DEM: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen / AWS Open Data</a> · USGS SRTM/GMTED, NOAA ETOPO1 · sea clamped to 0m',
} as const;

export type TerrainState = "FLAT" | "PITCH_ONLY" | "LOADING" | "ACTIVE" | "UNSUPPORTED" | "UNAVAILABLE";
export const terrainLabels: Record<TerrainState, string> = {
  FLAT: "2D 평면", PITCH_ONLY: "원근만 · 지형 OFF", LOADING: "육상 지형 불러오는 중",
  ACTIVE: "실제 육상 지형 · 1×", UNSUPPORTED: "지원 범위 밖 · 원근만", UNAVAILABLE: "지형 수신 실패 · 원근만",
};
export function terrainCoverage(longitude: number, latitude: number, zoom: number) {
  return Number.isFinite(longitude) && Number.isFinite(latitude) && zoom >= COASTAL_DEM.minzoom
    && longitude >= 124 && longitude <= 132 && latitude >= 32 && latitude <= 39.5;
}
export function terrainTileAllowed(z: number, x: number, y: number) {
  if (![z, x, y].every(Number.isInteger) || z < 7 || z > 12 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return false;
  const n = 2 ** z;
  const latitude = (row: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * row / n))) * 180 / Math.PI;
  return (x + 1) / n * 360 - 180 >= 124 && x / n * 360 - 180 <= 132 && latitude(y) >= 32 && latitude(y + 1) <= 39.5;
}

/** Terrarium is R*256 + G + B/256 - 32768 metres. Preserve land; remove bathymetry. */
export function clampTerrariumToSeaLevel(rgb: Uint8Array, channels: number) {
  if (channels !== 3 && channels !== 4) throw new Error("Invalid DEM channels");
  for (let i = 0; i < rgb.length; i += channels) {
    if (rgb[i] < 128) { rgb[i] = 128; rgb[i + 1] = 0; rgb[i + 2] = 0; }
  }
  return rgb;
}
