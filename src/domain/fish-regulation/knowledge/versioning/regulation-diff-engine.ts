import type { RegulationFactCandidate } from "../../knowledge-ingestion/regulation-fact-candidate";

export type RegulationDiffSeverity = "LOW" | "MEDIUM" | "HIGH";

export type RegulationDiff = {
  changed: string[];
  added: string[];
  removed: string[];
  severity: RegulationDiffSeverity;
};

const TRACKED_FIELDS = [
  "closedSeason",
  "prohibitedLength",
  "prohibitedWeight",
  "waterArea",
  "fisheryType",
  "exceptionConditions"
] as const;

export function diffRegulationCandidates(
  previous?: RegulationFactCandidate,
  next?: RegulationFactCandidate
): RegulationDiff {
  if (!previous && !next) return { changed: [], added: [], removed: [], severity: "LOW" };
  if (!previous && next) return { changed: [], added: [...TRACKED_FIELDS], removed: [], severity: "HIGH" };
  if (previous && !next) return { changed: [], added: [], removed: [...TRACKED_FIELDS], severity: "HIGH" };

  const changed = TRACKED_FIELDS.filter((field) => serialize(previous?.[field]) !== serialize(next?.[field]));
  return {
    changed,
    added: [],
    removed: [],
    severity: classifySeverity(changed)
  };
}

function classifySeverity(changed: readonly string[]): RegulationDiffSeverity {
  if (changed.some((field) => field === "closedSeason" || field === "prohibitedLength" || field === "prohibitedWeight")) return "HIGH";
  if (changed.some((field) => field === "waterArea" || field === "fisheryType" || field === "exceptionConditions")) return "MEDIUM";
  return "LOW";
}

function serialize(value: unknown) {
  return JSON.stringify(value ?? null);
}
