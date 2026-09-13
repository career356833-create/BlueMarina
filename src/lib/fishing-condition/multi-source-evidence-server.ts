import "server-only";

import { runFishingConditionComparisonForEnvironment } from "./comparator-server";
import type { ComparatorDepthContext, ComparatorEnvironment } from "./comparator";
import { buildConditionEvidenceBundle } from "./evidence-bundle";
import { explainFishingCondition } from "./explanation";
import { findSpeciesEnvironmentProfile, type SpeciesEnvironmentProfile } from "./species-environment";
import { runSourceAlignment } from "./source-alignment-server";
import type { AlignedSourceResult } from "./source-alignment";
import { buildMultiSourceBranch, buildMultiSourceEvidenceResult, MULTI_SOURCE_EVIDENCE_PROFILE_VERSION } from "./multi-source-evidence";
import type { MultiSourceEvidenceRequest } from "./multi-source-evidence-request";
import {
  evaluateSourcePolicy,
  getSourcePolicyVariablesForSource,
  sourcePolicyAllowsComparison,
  type SourcePolicyGate,
  type SourcePolicyVariable,
} from "./source-policy";

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

function profileSupports(profile: SpeciesEnvironmentProfile, variable: SourcePolicyVariable) {
  if (variable === "temperature") {
    return (profile.temperature.canonicalPreferredMinC !== null && profile.temperature.canonicalPreferredMaxC !== null)
      || profile.temperature.observed.some((range) => range.minC !== null && range.maxC !== null);
  }
  if (variable === "salinity") return profile.salinity.ranges.length > 0;
  if (variable === "dissolvedOxygen") return profile.dissolvedOxygen.observations.length > 0;
  return false;
}

const variableValuePatterns: Record<SourcePolicyVariable, RegExp> = {
  temperature: /(?:waterTemperature|seaTemperature|\.temperature)(?:\.|$)/,
  salinity: /\.salinity(?:\.|$)/,
  dissolvedOxygen: /\.dissolvedOxygen(?:\.|$)/,
  chlorophyllA: /\.chlorophyllA(?:\.|$)/,
  waveHeight: /(?:significantWaveHeight|maximumWaveHeight)(?:\.|$)/,
  windSpeed: /(?:windSpeed|gustSpeed)(?:\.|$)/,
  windDirection: /\.windDirection(?:\.|$)/,
  pressure: /\.seaLevelPressure(?:\.|$)/,
  currentSpeed: /\.currentSpeed(?:\.|$)/,
  currentDirection: /\.currentDirectionRaw(?:\.|$)/,
  tide: /\.tide(?:\.|$)/,
  historicalTemperatureBaseline: /\.historicalTemperatureBaseline(?:\.|$)/,
};

function evaluateBranchPolicy(source: AlignedSourceResult, profile: SpeciesEnvironmentProfile) {
  return getSourcePolicyVariablesForSource(source.sourceId).map((variable) => {
    const passedGates: SourcePolicyGate[] = [];
    const values = Object.entries(source.values).filter(([key]) => variableValuePatterns[variable].test(key));
    if (values.some(([, item]) => item.unitStatus === "CONFIRMED")) passedGates.push("UNIT_CONFIRMED");
    if (profileSupports(profile, variable)) passedGates.push("SPECIES_PROFILE_SUPPORTED");
    if (source.depthMatchStatus === "EXACT" || source.depthMatchStatus === "CATEGORY_MATCH") passedGates.push("DEPTH_COMPATIBLE");
    if (source.status !== "UNAVAILABLE" && source.sourceBindingId) passedGates.push("STATION_MAPPED");
    if (source.timeSemantic !== "UNKNOWN") passedGates.push("TIME_SEMANTIC_KNOWN");
    if (source.freshness === "fresh") passedGates.push("FRESHNESS_ACCEPTABLE");
    return evaluateSourcePolicy({ variable, sourceId: source.sourceId, context: { passedGates, limitations: source.limitations } });
  });
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
    const sourcePolicy = evaluateBranchPolicy(source, profile);
    const environment = comparatorEnvironment(source, alignment.target.depthContext);
    const temperaturePolicy = sourcePolicy.find((evaluation) => evaluation.variable === "temperature");
    if (!environment || !temperaturePolicy || !sourcePolicyAllowsComparison(temperaturePolicy)) {
      const limitation = source.status !== "UNAVAILABLE" && (source.sourceId === "nifs-risa" || source.sourceId === "nifs-femo-sea")
        ? [environment ? "SOURCE_POLICY_COMPARISON_BLOCKED" : "COMPARATOR_DEPTH_CONTEXT_UNSUPPORTED"] : [];
      return buildMultiSourceBranch(source, null, limitation, sourcePolicy);
    }
    try {
      const comparison = runFishingConditionComparisonForEnvironment(request.speciesId, environment);
      const explanation = explainFishingCondition(comparison);
      const evidenceBundle = buildConditionEvidenceBundle(comparison, explanation, request.contexts);
      return buildMultiSourceBranch(source, { comparison, explanation, evidenceBundle }, [], sourcePolicy);
    } catch {
      return buildMultiSourceBranch(source, null, ["COMPARISON_BRANCH_ERROR"], sourcePolicy);
    }
  });

  return buildMultiSourceEvidenceResult({ speciesId: profile.speciesId, koreanName: profile.koreanName, scientificName: profile.scientificName, profileVersion: MULTI_SOURCE_EVIDENCE_PROFILE_VERSION }, alignment, branches);
}
