export const FISH_MEDIA_STATES = [
  "requested", "upload_url_issued", "uploaded_unverified", "verified", "processing", "ready_private",
  "ready_for_ai", "public_review_pending", "published", "quarantined", "expired", "delete_pending", "deleted", "failed",
] as const;

export type FishMediaState = (typeof FISH_MEDIA_STATES)[number];

const TRANSITIONS: Record<FishMediaState, readonly FishMediaState[]> = {
  requested: ["upload_url_issued", "expired", "failed", "delete_pending"],
  upload_url_issued: ["uploaded_unverified", "quarantined", "expired", "delete_pending", "failed"],
  uploaded_unverified: ["verified", "quarantined", "expired", "delete_pending", "failed"],
  verified: ["processing", "delete_pending", "failed"],
  processing: ["ready_private", "ready_for_ai", "failed", "delete_pending"],
  ready_private: ["ready_for_ai", "public_review_pending", "delete_pending"],
  ready_for_ai: ["ready_private", "public_review_pending", "delete_pending"],
  public_review_pending: ["published", "ready_private", "delete_pending"],
  published: ["ready_private", "delete_pending"],
  quarantined: ["delete_pending", "deleted"],
  expired: ["delete_pending", "deleted"],
  delete_pending: ["deleted", "failed"],
  deleted: [],
  failed: ["quarantined", "delete_pending"],
};

export function canTransitionFishMediaState(from: FishMediaState, to: FishMediaState) {
  return TRANSITIONS[from].includes(to);
}

export function assertFishMediaStateTransition(from: FishMediaState, to: FishMediaState) {
  if (!canTransitionFishMediaState(from, to)) throw new Error(`FISH_MEDIA_INVALID_TRANSITION:${from}:${to}`);
}

export function canRequestAiIdentification(state: FishMediaState) {
  return state === "ready_for_ai" || state === "ready_private";
}

export function canPublishPublicDerivative(input: { state: FishMediaState; exifRemoved: boolean; reviewApproved: boolean; observationPublic: boolean; publicConsent: boolean }) {
  return input.state === "public_review_pending" && input.exifRemoved && input.reviewApproved && input.observationPublic && input.publicConsent;
}
