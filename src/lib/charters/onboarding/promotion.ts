import type { AdminReviewContract, CharterSupplySubmission, PromotionReadiness } from "./contracts";
import { validateSubmission } from "./validation";

export function getPromotionReadiness(submission: CharterSupplySubmission): PromotionReadiness {
  const issues = validateSubmission(submission);
  if (issues.some((issue) => issue.severity === "ERROR")) return "REJECT";
  return issues.length ? "READY_WITH_LIMITATIONS" : "READY";
}

export function buildPromotionCandidate(submission: CharterSupplySubmission, review: AdminReviewContract) {
  const readiness = getPromotionReadiness(submission);
  if (submission.state !== "APPROVED" || review.decision !== "APPROVE" || readiness === "REJECT" || review.promotionReadiness === "REJECT" || review.promotionReadiness === "REVIEW_REQUIRED") throw new Error("PROMOTION_NOT_ALLOWED");
  return { schemaVersion: 1, kind: "PROMOTION_CANDIDATE" as const, submissionId: submission.submissionId, readiness, review: { reviewedAt: review.reviewedAt, reviewerRef: review.reviewerRef, evidenceRefs: [...review.evidenceRefs].sort(), sourceRefs: [...review.sourceRefs].sort() }, payload: { operator: submission.operator, boats: submission.boats, ports: submission.ports, charters: submission.charters, schedules: submission.schedules }, productionActivated: false };
}
