import type { SubmissionState } from "../onboarding/contracts";
import { SupplyIntakeError } from "./types";

const allowed: Record<SubmissionState, readonly SubmissionState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["VALIDATION_FAILED", "REVIEW_REQUIRED"],
  VALIDATION_FAILED: ["SUBMITTED", "REVIEW_REQUIRED"],
  REVIEW_REQUIRED: ["APPROVED", "REJECTED", "VALIDATION_FAILED"],
  APPROVED: ["PROMOTED"],
  REJECTED: [],
  PROMOTED: []
};

export const TRANSITION_RULES = allowed;
export function assertTransition(from: SubmissionState, to: SubmissionState) {
  if (!allowed[from].includes(to)) throw new SupplyIntakeError("INVALID_STATE_TRANSITION", 409);
}
