import type { PostLaunchSummary } from "./post-launch-summary";
export type OperationsSourceStatus = "AVAILABLE" | "PARTIAL" | "TIMEOUT" | "STALE" | "DISABLED" | "ERROR" | "UNKNOWN";
export type OperationsHealth = "HEALTHY" | "DEGRADED" | "DISABLED" | "ERROR" | "UNKNOWN";

export type OperationsSource = {
  id: string;
  status: OperationsSourceStatus;
  lastCheckedAt: string | null;
  sourceTimestamp: string | null;
  fetchedAt: string | null;
  latencyMs: number | null;
  recordCount: number | null;
  stationCount?: number | null;
  httpStatus: number | null;
  limitation: string;
};

export type OperationsService = {
  id: string;
  path: string;
  status: OperationsHealth;
  lastCheckedAt: string | null;
  latencyMs: number | null;
  httpStatus: number | null;
  finalUrl?: string | null;
  redirectCount?: number;
  limitation: string | null;
};

export type OperationsSnapshot = {
  checkedAt: string;
  postLaunch: PostLaunchSummary;
  deployment: { sha: string | null; deployedAt: string | null; url: string | null; environment: string; appVersion: string; serviceWorkerVersion: string | null };
  featureFlags: Record<string, boolean>;
  services: OperationsService[];
  sources: OperationsSource[];
  conditions: { status: OperationsHealth; selectorCount: number; profileContext: string; seasonality: string; risaStatus: OperationsSourceStatus; femoStatus: OperationsSourceStatus; lastApiLatencyMs: number | null };
  todaySea: { status: OperationsHealth; partialRendering: boolean; disabledSources: string[] };
  currentSample5xx: number;
  releaseEvidence: { decision: string; checkedAt: string; kind: "HISTORICAL_AUDIT" };
  limitations: string[];
};

export function sourceHealth(status: OperationsSourceStatus): OperationsHealth {
  if (status === "AVAILABLE") return "HEALTHY";
  if (status === "STALE" || status === "PARTIAL") return "DEGRADED";
  if (status === "DISABLED") return "DISABLED";
  if (status === "TIMEOUT") return "ERROR";
  return status;
}

export function pageHealth(httpStatus: number | null): OperationsHealth {
  if (httpStatus === 200) return "HEALTHY";
  if (httpStatus === null) return "UNKNOWN";
  return "ERROR";
}

export function partialPageHealth(pageStatus: OperationsHealth, sourceStatuses: OperationsSourceStatus[]): OperationsHealth {
  if (pageStatus !== "HEALTHY") return pageStatus;
  return sourceStatuses.some((status) => status !== "AVAILABLE") ? "DEGRADED" : "HEALTHY";
}
