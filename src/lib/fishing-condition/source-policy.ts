import policyArtifact from "../../../data/fishing-condition/source-policy/v1/source-policy.json";

export const SOURCE_POLICY_QUALITY_CLASS = "DERIVED_SOURCE_POLICY" as const;

export const SOURCE_POLICY_ACTIONS = [
  "COMPARISON_ALLOWED",
  "COMPARISON_ALLOWED_WITH_LIMITS",
  "CONTEXT_ONLY",
  "BASELINE_ONLY",
  "BLOCKED",
  "UNSUPPORTED",
] as const;

export const SOURCE_POLICY_GATES = [
  "UNIT_CONFIRMED",
  "SPECIES_PROFILE_SUPPORTED",
  "DEPTH_COMPATIBLE",
  "STATION_MAPPED",
  "TIME_SEMANTIC_KNOWN",
  "DIRECTION_CONVENTION_CONFIRMED",
  "FRESHNESS_ACCEPTABLE",
  "ANOMALY_MAPPING_AVAILABLE",
] as const;

export type SourcePolicyAction = typeof SOURCE_POLICY_ACTIONS[number];
export type SourcePolicyGate = typeof SOURCE_POLICY_GATES[number];
export type SourcePolicyVariable =
  | "temperature"
  | "salinity"
  | "dissolvedOxygen"
  | "chlorophyllA"
  | "waveHeight"
  | "windSpeed"
  | "windDirection"
  | "pressure"
  | "currentSpeed"
  | "currentDirection"
  | "tide"
  | "historicalTemperatureBaseline";

type ArtifactPolicyEntry = {
  sourceId: string;
  sourceQualityClass: string;
  action: Exclude<SourcePolicyAction, "UNSUPPORTED">;
  reason: string;
  requiredGates: SourcePolicyGate[];
  limitations: string[];
};

type ArtifactVariablePolicy = {
  variable: SourcePolicyVariable;
  sources: ArtifactPolicyEntry[];
};

type SourcePolicyArtifact = {
  schemaVersion: "1.0.0";
  qualityClass: typeof SOURCE_POLICY_QUALITY_CLASS;
  sourceClasses: Array<{ qualityClass: string; allowedUse: string; limitations: string[] }>;
  variables: ArtifactVariablePolicy[];
};

export type SourcePolicyEvaluation = {
  variable: SourcePolicyVariable | string;
  sourceId: string;
  sourceQualityClass: string | null;
  configuredAction: SourcePolicyAction;
  action: SourcePolicyAction;
  reason: string;
  requiredGates: SourcePolicyGate[];
  passedGates: SourcePolicyGate[];
  failedGates: SourcePolicyGate[];
  limitations: string[];
  qualityClass: typeof SOURCE_POLICY_QUALITY_CLASS;
};

export type SourcePolicyEvaluationContext = {
  passedGates?: readonly SourcePolicyGate[];
  limitations?: readonly string[];
};

const artifact = policyArtifact as SourcePolicyArtifact;
const comparisonActions = new Set<SourcePolicyAction>(["COMPARISON_ALLOWED", "COMPARISON_ALLOWED_WITH_LIMITS"]);

function findEntry(variable: string, sourceId: string) {
  return artifact.variables.find((item) => item.variable === variable)?.sources.find((source) => source.sourceId === sourceId) ?? null;
}

export function getSourcePolicyVariablesForSource(sourceId: string): SourcePolicyVariable[] {
  return artifact.variables.filter((item) => item.sources.some((source) => source.sourceId === sourceId)).map((item) => item.variable);
}

export function evaluateSourcePolicy(input: {
  variable: SourcePolicyVariable | string;
  sourceId: string;
  context?: SourcePolicyEvaluationContext;
}): SourcePolicyEvaluation {
  const entry = findEntry(input.variable, input.sourceId);
  if (!entry) {
    return {
      variable: input.variable,
      sourceId: input.sourceId,
      sourceQualityClass: null,
      configuredAction: "UNSUPPORTED",
      action: "UNSUPPORTED",
      reason: "VARIABLE_SOURCE_PAIR_NOT_DEFINED",
      requiredGates: [],
      passedGates: [],
      failedGates: [],
      limitations: [...new Set(input.context?.limitations ?? [])],
      qualityClass: SOURCE_POLICY_QUALITY_CLASS,
    };
  }

  const supplied = new Set(input.context?.passedGates ?? []);
  const passedGates = entry.requiredGates.filter((gate) => supplied.has(gate));
  const failedGates = entry.requiredGates.filter((gate) => !supplied.has(gate));
  const gateBlocked = comparisonActions.has(entry.action) && failedGates.length > 0;

  return {
    variable: input.variable,
    sourceId: input.sourceId,
    sourceQualityClass: entry.sourceQualityClass,
    configuredAction: entry.action,
    action: gateBlocked ? "BLOCKED" : entry.action,
    reason: gateBlocked ? "REQUIRED_GATE_FAILED" : entry.reason,
    requiredGates: [...entry.requiredGates],
    passedGates,
    failedGates,
    limitations: [...new Set([...entry.limitations, ...(input.context?.limitations ?? [])])],
    qualityClass: SOURCE_POLICY_QUALITY_CLASS,
  };
}

export function sourcePolicyAllowsComparison(evaluation: SourcePolicyEvaluation) {
  return comparisonActions.has(evaluation.action);
}

export function getSourcePolicyArtifact() {
  return artifact;
}
