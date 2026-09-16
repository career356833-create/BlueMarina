import { fishingSpots, type FishingSpot } from "@/data/fishing-spots";

export const FISHING_CONDITION_SPECIES = [
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

export type FishingConditionSpecies = (typeof FISHING_CONDITION_SPECIES)[number];

const conditionSpeciesByName = new Map<string, FishingConditionSpecies>(FISHING_CONDITION_SPECIES.map((species) => [species.name, species]));
const conditionSpeciesById = new Map<string, FishingConditionSpecies>(FISHING_CONDITION_SPECIES.map((species) => [species.id, species]));

// Explicit source-name aliases only. Aggregate labels and approximate matches stay unmapped.
const approvedSourceAliases: Record<string, FishingConditionSpecies["name"]> = {
  광어: "넙치",
  우럭: "조피볼락",
};

export function splitFishingSpotTargets(value: string) {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function getFishingConditionSpecies(speciesId: string | null | undefined) {
  return speciesId ? conditionSpeciesById.get(speciesId) ?? null : null;
}

export function mapFishingSpotTarget(targetName: string): FishingConditionSpecies | null {
  const direct = conditionSpeciesByName.get(targetName);
  if (direct) return direct;
  const canonicalName = approvedSourceAliases[targetName];
  return canonicalName ? conditionSpeciesByName.get(canonicalName) ?? null : null;
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
  const params = new URLSearchParams({ spotId: spot.id });
  if (getFishingConditionSpecies(speciesId)) params.set("speciesId", speciesId as string);
  return `/fishing-spots/conditions?${params.toString()}`;
}

export function buildFishingSpotMapHref(spot: Pick<FishingSpot, "id">) {
  return `/sea?spotId=${encodeURIComponent(spot.id)}#live-marine-map`;
}
