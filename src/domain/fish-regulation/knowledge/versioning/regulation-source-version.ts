import type { RegulationSourceLocator } from "./regulation-source-locator";

export type RegulationSourceVersionStatus = "draft" | "active" | "expired" | "archived";

export type RegulationSourceVersion = {
  versionId: string;
  sourceId: string;
  documentVersion: string;
  revisionDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceHash: string;
  sourceLocator?: RegulationSourceLocator;
  status: RegulationSourceVersionStatus;
};

export function createRegulationSourceVersion(input: Omit<RegulationSourceVersion, "versionId" | "sourceHash" | "status"> & {
  versionId?: string;
  sourceHash?: string;
  status?: RegulationSourceVersionStatus;
  content?: string;
}): RegulationSourceVersion {
  const versionId = input.versionId ?? `regver-${input.sourceId}-${input.documentVersion}-${input.revisionDate}`;
  return {
    versionId,
    sourceId: input.sourceId,
    documentVersion: input.documentVersion,
    revisionDate: input.revisionDate,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    sourceHash: input.sourceHash ?? hashSource(`${input.sourceId}:${input.documentVersion}:${input.revisionDate}:${input.content ?? ""}`),
    sourceLocator: input.sourceLocator,
    status: input.status ?? "draft"
  };
}

export function hashSource(value: string) {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
