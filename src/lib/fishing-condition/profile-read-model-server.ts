import "server-only";
import { getFishingConditionProfile } from "./profile-registry";
import { buildStaticFishingConditionReadModel } from "./read-model";
import { getSpeciesSeasonality, SeasonalityRuntimeError } from "./seasonality-runtime";

export function parseProfileReadModelRequest(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (body.environment !== undefined || typeof body.speciesId !== "string") return null;
  const contexts = body.contexts as { month?: unknown } | undefined;
  const month = contexts?.month;
  if (!Number.isInteger(month) || Number(month) < 1 || Number(month) > 12) return null;
  const speciesId = body.speciesId.trim();
  if (!getFishingConditionProfile(speciesId)) return null;
  return { speciesId, month: Number(month) };
}

export function runStaticProfileReadModel(speciesId: string, month: number | null, failure?: { sourceId: string; reason: string }) {
  const profile = getFishingConditionProfile(speciesId);
  if (!profile) return null;
  let seasonality;
  // The protected cross-system UUID has a profile but no seasonality ID mapping.
  try { if (month !== null && /^BM-SPECIES-\d{6}$/.test(speciesId)) seasonality = getSpeciesSeasonality({ speciesId, month }); }
  catch (error) {
    if (!(error instanceof SeasonalityRuntimeError) || error.code !== "SPECIES_NOT_FOUND") throw error;
  }
  const sourceStatus = [
    { sourceId: "nifs-risa", enabled: process.env.NIFS_REALTIME_FISHING_ENABLED === "true", key: Boolean(process.env.NIFS_RISA_API_KEY) },
    { sourceId: "nifs-femo-sea", enabled: process.env.NIFS_FISHERY_ENVIRONMENT_ENABLED === "true", key: Boolean(process.env.NIFS_FEMO_API_KEY) },
  ].map(({ sourceId, enabled, key }) => ({
    sourceId,
    status: failure?.sourceId === sourceId || !enabled || !key ? "UNAVAILABLE" : "NOT_REQUESTED",
    reason: failure?.sourceId === sourceId ? failure.reason : !enabled ? "SOURCE_DISABLED" : !key ? "API_KEY_MISSING" : "OBSERVATIONS_NOT_REQUESTED",
  }));
  return buildStaticFishingConditionReadModel(profile, month, seasonality, sourceStatus);
}
