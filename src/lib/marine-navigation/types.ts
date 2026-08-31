export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type PositionSource = "GPS_NATIVE" | "GPS_DERIVED" | "SIMULATION";
export type HeadingSource = "GPS_NATIVE" | "DEVICE_ORIENTATION" | "DERIVED_MOVEMENT" | "SIMULATION" | "UNAVAILABLE";
export type SpeedSource = "NATIVE_GEOLOCATION" | "DERIVED" | "SIMULATION" | "UNAVAILABLE";
export type NavigationSourceType = "fishing_spot" | "port" | "marina" | "marine_place" | "manual";

export type VesselPosition = GeoPoint & {
  heading?: number;
  headingSource: HeadingSource;
  speedKnots?: number;
  speedSource: SpeedSource;
  accuracyMeters?: number;
  timestamp: number;
  source: PositionSource;
};

export type NavigationDestination = GeoPoint & {
  id: string;
  name: string;
  sourceType: NavigationSourceType;
  sourceId?: string;
};

export type NavigationState = {
  status: "idle" | "navigating" | "arrived";
  destination: NavigationDestination | null;
  distanceMeters: number | null;
  bearingDegrees: number | null;
  relativeBearingDegrees: number | null;
  speedKnots: number | null;
  etaMinutes: number | null;
};

export type SavedWaypoint = NavigationDestination & { createdAt: number };
export type TrackPoint = VesselPosition;
export type TrackSession = {
  id: string;
  name: string;
  status: "recording" | "paused" | "completed";
  startedAt: number;
  endedAt?: number;
  points: TrackPoint[];
};

export type MarineNavigationProps = {
  initialDestination?: NavigationDestination;
  initialQueryError?: string;
  destinationOptions?: NavigationDestination[];
  arrivalRadiusMeters?: number;
  onNavigationStart?: (destination: NavigationDestination) => void;
  onNavigationStop?: () => void;
  onArrive?: (destination: NavigationDestination) => void;
};

export type GeolocationFailure = "permission-denied" | "unavailable" | "timeout" | "unknown";
