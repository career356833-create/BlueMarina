import type { Coordinates } from "@/lib/geo/coordinates";

export type GeocodingProviderId = "kakao" | "naver" | "vworld";

export type GeocodingPrecision = "rooftop" | "parcel" | "road" | "region" | "unknown";

export type RuntimeGeocodingErrorCode =
  | "MISSING_ADDRESS"
  | "INVALID_ADDRESS"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_FAILED"
  | "ZERO_RESULTS"
  | "AMBIGUOUS_RESULT"
  | "INVALID_COORDINATE"
  | "PERMANENT_STORAGE_FORBIDDEN";

export type GeocodingStoragePolicy = {
  permanentStorageAllowed: false;
  allowJsonWrite: false;
  allowDatabaseWrite: false;
  allowLocalStorage: false;
  allowIndexedDb: false;
  shortMemoryCachePolicy: "unclear";
  note: string;
};

export type RuntimeGeocodingRequest = {
  address: string;
  centerIds: string[];
  officialUrls?: string[];
  sourceUrls?: string[];
  provider?: GeocodingProviderId;
};

export type ProviderGeocodingInput = {
  address: string;
  requestId?: string;
};

export type ProviderGeocodingCandidate = {
  provider: GeocodingProviderId;
  address: string;
  normalizedAddress?: string;
  coordinates: Coordinates;
  precision?: GeocodingPrecision;
  evidenceUrl?: string;
  rawProviderId?: string;
};

export type NormalizedGeocodingResult = {
  provider: GeocodingProviderId;
  address: string;
  normalizedAddress: string;
  coordinates: Coordinates;
  coordinateSystem: "WGS84";
  precision: GeocodingPrecision;
  evidenceUrl?: string;
  storagePolicy: GeocodingStoragePolicy;
};

export type RuntimeGeocodingError = {
  code: RuntimeGeocodingErrorCode;
  message: string;
  fallbackOfficialUrls: string[];
};

export type RuntimeGeocodingResponse =
  | {
      ok: true;
      centerIds: string[];
      result: NormalizedGeocodingResult;
    }
  | {
      ok: false;
      centerIds: string[];
      error: RuntimeGeocodingError;
    };

export type RuntimeGeocodingBatchGroup = {
  dedupeKey: string;
  address: string;
  centerIds: string[];
  officialUrls: string[];
  sourceUrls: string[];
};

