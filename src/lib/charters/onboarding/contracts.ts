export const SUBMISSION_TYPES = ["OPERATOR_ONBOARDING", "BULK_IMPORT", "OFFICIAL_CONNECTOR"] as const;
export const SUBMISSION_STATES = ["DRAFT", "SUBMITTED", "VALIDATION_FAILED", "REVIEW_REQUIRED", "APPROVED", "REJECTED", "PROMOTED"] as const;
export const ROW_STATUSES = ["VALID", "VALID_WITH_WARNINGS", "INVALID"] as const;
export const CROSSWALK_STATUSES = ["EXACT_MATCH", "HIGH_CONFIDENCE", "CANDIDATE", "NO_MATCH"] as const;

export type SubmissionType = (typeof SUBMISSION_TYPES)[number];
export type SubmissionState = (typeof SUBMISSION_STATES)[number];
export type RowStatus = (typeof ROW_STATUSES)[number];
export type CrosswalkStatus = (typeof CROSSWALK_STATUSES)[number];
export type PromotionReadiness = "READY" | "READY_WITH_LIMITATIONS" | "REVIEW_REQUIRED" | "REJECT";
export type VerificationStatus = "SOURCE_BACKED" | "UNVERIFIED";

export interface SourceIdentity {
  sourceType: SubmissionType;
  sourceName: string;
  sourceUrl: string;
  submittedAt: string | null;
}

export interface OperatorDraft {
  name: string;
  representativeName: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  region: string | null;
}

export interface BoatDraft {
  name: string | null;
  capacity: number | null;
  vesselType: string | null;
  registrationInfo: string | null;
}

export interface PortDraft {
  name: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinateStatus: "USER_SUBMITTED" | "UNKNOWN";
}

export interface SpeciesReference {
  rawName: string;
  canonicalId: string | null;
  matchType: "EXACT_CANONICAL" | "SAFE_ALIAS" | "UNRESOLVED";
}

export interface CharterDraft {
  title: string;
  targetSpecies: SpeciesReference[];
  price: number | null;
  priceUnit: string | null;
  departureTime: string | null;
  returnTime: string | null;
  bookingMethod: string | null;
  bookingUrl: string | null;
}

export interface ScheduleDraft {
  date: string | null;
  departureTime: string | null;
  returnTime: string | null;
  capacity: number | null;
  remainingSeats: number | null;
}

export interface SubmissionDocument { kind: string; reference: string; sourceUrl: string | null }

export interface ValidationIssue {
  field: string;
  code: string;
  severity: "WARNING" | "ERROR";
  message: string;
}

export interface CharterSupplySubmission {
  submissionId: string;
  submissionType: SubmissionType;
  submittedAt: string | null;
  state: SubmissionState;
  verificationStatus: VerificationStatus;
  sourceIdentity: SourceIdentity;
  operator: OperatorDraft;
  boats: BoatDraft[];
  ports: PortDraft[];
  charters: CharterDraft[];
  schedules: ScheduleDraft[];
  documents: SubmissionDocument[];
  validationIssues: ValidationIssue[];
}

export interface AdminReviewContract {
  submissionId: string;
  reviewedAt: string;
  reviewerRef: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  validationSummary: { errors: number; warnings: number };
  registrationCrosswalk: { status: CrosswalkStatus; registrationId: string | null };
  conflicts: string[];
  evidenceRefs: string[];
  sourceRefs: string[];
  promotionReadiness: PromotionReadiness;
  notes: string | null;
}

export interface CharterSourceAdapter {
  readonly sourceType: "OFFICIAL_CONNECTOR";
  readonly sourceName: string;
  fetchPage(cursor?: string): Promise<{ records: unknown[]; nextCursor: string | null }>;
  normalize(record: unknown): CharterSupplySubmission;
}
