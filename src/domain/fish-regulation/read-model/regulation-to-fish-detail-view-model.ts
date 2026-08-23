import type { RegulationRule, RegulationSourceRecord, RegulationSourceVersionRecord } from "../drafts/regulation-ingestion-contract";
import type {
  RegulationReadModelBuildInput,
  RegulationReadModelBuildResult,
  RegulationReadModelItem,
  RegulationReadModelVisibility,
} from "./types";

function normalizeText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const text = typeof value === "number" ? String(value) : value;
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumberText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : value.trim() || null;
}

function buildSummary(rule: RegulationRule) {
  const parts: string[] = [];
  if (normalizeText(rule.closedSeason)) parts.push(`closedSeason: ${normalizeText(rule.closedSeason)}`);
  if (normalizeText(rule.prohibitedLength)) parts.push(`prohibitedLength: ${normalizeNumberText(rule.prohibitedLength)}`);
  if (normalizeText(rule.prohibitedWeight)) parts.push(`prohibitedWeight: ${normalizeNumberText(rule.prohibitedWeight)}`);
  if (normalizeText(rule.region)) parts.push(`region: ${normalizeText(rule.region)}`);
  if (normalizeText(rule.waterArea)) parts.push(`waterArea: ${normalizeText(rule.waterArea)}`);
  if (normalizeText(rule.fisheryType)) parts.push(`fisheryType: ${normalizeText(rule.fisheryType)}`);

  if (parts.length) return parts.join(" / ");
  if (normalizeText(rule.legalBasis)) return normalizeText(rule.legalBasis) ?? "";
  return "regulation fact";
}

function buildTitle(rule: RegulationRule) {
  const typeLabel: Record<RegulationRule["regulationType"], string> = {
    CLOSED_SEASON: "closed-season rule",
    PROHIBITED_LENGTH: "minimum size rule",
    PROHIBITED_WEIGHT: "minimum weight rule",
    REGION_SCOPE: "region scope rule",
    EXCEPTION: "exception rule",
    OTHER: "regulation rule",
  };
  return typeLabel[rule.regulationType];
}

function toConfidence(value: number | null | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  return fallback;
}

function buildVisibility(input: {
  rule: RegulationRule;
  sourceVersion: RegulationSourceVersionRecord | undefined;
  confidence: number;
  minimumConfidenceToShowCurrent: number;
}): RegulationReadModelVisibility {
  if (input.rule.publishStatus === "archived") return "history";
  if (input.sourceVersion?.status === "expired") return "history";
  if (input.rule.publishStatus !== "published") return "warning";
  return input.confidence >= input.minimumConfidenceToShowCurrent ? "current" : "warning";
}

function isRuleForSpecies(rule: RegulationRule, speciesId: string) {
  if (rule.primarySpeciesId === speciesId) return true;
  return Array.isArray(rule.speciesIds) && rule.speciesIds.includes(speciesId);
}

function indexBy<T extends { id?: string; versionId?: string; sourceId?: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.id ?? item.versionId ?? item.sourceId;
    if (key) map.set(key, item);
  }
  return map;
}

function buildItem(input: {
  rule: RegulationRule;
  sourceRecord?: RegulationSourceRecord;
  sourceVersion?: RegulationSourceVersionRecord;
  visibility: RegulationReadModelVisibility;
  confidence: number;
  historyAvailable: boolean;
}): RegulationReadModelItem {
  const sourceMissing = !input.sourceRecord || !input.sourceRecord.documentUrl;
  return {
    regulationId: input.rule.id,
    slug: `regulation-${input.rule.id}`,
    title: buildTitle(input.rule),
    summary: buildSummary(input.rule),
    regulationType: input.rule.regulationType,
    region: input.rule.region ?? null,
    waterArea: input.rule.waterArea ?? null,
    fisheryType: input.rule.fisheryType ?? null,
    sourceName: input.sourceRecord?.documentName ?? input.rule.legalBasis ?? undefined,
    sourceUrl: input.sourceRecord?.documentUrl ?? undefined,
    sourceVersionId: input.sourceVersion?.versionId ?? input.rule.sourceVersionId ?? undefined,
    effectiveFrom: input.rule.effectiveFrom ?? input.sourceVersion?.effectiveFrom ?? undefined,
    effectiveTo: input.rule.effectiveTo ?? input.sourceVersion?.effectiveTo ?? undefined,
    legalBasis: input.rule.legalBasis ?? undefined,
    reviewStatus: input.rule.factReviewStatus === "approved"
      ? "approved"
      : input.rule.factReviewStatus === "rejected"
        ? "rejected"
        : input.rule.factReviewStatus === "reviewed"
          ? "needs_review"
          : "pending",
    confidence: input.confidence,
    historyAvailable: input.historyAvailable,
    visibility: input.visibility,
    sourceRecordId: input.rule.sourceRecordId,
    sourceVersionStatus: input.sourceVersion?.status ?? "missing",
    sourceMissing,
    publishStatus: input.rule.publishStatus,
  };
}

export function buildFishDetailRegulationReadModels(input: RegulationReadModelBuildInput): RegulationReadModelBuildResult {
  const sourceRecords = indexBy(input.sourceRecords ?? []);
  const activeVersionMap = indexBy(input.activeVersions);
  const allVersionMap = indexBy(input.allVersions ?? input.activeVersions);
  const minimumConfidenceToShowCurrent = input.minimumConfidenceToShowCurrent ?? 0.7;

  const rules = (input.rules ?? []).filter((rule) => isRuleForSpecies(rule, input.speciesId));
  const all = rules
    .filter((rule) => rule.publishStatus !== "archived")
    .map((rule) => {
      const sourceVersion = (rule.sourceVersionId ? allVersionMap.get(rule.sourceVersionId) : undefined)
        ?? (rule.sourceVersionId ? activeVersionMap.get(rule.sourceVersionId) : undefined);
      const sourceRecord = sourceRecords.get(rule.sourceRecordId);
      const confidence = toConfidence(rule.confidence, sourceVersion?.status === "active" ? 0.8 : 0.5);
      const visibility = buildVisibility({
        rule,
        sourceVersion,
        confidence,
        minimumConfidenceToShowCurrent,
      });
      const historyAvailable = Boolean(
        (rule.sourceVersionId && allVersionMap.has(rule.sourceVersionId) && allVersionMap.get(rule.sourceVersionId)?.status !== "active")
        || (rule.sourceRecordId && Array.from(allVersionMap.values()).some((version) => version.sourceRecordId === rule.sourceRecordId && version.status !== "active"))
      );

      return buildItem({
        rule,
        sourceRecord,
        sourceVersion,
        visibility,
        confidence,
        historyAvailable,
      });
    })
    .sort((a, b) => {
      if (a.visibility !== b.visibility) {
        const order: Record<RegulationReadModelVisibility, number> = { current: 0, warning: 1, history: 2 };
        return order[a.visibility] - order[b.visibility];
      }
      return a.title.localeCompare(b.title);
    });

  return {
    current: all.filter((item) => item.visibility !== "history"),
    history: input.includeHistory === false ? [] : all.filter((item) => item.visibility === "history"),
    all,
  };
}

export function projectFishDetailRegulations(input: RegulationReadModelBuildInput) {
  return buildFishDetailRegulationReadModels(input).current;
}
