export type AutomatedAuditStatus = "pass" | "warning" | "fail" | "not_run" | "unknown";

export type AutomatedAuditIssue = {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  title: string;
  file: string;
  line: number;
  evidence: string;
  recommendedAction: string;
};

export type AutomatedAuditSummary = {
  schemaVersion: 1;
  projectId: string;
  projectName: string;
  auditedAt: string;
  generatorVersion: string;
  overallStatus: "pass" | "warning" | "fail";
  mode: string;
  checks: Record<string, { status: AutomatedAuditStatus; [key: string]: unknown }>;
  features: {
    total: number;
    verified: number;
    working: number;
    partial: number;
    mockOnly: number;
    disconnected: number;
    comingSoon: number;
    deadCodeCandidates: number;
    reviewRequired: number;
  };
  issues: AutomatedAuditIssue[];
};

export function isAutomatedAuditSummary(value: unknown): value is AutomatedAuditSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AutomatedAuditSummary>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.projectId === "string" &&
    typeof candidate.auditedAt === "string" &&
    ["pass", "warning", "fail"].includes(candidate.overallStatus ?? "") &&
    Boolean(candidate.checks && typeof candidate.checks === "object") &&
    Boolean(candidate.features && typeof candidate.features === "object") &&
    Array.isArray(candidate.issues)
  );
}
