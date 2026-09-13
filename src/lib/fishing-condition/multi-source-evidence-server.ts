import "server-only";

import { runFishingConditionComparisonForEnvironment } from "./comparator-server";
import type { ComparatorDepthContext, ComparatorEnvironment } from "./comparator";
import { buildConditionEvidenceBundle } from "./evidence-bundle";
import { explainFishingCondition } from "./explanation";
import { findSpeciesEnvironmentProfile } from "./species-environment";
import { runSourceAlignment } from "./source-alignment-server";
import type { AlignedSourceResult } from "./source-alignment";
import { buildMultiSourceBranch, buildMultiSourceEvidenceResult, MULTI_SOURCE_EVIDENCE_PROFILE_VERSION } from "./multi-source-evidence";
import type { MultiSourceEvidenceRequest } from "./multi-source-evidence-request";

export class MultiSourceEvidenceError extends Error {
  constructor(public readonly code: "PROFILE_NOT_FOUND") { super(code); }
}

function numeric(source: AlignedSourceResult, key: string) {
  const amount = source.values[key]?.value;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function unit(source: AlignedSourceResult, key: string) {
  return source.values[key]?.unit ?? null;
}

function freshness(source: AlignedSourceResult): ComparatorEnvironment["freshness"] {
  return source.freshness === "fresh" || source.freshness === "stale" ? source.freshness : "unavailable";
}

function comparatorEnvironment(source: AlignedSourceResult, targetDepth: unknown): ComparatorEnvironment | null {
  if (source.status === "UNAVAILABLE" || (targetDepth !== "SURFACE" && targetDepth !== "MIDDLE" && targetDepth !== "BOTTOM")) return null;
  const depthContext = targetDepth as ComparatorDepthContext;
  if (source.sourceId === "nifs-risa") {
    const temperatureKey = `nifs-risa.waterTemperature.${depthContext.toLowerCase()}`;
    const depthKey = `nifs-risa.depth.${depthContext.toLowerCase()}`;
    return {
      sourceId: "nifs-risa", provider: "NIFS", qualityClass: "OBSERVED", stationOrSiteId: source.sourceBindingId,
      observedAt: source.observedOrValidAt, freshness: freshness(source), depthContext,
      exactDepthM: numeric(source, depthKey), stationWaterDepthM: numeric(source, "nifs-risa.stationWaterDepth"),
      temperature: { value: numeric(source, temperatureKey), unit: unit(source, temperatureKey) },
      salinity: { value: null, unit: null }, dissolvedOxygen: { value: null, unit: null }, chlorophyllA: { value: null, unit: null },
    };
  }
  if (source.sourceId === "nifs-femo-sea" && depthContext !== "MIDDLE") {
    const layer = depthContext.toLowerCase();
    const field = (name: string) => `nifs-femo-sea.${name}.${layer}`;
    return {
      sourceId: "nifs-femo-sea", provider: "NIFS", qualityClass: "OBSERVED_PERIODIC_ENVIRONMENT", stationOrSiteId: source.sourceBindingId,
      observedAt: source.observedOrValidAt, freshness: freshness(source), depthContext,
      exactDepthM: null, stationWaterDepthM: numeric(source, "nifs-femo-sea.stationWaterDepth"),
      temperature: { value: numeric(source, field("waterTemperature")), unit: unit(source, field("waterTemperature")) },
      salinity: { value: numeric(source, field("salinity")), unit: unit(source, field("salinity")) },
      dissolvedOxygen: { value: numeric(source, field("dissolvedOxygen")), unit: unit(source, field("dissolvedOxygen")) },
      chlorophyllA: { value: numeric(source, field("chlorophyllA")), unit: unit(source, field("chlorophyllA")) },
    };
  }
  return null;
}

export async function runMultiSourceEvidence(request: MultiSourceEvidenceRequest) {
  const alignment = await runSourceAlignment(request.alignment);
  const profile = findSpeciesEnvironmentProfile({ speciesId: request.speciesId });
  if (!profile) throw new MultiSourceEvidenceError("PROFILE_NOT_FOUND");

  const branches = alignment.sources.map((source) => {
    const environment = comparatorEnvironment(source, alignment.target.depthContext);
    if (!environment) {
      const limitation = source.status !== "UNAVAILABLE" && (source.sourceId === "nifs-risa" || source.sourceId === "nifs-femo-sea")
        ? ["COMPARATOR_DEPTH_CONTEXT_UNSUPPORTED"] : [];
      return buildMultiSourceBranch(source, null, limitation);
    }
    try {
      const comparison = runFishingConditionComparisonForEnvironment(request.speciesId, environment);
      const explanation = explainFishingCondition(comparison);
      const evidenceBundle = buildConditionEvidenceBundle(comparison, explanation, request.contexts);
      return buildMultiSourceBranch(source, { comparison, explanation, evidenceBundle });
    } catch {
      return buildMultiSourceBranch(source, null, ["COMPARISON_BRANCH_ERROR"]);
    }
  });

  return buildMultiSourceEvidenceResult({ speciesId: profile.speciesId, koreanName: profile.koreanName, scientificName: profile.scientificName, profileVersion: MULTI_SOURCE_EVIDENCE_PROFILE_VERSION }, alignment, branches);
}
