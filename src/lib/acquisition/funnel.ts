import { classifyQa, type Identity, type QueueRow } from "../operations/summary-model";
import { ACQUISITION_EVENTS } from "./contract";

type Partition = "real" | "qa" | "admin" | "unclassified";
export type ActivationCount = { total: number; real: number | null; qa: number; admin: number; unclassified: number };
export type ReviewFact = { target: string; action: string; at: string | null };
export type ActivationInput = {
  identities: Map<string, Identity>; identitiesComplete: boolean;
  saved: QueueRow[] | null; charter: QueueRow[] | null; market: QueueRow[] | null; community: QueueRow[] | null;
  charterReviews: ReviewFact[] | null; marketReviews: ReviewFact[] | null; communityReviews: ReviewFact[] | null;
  charterPublic: number;
};
export function isActivationAdmin(user: Identity) {
  return ["operations", "charter", "market", "community"].some(role => user.app_metadata?.[`${role}_role`] === `${role}_admin`);
}
function partition(row: QueueRow, input: ActivationInput): Partition {
  const qa = classifyQa(row, input.identities, input.identitiesComplete);
  if (qa === true) return "qa";
  const user = input.identities.get(row.owner);
  if (user && isActivationAdmin(user)) return "admin";
  return qa === false ? "real" : "unclassified";
}
function count(rows: QueueRow[] | null, input: ActivationInput): ActivationCount | null {
  if (!rows) return null;
  const result = { total: rows.length, real: 0 as number | null, qa: 0, admin: 0, unclassified: 0 };
  for (const row of rows) { const key = partition(row, input); result[key] = (result[key] ?? 0) + 1; }
  if (result.unclassified) result.real = null;
  return result;
}
function firstParticipants(rows: QueueRow[] | null, input: ActivationInput): ActivationCount | null {
  if (!rows) return null;
  // One identity can own a marked QA record and a real record. Prefer its real action,
  // never double count it. Trusted QA/admin identities never become real.
  const users = new Map<string, QueueRow>();
  for (const row of rows) {
    const key = row.owner || `missing:${row.id}`, previous = users.get(key);
    if (!previous || (partition(previous, input) !== "real" && partition(row, input) === "real")) users.set(key, row);
  }
  return count([...users.values()], input);
}
function validTimestamp(row: QueueRow) { return !!row.at && Number.isFinite(Date.parse(row.at)); }
export function ratio(numerator: number | null | undefined, denominator: number | null | undefined) {
  return numerator != null && denominator != null && denominator > 0 && numerator <= denominator ? Math.round(numerator / denominator * 1000) / 10 : null;
}
export function buildActivationFunnel(input: ActivationInput) {
  const submitted = (rows: QueueRow[] | null) => rows?.filter(r => r.status !== "DRAFT" && validTimestamp(r)) ?? null;
  const charter = submitted(input.charter), market = submitted(input.market), community = submitted(input.community);
  function domain(rows: QueueRow[] | null, reviews: ReviewFact[] | null, name: "charter" | "market" | "community") {
    const reviewed = (action: string) => {
      if (!reviews || !rows) return null;
      const targets = new Set(reviews.filter(r => r.action === action && r.at && Number.isFinite(Date.parse(r.at))).map(r => r.target));
      return count(rows.filter(r => targets.has(r.id)), input);
    };
    const submissions = count(rows, input), approved = reviewed("APPROVE"), rejected = reviewed("REJECT");
    const publicRows = rows?.filter(r => r.status === "ACTIVE" && r.publicEligible !== false) ?? null;
    const published = name === "charter" ? input.charterPublic === 0 ? { total: 0, real: 0, qa: 0, admin: 0, unclassified: 0 } : { total: input.charterPublic, real: null, qa: 0, admin: 0, unclassified: input.charterPublic } : count(publicRows, input);
    return { submissions, firstSubmitters: firstParticipants(rows, input), approved, rejected, published,
      submissionToApprovedPercent: ratio(approved?.real, submissions?.real),
      approvedToCurrentlyPublicPercent: name === "charter" ? null : ratio(published?.real, approved?.real),
      publicationBoundary: name === "charter" ? "APPROVED_IS_CANDIDATE_MANUAL_VERIFIED_REGISTRY_RELEASE_REQUIRED" : "EXISTING_ADMIN_REVIEW_REQUIRED" };
  }
  const all = input.saved && charter && market && community ? [...input.saved, ...charter, ...market, ...community] : null;
  return {
    basis: "RETAINED_SERVER_RECORDS_AND_REVIEW_HISTORY", events: ACQUISITION_EVENTS,
    visitors: null, loginStarted: null, loginCompleted: null, submissionStarted: null, loginToFirstActionPercent: null,
    realRegisteredUsers: input.identitiesComplete ? [...input.identities.values()].filter(u => u.app_metadata?.blue_marina_qa !== true && !isActivationAdmin(u)).length : null,
    firstActions: firstParticipants(all, input), firstSaved: firstParticipants(input.saved, input),
    charter: domain(charter, input.charterReviews, "charter"), market: domain(market, input.marketReviews, "market"), community: domain(community, input.communityReviews, "community"),
    attribution: "UNKNOWN_NOT_COLLECTED",
    limitation: "Observable lower bound, not lifetime first-event analytics: deleted saves/records cannot be reconstructed. Each participant is deduplicated across retained actions; login alone is not activation. Reviews count distinct retained submissions ever reviewed, not review clicks. Published is current stock, not lifetime creations. Visitors/login/start/attribution are UNKNOWN. QA/admin/unclassified never enter Real KPI. Capped/failed reads are UNKNOWN; no cohort conversion rate is implied.",
  };
}
export type ActivationFunnel = ReturnType<typeof buildActivationFunnel>;
