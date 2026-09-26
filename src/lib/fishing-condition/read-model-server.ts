import "server-only";

import { ConditionEvidenceBundleError, type ConditionEvidenceBundleRequest } from "./evidence-bundle-server";
import { getFishingConditionEnvironment } from "./comparator-server";
import { getFactualConditionProfile } from "./factual-profile";
import { runStaticProfileReadModel } from "./profile-read-model-server";
import { buildProfileOnlyFishingConditionReadModel } from "./read-model";

export type FishingConditionReadModelRequest = ConditionEvidenceBundleRequest;

export { ConditionEvidenceBundleError as FishingConditionReadModelError };

export async function runFishingConditionReadModel(request: FishingConditionReadModelRequest) {
  const profile = getFactualConditionProfile(request.speciesId);
  if (!profile) throw new ConditionEvidenceBundleError("PROFILE_NOT_FOUND");
  const environment = await getFishingConditionEnvironment(request);
  const factual = buildProfileOnlyFishingConditionReadModel(profile, environment, request.contexts);
  const staticModel = runStaticProfileReadModel(request.speciesId, request.contexts.month);
  if (!staticModel) throw new ConditionEvidenceBundleError("PROFILE_NOT_FOUND");
  const status = environment.freshness === "fresh" ? "AVAILABLE" : environment.observedAt ? "STALE" : "ERROR";
  return {
    ...factual,
    availability: status === "AVAILABLE" ? "AVAILABLE" as const : "PARTIAL" as const,
    observationContext: {
      sourceId: environment.sourceId,
      stationOrSiteId: environment.stationOrSiteId,
      stationName: environment.stationName,
      depthContext: environment.depthContext,
      sourceTimestamp: environment.observedAt,
      sourceTimezone: environment.sourceTimezone,
      fetchedAt: environment.fetchedAt,
      lastSuccessfulFetchAt: environment.lastSuccessfulFetchAt,
      cacheStatus: environment.cacheStatus,
      freshness: environment.freshness,
    },
    seasonalityContext: staticModel.seasonality,
    seasonality: staticModel.seasonality,
    sourceStatus: staticModel.sourceStatus.map(source => source.sourceId === environment.sourceId
      ? { ...source, status, reason: status === "AVAILABLE" ? "OBSERVATION_AVAILABLE" : status === "STALE" ? "SOURCE_SAMPLE_STALE" : "SOURCE_SAMPLE_UNAVAILABLE" }
      : source),
    sources: [...factual.sources, ...staticModel.sources.filter(source => source.domain === "seasonality")],
    limitations: [...new Set([...factual.limitations, ...(status !== "AVAILABLE" ? ["OBSERVATION_NOT_CURRENT"] : []), "TIMEZONE_NOT_DOCUMENTED"])],
  };
}
