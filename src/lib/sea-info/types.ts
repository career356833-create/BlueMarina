export type SeaSummaryStatus = "loading" | "ready" | "partial" | "unavailable" | "stale";

export type DataFreshness = "fresh" | "recent" | "stale" | "unknown";

export type SourceOrganization = "KHOA" | "KMA" | "BLUE_MARINA_MOCK";

export type TidePhase = "rising" | "falling" | "slack" | "unknown";

export type WindDirection =
  | "N"
  | "NNE"
  | "NE"
  | "ENE"
  | "E"
  | "ESE"
  | "SE"
  | "SSE"
  | "S"
  | "SSW"
  | "SW"
  | "WSW"
  | "W"
  | "WNW"
  | "NW"
  | "NNW"
  | "variable"
  | "unknown";

export type SeaSummaryPartialReason =
  | "TIDE_MISSING"
  | "WEATHER_MISSING"
  | "WARNING_MISSING"
  | "OBSERVATION_DELAYED"
  | "UPSTREAM_UNAVAILABLE";

export type TideSummary = {
  nextHighTideAt?: string | null;
  nextLowTideAt?: string | null;
  tidePhase?: TidePhase | null;
};

export type TideEventType = "high" | "low" | "unknown";

export type TideForecastResponseStatus = "ready" | "partial" | "unavailable";

export type TideForecastEvent = {
  occurredAt: string;
  type: TideEventType;
  predictedLevel?: number;
};

export type TideForecastResponse = {
  status: TideForecastResponseStatus;
  station: {
    obsCode: string;
    name?: string;
  };
  date: string;
  events: TideForecastEvent[];
  nextHighTideAt?: string;
  nextLowTideAt?: string;
  tideSummary: TideSummary;
  metadata: {
    sourceOrganization: "국립해양조사원";
    sourceName: "조석예보(고·저조)";
    updatedAt: string;
    isMock: false;
  };
};

export type WeatherSummary = {
  windSpeedMps?: number | null;
  windDirection?: WindDirection | null;
  significantWaveHeightM?: number | null;
  waterTemperatureC?: number | null;
};

export type WarningSummary = {
  hasMarineWarning: boolean;
  warningType?: string | null;
};

export type SeaSummaryMetadata = {
  sourceOrganizations: SourceOrganization[];
  observedAt?: string | null;
  issuedAt?: string | null;
  updatedAt?: string | null;
  freshness: DataFreshness;
  isMock: boolean;
};

export type SeaSummary = {
  status: SeaSummaryStatus;
  locationName: string;
  tide: TideSummary;
  weather: WeatherSummary;
  warning: WarningSummary;
  metadata: SeaSummaryMetadata;
  partialReasons?: SeaSummaryPartialReason[];
};
