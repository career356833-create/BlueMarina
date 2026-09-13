import { parseSourceAlignmentRequest, type SourceAlignmentRequest } from "./source-alignment-request";
import type { ConditionEvidenceBundleContexts } from "./evidence-bundle";

export type MultiSourceEvidenceRequest = {
  speciesId: string;
  alignment: SourceAlignmentRequest;
  contexts: ConditionEvidenceBundleContexts;
};

export function parseMultiSourceEvidenceRequest(input: unknown): MultiSourceEvidenceRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const root = input as Record<string, unknown>;
  const speciesId = typeof root.speciesId === "string" ? root.speciesId.trim() : "";
  const alignment = parseSourceAlignmentRequest(root.alignment);
  if (!/^BM-SPECIES-\d{6}$/.test(speciesId) || !alignment) return null;
  const rawContexts = root.contexts === undefined ? {} : root.contexts;
  if (!rawContexts || typeof rawContexts !== "object" || Array.isArray(rawContexts)) return null;
  const contexts = rawContexts as Record<string, unknown>;
  if (Object.keys(contexts).some((key) => key !== "month" && key !== "timeOfDay")) return null;
  const month = contexts.month === undefined || contexts.month === null ? null : contexts.month;
  const timeOfDay = contexts.timeOfDay === undefined || contexts.timeOfDay === null ? null : contexts.timeOfDay;
  if (month !== null && (!Number.isInteger(month) || Number(month) < 1 || Number(month) > 12)) return null;
  if (timeOfDay !== null && !["DAY", "NIGHT", "DAWN", "DUSK"].includes(String(timeOfDay))) return null;
  return {
    speciesId,
    alignment,
    contexts: { month: month as number | null, timeOfDay: timeOfDay as ConditionEvidenceBundleContexts["timeOfDay"] },
  };
}
