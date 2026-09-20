import { getFishingConditionProfile } from "@/lib/fishing-condition/profile-registry";

export type FishingJourneyState = { spotId?: string; speciesId?: string; source?: string; returnTo?: string };
const INTERNAL_RETURN_PATHS = ["/fishing-spots", "/fishing-spots/conditions", "/sea"];

export function safeJourneyReturnTo(value: string | null | undefined, fallback = "/fishing-spots") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return INTERNAL_RETURN_PATHS.some((path) => value === path || value.startsWith(`${path}/`) || value.startsWith(`${path}?`)) ? value : fallback;
}

function append(path: string, journey: FishingJourneyState) {
  const params = new URLSearchParams();
  if (journey.spotId) params.set("spotId", journey.spotId);
  if (journey.speciesId && getFishingConditionProfile(journey.speciesId)) params.set("speciesId", journey.speciesId);
  if (journey.source) params.set("source", journey.source);
  if (journey.returnTo) params.set("returnTo", safeJourneyReturnTo(journey.returnTo));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function buildFishingJourneyConditionsHref(journey: FishingJourneyState) { return append("/fishing-spots/conditions", journey); }
export function buildFishingJourneySeaHref(journey: FishingJourneyState) { return append("/sea", journey); }
