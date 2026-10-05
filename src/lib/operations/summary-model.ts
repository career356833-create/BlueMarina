/** Aggregate-only operations contract. Never serialize identities, titles or log messages. */
export type Split = { total: number; qa: number; real: number | null; unclassified: number };
export type QueueRow = { id: string; owner: string; status: string; marker?: string; at: string | null; qa?: boolean; publicEligible?: boolean };
export type Identity = { id: string; app_metadata?: Record<string, unknown>; banned_until?: string };
export type QueueSummary = {
  state: "AVAILABLE" | "UNKNOWN"; states: Record<string, Split>; pending: Split | null;
  public: Split | null; oldestPendingAt: string | null; oldestPendingHours: number | null;
  oldestRealPendingHours: number | null; latestSubmissionAt: string | null;
};
export const DATA_REFERENCE = { fishingSpots: 1405, fishSpecies: 1258, marineOrganisms: 3016 } as const;
export const QA_MARKER = /(?:^|\W)QA(?:\W|$)|\[QA\]|BLUE[_-]MARINA(?:[_-](?:CHARTER|MARKET|COMMUNITY))?[_-]E2E[_-]TEST/i;
export const isQaIdentity = (user: Identity) => user.app_metadata?.blue_marina_qa === true;
export function classifyQa(row: QueueRow, identities: Map<string, Identity>, complete: boolean): boolean | null {
  if (row.qa === true || QA_MARKER.test(row.marker ?? "")) return true;
  const owner = identities.get(row.owner);
  if (owner) return isQaIdentity(owner);
  // Deleted/missing owners are not silently counted as real users.
  return complete ? null : null;
}
export function split(rows: QueueRow[], identities: Map<string, Identity>, complete: boolean): Split {
  let qa = 0; let real = 0; let unclassified = 0;
  for (const row of rows) { const value = classifyQa(row, identities, complete); if (value === true) qa++; else if (value === false) real++; else unclassified++; }
  return { total: rows.length, qa, real: unclassified ? null : real, unclassified };
}
export function ageHours(value: string | null, now: number): number | null {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time <= now ? Math.round((now - time) / 36e5 * 10) / 10 : null;
}
export function summarizeQueue(rows: QueueRow[] | null, identities: Map<string, Identity>, complete: boolean, pendingStates: string[], publicStates: string[], now: number): QueueSummary {
  const empty: QueueSummary = { state: "UNKNOWN", states: {}, pending: null, public: null, oldestPendingAt: null, oldestPendingHours: null, oldestRealPendingHours: null, latestSubmissionAt: null };
  if (!rows) return empty;
  const pending = rows.filter(r => pendingStates.includes(r.status));
  const dates = (items: QueueRow[]) => items.map(r => r.at).filter((at): at is string => !!at && Number.isFinite(Date.parse(at)) && Date.parse(at) <= now).sort();
  const oldestPendingAt = dates(pending)[0] ?? null;
  return { state: "AVAILABLE", states: Object.fromEntries([...new Set(rows.map(r => r.status))].sort().map(status => [status, split(rows.filter(r => r.status === status), identities, complete)])),
    pending: split(pending, identities, complete), public: split(rows.filter(r => publicStates.includes(r.status) && r.publicEligible !== false), identities, complete),
    oldestPendingAt, oldestPendingHours: ageHours(oldestPendingAt, now), latestSubmissionAt: dates(rows).at(-1) ?? null,
    oldestRealPendingHours: ageHours(dates(pending.filter(r => classifyQa(r, identities, complete) === false))[0] ?? null, now) };
}

const ROUTES = ["/", "/today-sea", "/sea", "/sea/navigation", "/fish", "/fishing-spots", "/charters", "/market", "/community", "/account", "/account/login", "/account/auth/callback", "/api/operations/health"];
export function routeTemplate(raw: unknown): string {
  if (typeof raw !== "string") return "OTHER";
  const path = raw.split(/[?#]/)[0];
  if (ROUTES.includes(path)) return path;
  for (const root of ["/api/account", "/api/charters", "/api/market", "/api/community", "/api/sea-info", "/api/fishing-condition", "/admin/operations", "/fishing-spots", "/charters", "/market", "/community", "/account", "/fish"]) {
    if (path.startsWith(root + "/")) return root + "/[route]";
  }
  return "OTHER";
}
export function summarizeRuntime(rows: Record<string, unknown>[], limit: number) {
  const errors = rows.filter(r => ["error", "fatal"].includes(String(r.level)) || Number(r.responseStatusCode) >= 500);
  const failingRoutes = new Map<string, number>();
  for (const row of errors) { const route = routeTemplate(row.requestPath); failingRoutes.set(route, (failingRoutes.get(route) ?? 0) + 1); }
  const dates = errors.map(r => typeof r.timestamp === "number" ? new Date(r.timestamp).toISOString() : typeof r.timestamp === "string" && Number.isFinite(Date.parse(r.timestamp)) ? new Date(r.timestamp).toISOString() : null).filter((v): v is string => !!v).sort();
  return { sampleSize: rows.length, possiblyTruncated: rows.length >= limit, errorCount: errors.length,
    http4xx: rows.filter(r => Number(r.responseStatusCode) >= 400 && Number(r.responseStatusCode) < 500).length,
    http5xx: rows.filter(r => Number(r.responseStatusCode) >= 500).length,
    http401: rows.filter(r => Number(r.responseStatusCode) === 401).length, http403: rows.filter(r => Number(r.responseStatusCode) === 403).length,
    topFailingRoute: ([...failingRoutes.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null) as string | null,
    lastErrorAt: dates.at(-1) ?? null, successfulSessions: null, authFailures: null, callbackFailures: null, badOauthState: null };
}
