import batchAJson from "../../../data/fishing-condition/profiles/v1/batch-a-19.json";
import batchBJson from "../../../data/fishing-condition/profiles/v1/batch-b-19.json";

export const FISHING_CONDITION_PROFILE_READINESS = ["PROFILE_READY", "PROFILE_PARTIAL", "PROFILE_LIMITED"] as const;
export type FishingConditionProfileReadiness = (typeof FISHING_CONDITION_PROFILE_READINESS)[number];

type ArtifactProfile = {
  speciesId: string;
  koreanName: string;
  scientificName: string;
  profileReadiness: FishingConditionProfileReadiness;
  temperature: Record<string, unknown>;
  depth: Record<string, unknown>;
  salinity: Record<string, unknown>;
  dissolvedOxygen: Record<string, unknown>;
  spawning: Record<string, unknown>;
  migration: Record<string, unknown>;
  habitat: Record<string, unknown>;
  evidenceRefs: Array<{ id: string; sourceType: string; title: string; url?: string | null; evidenceClass: string }>;
  limitations: string[];
};

type ProfileArtifact = { profiles: ArtifactProfile[] };
const profiles = [...(batchAJson as ProfileArtifact).profiles, ...(batchBJson as ProfileArtifact).profiles];
const CROSS_SYSTEM_PROTECTED_IDS = new Set(["47aa9b93-2b32-4df4-9a2a-45ed3abbd484"]);

export function isFishingConditionRuntimeSpeciesId(speciesId: string) {
  return /^BM-SPECIES-\d{6}$/.test(speciesId) || CROSS_SYSTEM_PROTECTED_IDS.has(speciesId);
}

function validate() {
  if (profiles.length !== 38 || new Set(profiles.map((profile) => profile.speciesId)).size !== 38) return false;
  return profiles.every((profile) => isFishingConditionRuntimeSpeciesId(profile.speciesId)
    && FISHING_CONDITION_PROFILE_READINESS.includes(profile.profileReadiness)
    && profile.evidenceRefs.length > 0);
}

if (!validate()) throw new Error("INVALID_FISHING_CONDITION_PROFILE_REGISTRY");

export type FishingConditionProfile = ArtifactProfile;
export const FISHING_CONDITION_PROFILE_REGISTRY = profiles.map((profile) => ({
  ...profile,
  evidenceRefs: profile.evidenceRefs.map((reference) => ({ ...reference })),
  limitations: [...profile.limitations],
}));
export const FISHING_CONDITION_PROFILE_SPECIES_COUNT = FISHING_CONDITION_PROFILE_REGISTRY.length;

const byId = new Map(FISHING_CONDITION_PROFILE_REGISTRY.map((profile) => [profile.speciesId, profile]));

export function getFishingConditionProfile(speciesId: string | null | undefined) {
  return speciesId ? byId.get(speciesId) ?? null : null;
}

export function getFishingConditionProfileSpecies() {
  return FISHING_CONDITION_PROFILE_REGISTRY.map((profile) => ({ id: profile.speciesId, name: profile.koreanName }));
}
