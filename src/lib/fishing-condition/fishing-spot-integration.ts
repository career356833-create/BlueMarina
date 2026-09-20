import { fishingSpots, type FishingSpot } from "@/data/fishing-spots";
import { getFishingConditionProfile, getFishingConditionProfileSpecies } from "./profile-registry";
import { buildFishingJourneyConditionsHref, buildFishingJourneySeaHref } from "@/lib/fishing-spots/journey";

const LEGACY_FISHING_CONDITION_SPECIES = [
  { id: "BM-SPECIES-000755", name: "참돔" },
  { id: "BM-SPECIES-000751", name: "감성돔" },
  { id: "BM-SPECIES-000188", name: "농어" },
  { id: "BM-SPECIES-000012", name: "조피볼락" },
  { id: "BM-SPECIES-000465", name: "넙치" },
  { id: "BM-SPECIES-000444", name: "갈치" },
  { id: "BM-SPECIES-000417", name: "고등어" },
  { id: "BM-SPECIES-000501", name: "방어" },
  { id: "BM-SPECIES-003107", name: "주꾸미" },
  { id: "BM-SPECIES-003111", name: "문어" },
] as const;

// The activation selector is driven by the reviewed 38-species registry.
// Legacy-only IDs remain URL/API-compatible below so existing links keep working.
export const FISHING_CONDITION_SPECIES = getFishingConditionProfileSpecies();

export type FishingConditionSpecies = (typeof FISHING_CONDITION_SPECIES)[number];

const conditionSpeciesById = new Map<string, FishingConditionSpecies>([...LEGACY_FISHING_CONDITION_SPECIES, ...FISHING_CONDITION_SPECIES].map((species) => [species.id, species]));
const registrySpeciesByName = new Map<string, FishingConditionSpecies>(FISHING_CONDITION_SPECIES.map((species) => [species.name, species]));

// Explicit source-name aliases only. Aggregate labels and approximate matches stay unmapped.
const approvedSourceAliases: Record<string, FishingConditionSpecies["name"]> = {
  광어: "넙치",
  우럭: "조피볼락",
};

export function splitFishingSpotTargets(value: string) {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function getFishingConditionSpecies(speciesId: string | null | undefined) {
  if (!speciesId) return null;
  return conditionSpeciesById.get(speciesId) ?? (getFishingConditionProfile(speciesId)
    ? { id: speciesId, name: getFishingConditionProfile(speciesId)!.koreanName }
    : null);
}

export function mapFishingSpotTarget(targetName: string): FishingConditionSpecies | null {
  const direct = registrySpeciesByName.get(targetName);
  if (direct) return direct;
  const canonicalName = approvedSourceAliases[targetName];
  return canonicalName ? registrySpeciesByName.get(canonicalName) ?? null : null;
}

export function getFishingSpotSpeciesProjection(spot: Pick<FishingSpot, "targetFish">) {
  const targets = splitFishingSpotTargets(spot.targetFish);
  const mapped = new Map<string, FishingConditionSpecies>();
  const unmapped: string[] = [];

  for (const target of targets) {
    const species = mapFishingSpotTarget(target);
    if (species) mapped.set(species.id, species);
    else unmapped.push(target);
  }

  return { canonical: [...mapped.values()], unmapped, raw: targets };
}

export function findFishingSpot(spotId: string | null | undefined) {
  return spotId ? fishingSpots.find((spot) => spot.id === spotId) ?? null : null;
}

export function buildFishingConditionHref(spot: Pick<FishingSpot, "id">, speciesId?: string) {
  return buildFishingJourneyConditionsHref({ spotId: spot.id, speciesId, source: "spot-detail", returnTo: `/fishing-spots/${encodeURIComponent(spot.id)}` });
}

export function buildFishingSpotMapHref(spot: Pick<FishingSpot, "id">, speciesId?: string) {
  return `${buildFishingJourneySeaHref({ spotId: spot.id, speciesId, source: "fishing-condition", returnTo: `/fishing-spots/${encodeURIComponent(spot.id)}` })}#live-marine-map`;
}
