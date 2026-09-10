import "server-only";

import { compareFishingCondition, type ComparatorDepthContext, type ComparatorEnvironment, type FishingConditionComparisonSource } from "./comparator";
import { getNifsFisheryEnvironment, NifsFisheryEnvironmentSourceError } from "./nifs-fishery-environment-server";
import { getNifsRealtimeFishingEnvironment, NifsRealtimeFishingSourceError } from "./nifs-realtime-fishing-server";
import { findSpeciesEnvironmentProfile } from "./species-environment";

export type FishingConditionComparisonRequest = {
  speciesId: string;
  environment: {
    sourceId: FishingConditionComparisonSource;
    stationId?: string;
    siteId?: string;
    depthContext: ComparatorDepthContext;
  };
};

export class FishingConditionComparatorError extends Error {
  constructor(public readonly code: "INVALID_REQUEST" | "PROFILE_NOT_FOUND" | "ENVIRONMENT_LOCATION_NOT_FOUND" | "SOURCE_DISABLED" | "API_KEY_MISSING" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR" | "UPSTREAM_RESPONSE_TOO_LARGE" | "UPSTREAM_CONTRACT_ERROR") {
    super(code);
  }
}

function environmentFromRisaStation(
  station: Awaited<ReturnType<typeof getNifsRealtimeFishingEnvironment>>["stations"][number],
  depthContext: ComparatorDepthContext,
): ComparatorEnvironment {
  const key = depthContext === "SURFACE" ? "surface" : depthContext === "MIDDLE" ? "middle" : "bottom";
  const valueKey = depthContext === "SURFACE" ? "surfaceC" : depthContext === "MIDDLE" ? "middleC" : "bottomC";
  return {
    sourceId: "nifs-risa",
    provider: "NIFS",
    qualityClass: "OBSERVED",
    stationOrSiteId: station.stationId,
    observedAt: station.observedAt,
    freshness: station.freshness,
    depthContext,
    exactDepthM: station.depthMeters[key],
    stationWaterDepthM: station.depthMeters.bottom,
    temperature: { value: station.waterTemperature[valueKey], unit: station.waterTemperature.unit },
    salinity: { value: null, unit: null },
    dissolvedOxygen: { value: null, unit: null },
    chlorophyllA: { value: null, unit: null },
  };
}

function environmentFromFemoSample(
  sample: Awaited<ReturnType<typeof getNifsFisheryEnvironment>>["samples"][number],
  depthContext: "SURFACE" | "BOTTOM",
): ComparatorEnvironment {
  const key = depthContext === "SURFACE" ? "surface" : "bottom";
  return {
    sourceId: "nifs-femo-sea",
    provider: "NIFS",
    qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT",
    stationOrSiteId: sample.siteId,
    observedAt: sample.sampledAt,
    freshness: sample.freshness,
    depthContext,
    exactDepthM: null,
    stationWaterDepthM: sample.depthContext.waterDepthM,
    temperature: { value: sample.measurements.waterTemperature[key], unit: sample.measurements.waterTemperature.unit },
    salinity: { value: sample.measurements.salinity[key], unit: sample.measurements.salinity.unit },
    dissolvedOxygen: { value: sample.measurements.dissolvedOxygen[key], unit: sample.measurements.dissolvedOxygen.unit },
    chlorophyllA: { value: sample.measurements.chlorophyllA[key], unit: sample.measurements.chlorophyllA.unit },
  };
}

function mapSourceError(error: unknown): never {
  if (error instanceof NifsRealtimeFishingSourceError || error instanceof NifsFisheryEnvironmentSourceError) {
    throw new FishingConditionComparatorError(error.code);
  }
  throw new FishingConditionComparatorError("UPSTREAM_ERROR");
}

export async function runFishingConditionComparison(request: FishingConditionComparisonRequest) {
  const profile = findSpeciesEnvironmentProfile({ speciesId: request.speciesId });
  if (!profile) throw new FishingConditionComparatorError("PROFILE_NOT_FOUND");

  let environment: ComparatorEnvironment;
  try {
    if (request.environment.sourceId === "nifs-risa") {
      if (!request.environment.stationId || request.environment.siteId) throw new FishingConditionComparatorError("INVALID_REQUEST");
      const response = await getNifsRealtimeFishingEnvironment();
      const station = response.stations.find((item) => item.stationId === request.environment.stationId);
      if (!station) throw new FishingConditionComparatorError("ENVIRONMENT_LOCATION_NOT_FOUND");
      environment = environmentFromRisaStation(station, request.environment.depthContext);
    } else {
      if (!request.environment.siteId || request.environment.stationId || request.environment.depthContext === "MIDDLE") throw new FishingConditionComparatorError("INVALID_REQUEST");
      const response = await getNifsFisheryEnvironment();
      const sample = response.samples
        .filter((item) => item.siteId === request.environment.siteId)
        .sort((left, right) => right.sampledAt.localeCompare(left.sampledAt))[0];
      if (!sample) throw new FishingConditionComparatorError("ENVIRONMENT_LOCATION_NOT_FOUND");
      environment = environmentFromFemoSample(sample, request.environment.depthContext);
    }
  } catch (error) {
    if (error instanceof FishingConditionComparatorError) throw error;
    mapSourceError(error);
  }

  return compareFishingCondition(profile, environment);
}
