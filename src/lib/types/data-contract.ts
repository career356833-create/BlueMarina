import type { Coordinates } from "@/lib/geo/coordinates";

export type ISODateTimeString = string;

export type SeaSummaryStatus = "loading" | "ready" | "partial" | "unavailable" | "stale";

export type DataFreshness = "fresh" | "recent" | "stale" | "unknown";

export type SeaSourceOrganization = "KHOA" | "KMA" | "BLUE_MARINA_MOCK";

export type SeaLocation = {
  name: string;
  region?: string | null;
  city?: string | null;
  observatoryId?: string | null;
  sourceId?: string | null;
  coordinates?: Coordinates | null;
};

export type SeaTideInfo = {
  nextHighTideAt?: ISODateTimeString | null;
  nextLowTideAt?: ISODateTimeString | null;
  tidePhase?: "rising" | "falling" | "slack" | "unknown" | null;
  predictedLevel?: number | null;
};

export type SeaWeatherInfo = {
  windSpeedMps?: number | null;
  windDirection?: string | null;
  waveHeightM?: number | null;
  waterTemperatureC?: number | null;
  pressureHpa?: number | null;
  precipitationMm?: number | null;
  swellHeightM?: number | null;
};

export type SeaWarningInfo = {
  hasWarning: boolean;
  warningType?: string | null;
  warningName?: string | null;
};

export type SeaSummaryMetadata = {
  sourceOrganizations: SeaSourceOrganization[];
  observedAt?: ISODateTimeString | null;
  issuedAt?: ISODateTimeString | null;
  updatedAt?: ISODateTimeString | null;
  freshness: DataFreshness;
  isMock: boolean;
  sourceLabels?: string[];
};

export type SeaSummary = {
  status: SeaSummaryStatus;
  location: SeaLocation;
  tide: SeaTideInfo;
  weather: SeaWeatherInfo;
  warning: SeaWarningInfo;
  metadata: SeaSummaryMetadata;
  partialReasons?: string[];
};

export type SeaInterestProfile = {
  userId: string;
  observatoryId: string;
  location: SeaLocation;
  favorite: boolean;
  updatedAt: ISODateTimeString;
};

export type CatchLog = {
  id: string;
  userId: string;
  captainId?: string | null;
  boatId?: string | null;
  location: Coordinates;
  timestamp: ISODateTimeString;
  species: string[];
  weight?: number | null;
  length?: number | null;
  bait?: string | null;
  tackle?: string | null;
  photo?: string | null;
  notes?: string | null;
};

export type FishingSpotVisit = {
  userId: string;
  spotId: string;
  visitedAt: ISODateTimeString;
  weatherSnapshot: Pick<SeaWeatherInfo, "windSpeedMps" | "windDirection" | "waveHeightM" | "waterTemperatureC" | "pressureHpa" | "precipitationMm" | "swellHeightM">;
  tideSnapshot: Pick<SeaTideInfo, "nextHighTideAt" | "nextLowTideAt" | "tidePhase" | "predictedLevel">;
  catchSummary: {
    species: string[];
    count?: number | null;
    notes?: string | null;
  };
};

export type CaptainInsight = {
  captainId: string;
  boatId?: string | null;
  area: SeaLocation;
  species: string[];
  recommendedCondition: string[];
  notes?: string | null;
  verified: boolean;
  verifiedAt?: ISODateTimeString | null;
};

export type ForecastFeatureVector = {
  tide?: number | null;
  wave?: number | null;
  wind?: number | null;
  temperature?: number | null;
  waterTemperature?: number | null;
  pressure?: number | null;
  precipitation?: number | null;
  swell?: number | null;
  timestamp: ISODateTimeString;
  location: Coordinates & {
    name?: string | null;
    observatoryId?: string | null;
  };
};

export type PredictionResult = {
  score: number;
  targetSpecies: string[];
  recommendedArea: string;
  confidence: number;
  reasons: string[];
  generatedAt: ISODateTimeString;
};
