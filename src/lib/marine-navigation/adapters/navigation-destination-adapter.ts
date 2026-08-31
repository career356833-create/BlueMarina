import type { FishingSpot } from "@/data/fishing-spots";
import type { MarinePlace } from "@/lib/types/data-contract";
import type { NavigationDestination, NavigationSourceType } from "../types";

export type NavigationQuery = Record<string, string | string[] | undefined>;
export type DestinationParseResult = { destination: NavigationDestination | null; error: string | null };

const sourceTypes: NavigationSourceType[] = ["fishing_spot", "port", "marina", "marine_place", "manual"];
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const validLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
const validLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

export function parseNavigationDestinationQuery(query: NavigationQuery): DestinationParseResult {
  const rawLat = first(query.lat);
  const rawLng = first(query.lng);
  const rawName = first(query.name);
  const rawType = first(query.type);
  const rawSourceId = first(query.sourceId);
  if (rawLat == null && rawLng == null && rawName == null && rawType == null && rawSourceId == null) {
    return { destination: null, error: null };
  }
  if (rawLat == null || rawLng == null) return { destination: null, error: "목적지 좌표가 완전하지 않습니다." };
  const latitude = Number(rawLat);
  const longitude = Number(rawLng);
  if (!validLatitude(latitude) || !validLongitude(longitude)) return { destination: null, error: "목적지 좌표 범위를 확인해 주세요." };
  const name = rawName?.trim();
  if (!name || name.length > 80) return { destination: null, error: "목적지 이름이 없거나 너무 깁니다." };
  if (!rawType || !sourceTypes.includes(rawType as NavigationSourceType)) return { destination: null, error: "지원하지 않는 목적지 유형입니다." };
  if (rawSourceId && rawSourceId.length > 120) return { destination: null, error: "목적지 식별자가 너무 깁니다." };
  const sourceType = rawType as NavigationSourceType;
  const sourceId = rawSourceId?.trim() || undefined;
  return {
    destination: {
      id: sourceId ? `${sourceType}:${sourceId}` : `manual:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
      name,
      latitude,
      longitude,
      sourceType,
      ...(sourceId ? { sourceId } : {}),
    },
    error: null,
  };
}

export function buildNavigationHref(destination: NavigationDestination): string {
  const params = new URLSearchParams({
    lat: String(destination.latitude),
    lng: String(destination.longitude),
    name: destination.name,
    type: destination.sourceType,
  });
  if (destination.sourceId) params.set("sourceId", destination.sourceId);
  return `/sea/navigation?${params.toString()}`;
}

export function navigationDestinationFromFishingSpot(spot: Pick<FishingSpot, "id" | "name" | "lat" | "lng">): NavigationDestination {
  const latitude = Number(spot.lat);
  const longitude = Number(spot.lng);
  if (!validLatitude(latitude) || !validLongitude(longitude)) throw new Error("Invalid fishing spot coordinates");
  return { id: `fishing_spot:${spot.id}`, name: spot.name, latitude, longitude, sourceType: "fishing_spot", sourceId: spot.id };
}

export function navigationDestinationFromMarinePlace(
  place: Pick<MarinePlace, "id" | "name" | "lat" | "lng">,
  sourceType: Extract<NavigationSourceType, "port" | "marina" | "marine_place"> = "marine_place",
): NavigationDestination {
  if (!validLatitude(place.lat) || !validLongitude(place.lng)) throw new Error("Invalid marine place coordinates");
  return { id: `${sourceType}:${place.id}`, name: place.name, latitude: place.lat, longitude: place.lng, sourceType, sourceId: place.id };
}
