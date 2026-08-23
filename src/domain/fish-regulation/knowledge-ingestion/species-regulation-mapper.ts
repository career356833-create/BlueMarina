import type { FishSpecies } from "@/lib/types/drafts/nifs-fish-contract";
import type { FishingRegulation } from "@/lib/types/content-contract";
import type { RegulationFactCandidate } from "./regulation-fact-candidate";

export type SpeciesRegulationMatch = {
  speciesId: string;
  candidateId: string;
  matchScore: number;
  matchReason: string;
};

export type SpeciesLike = Pick<FishSpecies, "id" | "koreanName" | "scientificName" | "aliases"> & {
  speciesId?: string;
  name?: string;
};

export function mapCandidateToSpecies(candidate: RegulationFactCandidate, species: SpeciesLike[]): SpeciesRegulationMatch[] {
  return species
    .map((item) => scoreMatch(candidate, item))
    .filter((match) => match.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore);
}

export function speciesLikeFromFishingContent(input: FishingRegulation | Record<string, unknown>): SpeciesLike | null {
  const record = input as Record<string, unknown>;
  const speciesId = typeof record.speciesId === "string" ? record.speciesId : undefined;
  const id = speciesId ?? (typeof record.id === "string" ? record.id : undefined);
  if (!id) return null;
  return {
    id,
    speciesId,
    koreanName: typeof record.name === "string" ? record.name : typeof record.title === "string" ? record.title : id,
    scientificName: typeof record.scientificName === "string" ? record.scientificName : undefined,
    aliases: Array.isArray(record.aliases) ? record.aliases.filter((value: unknown): value is string => typeof value === "string") : []
  };
}

function scoreMatch(candidate: RegulationFactCandidate, species: SpeciesLike): SpeciesRegulationMatch {
  const reasons: string[] = [];
  let score = 0;
  if (candidate.speciesId && (candidate.speciesId === species.id || candidate.speciesId === species.speciesId)) {
    score += 0.85;
    reasons.push("speciesId exact match");
  }
  const text = candidate.statement;
  if (species.koreanName && text.includes(species.koreanName)) {
    score += 0.1;
    reasons.push("koreanName appears in statement");
  }
  if (species.scientificName && text.includes(species.scientificName)) {
    score += 0.05;
    reasons.push("scientificName appears in statement");
  }
  return {
    speciesId: species.speciesId ?? species.id,
    candidateId: candidate.candidateId,
    matchScore: Math.min(1, Number(score.toFixed(3))),
    matchReason: reasons.join("; ") || "no reliable species signal"
  };
}
