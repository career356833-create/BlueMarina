import { getFishingConditionProfile, type FishingConditionProfile } from "./profile-registry";
import { findSpeciesEnvironmentProfile } from "./species-environment";

// The legacy hairtail ID is outside the reviewed 38-profile registry. Preserve its
// existing evidence without promoting it into that registry or deriving a verdict.
export function getFactualConditionProfile(speciesId: string): FishingConditionProfile | null {
  const reviewed = getFishingConditionProfile(speciesId);
  if (reviewed) return reviewed;
  if (speciesId !== "BM-SPECIES-000444") return null;
  const legacy = findSpeciesEnvironmentProfile({ speciesId });
  if (!legacy) return null;
  const domain = (facts: Record<string, unknown>, hasEvidence: boolean) => ({
    status: hasEvidence ? "EVIDENCE_AVAILABLE" : "UNKNOWN",
    ...facts,
  });
  return {
    speciesId: legacy.speciesId,
    koreanName: legacy.koreanName,
    scientificName: legacy.scientificName,
    profileReadiness: "PROFILE_LIMITED",
    temperature: domain(legacy.temperature, [...legacy.temperature.observed, ...legacy.temperature.preferred, ...legacy.temperature.spawning].length > 0),
    depth: domain(legacy.depth, Object.values(legacy.depth).some(value => Array.isArray(value) && value.length > 0)),
    salinity: domain(legacy.salinity, legacy.salinity.ranges.length > 0),
    dissolvedOxygen: domain(legacy.dissolvedOxygen, legacy.dissolvedOxygen.observations.length > 0),
    spawning: domain({ records: legacy.spawning }, legacy.spawning.length > 0),
    migration: domain({ records: legacy.migration }, legacy.migration.length > 0),
    habitat: domain({ habitats: legacy.habitats, substrates: legacy.substrates }, legacy.habitats.length + legacy.substrates.length > 0),
    evidenceRefs: legacy.evidence.map(item => ({ id: item.id, sourceType: item.sourceType, title: item.title, url: item.url, evidenceClass: "LEGACY_SOURCE_REFERENCE" })),
    limitations: ["LEGACY_PROFILE_OUTSIDE_REVIEWED_38", ...legacy.unsupportedFields],
  };
}
