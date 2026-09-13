import type { ConditionEvidenceBundleRequest } from "./evidence-bundle-server";

export function parseConditionEvidenceBundleRequest(input: unknown): ConditionEvidenceBundleRequest | null {
  if (!input || typeof input !== "object") return null;
  const root = input as Record<string, unknown>;
  const environment = root.environment;
  if (!environment || typeof environment !== "object") return null;
  const source = environment as Record<string, unknown>;
  const contextsInput = root.contexts;
  if (contextsInput !== undefined && (!contextsInput || typeof contextsInput !== "object")) return null;
  const contexts = (contextsInput ?? {}) as Record<string, unknown>;
  const speciesId = typeof root.speciesId === "string" ? root.speciesId.trim() : "";
  const sourceId = source.sourceId;
  const stationId = typeof source.stationId === "string" ? source.stationId.trim() : undefined;
  const siteId = typeof source.siteId === "string" ? source.siteId.trim() : undefined;
  const depthContext = source.depthContext;
  const month = contexts.month === undefined || contexts.month === null ? null : contexts.month;
  const timeOfDay = contexts.timeOfDay === undefined || contexts.timeOfDay === null ? null : contexts.timeOfDay;
  if (!/^BM-SPECIES-\d{6}$/.test(speciesId)) return null;
  if (sourceId !== "nifs-risa" && sourceId !== "nifs-femo-sea") return null;
  if (depthContext !== "SURFACE" && depthContext !== "MIDDLE" && depthContext !== "BOTTOM") return null;
  if (sourceId === "nifs-risa" && (!stationId || siteId)) return null;
  if (sourceId === "nifs-femo-sea" && (!siteId || stationId || depthContext === "MIDDLE")) return null;
  if (month !== null && (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12)) return null;
  if (timeOfDay !== null && !(["DAY", "NIGHT", "DAWN", "DUSK"] as const).includes(timeOfDay as "DAY")) return null;
  return {
    speciesId,
    environment: { sourceId, stationId, siteId, depthContext },
    contexts: {
      month: month as number | null,
      timeOfDay: timeOfDay as ConditionEvidenceBundleRequest["contexts"]["timeOfDay"],
    },
  };
}
