import type { MarineObservatory } from "@/data/marine-observatories";

export type Coordinates = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const latDistance = toRadians(to.lat - from.lat);
  const lngDistance = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const haversine =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function findNearestObservatory(currentLocation: Coordinates, observatories: MarineObservatory[]) {
  if (observatories.length === 0) {
    return null;
  }

  return observatories
    .map((observatory) => ({
      observatory,
      distanceKm: calculateDistanceKm(currentLocation, {
        lat: observatory.lat,
        lng: observatory.lng
      })
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}
