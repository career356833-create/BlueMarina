export type RetentionSummary = {
  retentionDays: 90; checkedAt: string; oldestRetained: string | null;
  eligibleRows: number; futureRows: number; configuredAt: string;
  lastRunAt: string | null; lastDeletedRows: number | null;
  lastResult: "SUCCESS" | "ERROR" | "NEVER_RUN";
  lastRunScope: "ALL_ENVIRONMENTS"; schedule: "DAILY_0317_UTC";
};

// Job start/connect failures cannot update the DB status row. An overdue run still alerts.
export function retentionHealth(summary: RetentionSummary): "OK" | "PENDING" | "NEEDS_ATTENTION" {
  const age = Date.parse(summary.checkedAt) - Date.parse(summary.lastRunAt ?? summary.configuredAt);
  if (!Number.isFinite(age) || age < 0 || age > 26 * 3600000 || summary.lastResult === "ERROR" || summary.futureRows > 0) return "NEEDS_ATTENTION";
  // A small eligible tail between daily runs is expected, not a service failure.
  return summary.lastResult === "NEVER_RUN" ? "PENDING" : "OK";
}
