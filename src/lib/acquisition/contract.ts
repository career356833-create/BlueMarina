/** V1 measures retained server records; it does not invent visitors or client events. */
export const ACQUISITION_EVENTS = {
  landing_view: "UNOBSERVED",
  kakao_login_start: "UNOBSERVED",
  kakao_login_complete: "UNOBSERVED",
  charter_partner_view: "UNOBSERVED",
  charter_submission_start: "UNOBSERVED",
  charter_submission_complete: "RETAINED_SERVER_SUBMISSION",
  market_new_start: "UNOBSERVED",
  market_submission_complete: "RETAINED_SERVER_SUBMISSION",
  community_new_start: "UNOBSERVED",
  community_submission_complete: "RETAINED_SERVER_SUBMISSION",
  saved_first_item: "EARLIEST_RETAINED_SAVE_PER_USER",
  moderation_approved: "EXISTING_SERVER_REVIEW_HISTORY",
  moderation_rejected: "EXISTING_SERVER_REVIEW_HISTORY",
  public_content_created: "CURRENT_PUBLIC_STOCK_NOT_LIFETIME_EVENT",
} as const;

export function communityCreationHref(context: { spotId?: string; speciesId?: string } = {}) {
  const params = new URLSearchParams();
  // The destination validates exact IDs against its existing catalog, never names.
  if (context.spotId) params.set("spotId", context.spotId);
  if (context.speciesId) params.set("speciesId", context.speciesId);
  return `/community/new${params.size ? `?${params}` : ""}`;
}

export function checkedCreationContext(query: { spotId?: unknown; speciesId?: unknown }, catalog: { fishingSpots: { id: string }[]; species: { id: string }[] }) {
  return {
    spotId: typeof query.spotId === "string" && catalog.fishingSpots.some(x => x.id === query.spotId) ? query.spotId : null,
    speciesId: typeof query.speciesId === "string" && catalog.species.some(x => x.id === query.speciesId) ? query.speciesId : null,
  };
}

/** Proposed attribution envelope. Not persisted or transmitted by V1. */
export function sanitizeAttribution(input: { utm_source?: unknown; utm_medium?: unknown; utm_campaign?: unknown; referrer?: unknown }) {
  const choice = (value: unknown, allow: readonly string[]) => typeof value === "string" && allow.includes(value.toLowerCase()) ? value.toLowerCase() : "UNKNOWN";
  let referrer = "UNKNOWN";
  try {
    if (typeof input.referrer === "string" && input.referrer.length <= 2048) {
      const url = new URL(input.referrer);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) {
        const sources: Record<string, string> = { "www.google.com": "google", "google.com": "google", "search.naver.com": "naver", "m.search.naver.com": "naver", "www.instagram.com": "instagram", "www.youtube.com": "youtube" };
        referrer = Object.hasOwn(sources, url.hostname) ? sources[url.hostname] : "UNKNOWN";
      }
    }
  } catch { /* No raw URL, query, fragment, identity or credentials survive. */ }
  return { source: choice(input.utm_source, ["google", "naver", "kakao", "instagram", "facebook", "youtube"]),
    medium: choice(input.utm_medium, ["cpc", "organic", "social", "referral", "email"]),
    campaign: choice(input.utm_campaign, ["launch-v1", "charter-pilot-v1", "market-pilot-v1", "community-pilot-v1"]), referrer };
}
