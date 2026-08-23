import type { RegulationChangeEvent } from "./regulation-change-event";
import type { RegulationDiff } from "./regulation-diff-engine";

export type RegulationVersionReviewItem = {
  event: RegulationChangeEvent;
  diff: RegulationDiff;
  priority: number;
  reason: string;
};

export function buildRegulationVersionReviewQueue(items: Array<{
  event: RegulationChangeEvent;
  diff: RegulationDiff;
}>): RegulationVersionReviewItem[] {
  return items
    .map(({ event, diff }) => ({
      event,
      diff,
      priority: scorePriority(diff),
      reason: reason(diff)
    }))
    .sort((left, right) => right.priority - left.priority);
}

function scorePriority(diff: RegulationDiff) {
  const severityScore = diff.severity === "HIGH" ? 1 : diff.severity === "MEDIUM" ? 0.65 : 0.3;
  const fieldScore = Math.min(0.4, (diff.changed.length + diff.added.length + diff.removed.length) * 0.08);
  return Math.round((severityScore + fieldScore) * 1000) / 1000;
}

function reason(diff: RegulationDiff) {
  return `severity=${diff.severity}; changed=${diff.changed.join(",") || "-"}; added=${diff.added.length}; removed=${diff.removed.length}`;
}
