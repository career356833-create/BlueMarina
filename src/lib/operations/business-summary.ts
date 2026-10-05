import "server-only";
import { createClient } from "@supabase/supabase-js";
import { productionCharterDataset } from "@/lib/charters/registry";
import { isQaIdentity, QA_MARKER, split, summarizeQueue, type Identity, type QueueRow } from "./summary-model";

const MAX_ROWS = 1000;
const READ_TIMEOUT_MS = 5000;
type Row = Record<string, unknown>;

export async function collectBusinessSummary(now = Date.now()) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // A separate bounded server client reuses existing credentials. No new role or RPC.
  const client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(READ_TIMEOUT_MS), cache: "no-store" }),
  } }) : null;
  const failures: string[] = [];
  async function read(table: string, fields: string): Promise<Row[] | null> {
    if (!client) return null;
    try {
      const { data, error } = await client.from(table).select(fields).limit(MAX_ROWS + 1);
      if (error || !data || data.length > MAX_ROWS) { failures.push(table); return null; }
      return data as unknown as Row[];
    } catch { failures.push(table); return null; }
  }
  let identities: Identity[] = []; let identitiesComplete = false;
  if (client) {
    try {
      const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: MAX_ROWS });
      identitiesComplete = !error && data.users.length < MAX_ROWS;
      if (!error) identities = data.users.map(user => ({ id: user.id, app_metadata: user.app_metadata, banned_until: user.banned_until }));
    } catch { failures.push("auth"); }
  }
  const owners = new Map(identities.map(user => [user.id, user]));
  // Three reads at a time, no unbounded queue or provider fan-out.
  const [charter, market, posts] = await Promise.all([
    read("charter_supply_submissions", "id,submitted_by,status,submitted_at,normalized_payload->operator->>name,source_identity->>sourceName,source_identity->>sourceUrl"),
    read("market_listings", "id,seller_id,title,status,submitted_at"),
    read("community_posts", "id,author_id,title,status,moderation_status,created_at"),
  ]);
  const [comments, reactions, reports] = await Promise.all([
    read("community_comments", "id,post_id,author_id,status,created_at"),
    read("community_reactions", "post_id,actor_id,created_at"),
    read("community_reports", "id,target_type,target_id,reporter_id,status,created_at"),
  ]);
  const map = (rows: Row[] | null, owner: string, stamp: string): QueueRow[] | null => rows?.map(row => ({
    id: String(row.id ?? ""), owner: String(row[owner] ?? ""), status: String(row.status ?? "RECORDED"),
    publicEligible: row.moderation_status === undefined || row.moderation_status === "APPROVED",
    marker: `${String(row.title ?? row.name ?? "")} ${String(row.sourceName ?? "")} ${String(row.sourceUrl ?? "")}`, at: typeof row[stamp] === "string" ? row[stamp] as string : null,
  })) ?? null;
  const postRows = map(posts, "author_id", "created_at");
  const qaPosts = new Set(postRows?.filter(row => isQaIdentity(owners.get(row.owner) ?? { id: "" }) || QA_MARKER.test(row.marker ?? "")).map(row => row.id));
  const childRows = (rows: Row[] | null, owner: string) => map(rows, owner, "created_at")?.map((row, index) => ({ ...row, qa: qaPosts.has(String(rows![index].post_id)) })) ?? null;
  const commentRows = childRows(comments, "author_id");
  const qaComments = new Set(commentRows?.filter(row => row.qa || isQaIdentity(owners.get(row.owner) ?? { id: "" })).map(row => row.id));
  const reportRows = map(reports, "reporter_id", "created_at")?.map((row, index) => ({ ...row, qa: qaPosts.has(String(reports![index].target_id)) || qaComments.has(String(reports![index].target_id)) })) ?? null;
  const summarize = (rows: QueueRow[] | null, pending: string[], published: string[]) => summarizeQueue(rows, owners, identitiesComplete, pending, published, now);
  const charterSummary = summarize(map(charter, "submitted_by", "submitted_at"), ["SUBMITTED", "REVIEW_REQUIRED"], []);
  // Charter publication still uses the production registry, never APPROVED or promotion candidates.
  charterSummary.public = { total: productionCharterDataset.charters.length, qa: 0, real: productionCharterDataset.charters.length, unclassified: 0 };
  let storage: { state: string; privateBuckets: number | null; publicBuckets: number | null; marketStagingObjects: number | null } = { state: "UNKNOWN", privateBuckets: null, publicBuckets: null, marketStagingObjects: null };
  if (client) {
    try {
      const { data, error } = await client.storage.listBuckets();
      if (!error && data) storage = { ...storage, state: "AVAILABLE", privateBuckets: data.filter(b => !b.public).length, publicBuckets: data.filter(b => b.public).length };
      // Exact metadata count: no image bytes, file paths, URLs or file names are returned.
      const count = await client.schema("storage").from("objects").select("id", { count: "exact", head: true }).eq("bucket_id", "market-listing-staging");
      if (!count.error) storage.marketStagingObjects = count.count;
    } catch { failures.push("storage"); }
  }
  const qa = identities.filter(isQaIdentity);
  const admin = (user: Identity) => ["operations", "charter", "market", "community"].some(role => user.app_metadata?.[`${role}_role`] === `${role}_admin`);
  const active = (user: Identity) => !user.banned_until || Date.parse(user.banned_until) <= now;
  return {
    generatedAt: new Date(now).toISOString(), readLimit: MAX_ROWS, failures,
    auth: { state: identitiesComplete ? "AVAILABLE" : "UNKNOWN", users: identitiesComplete ? identities.length : null,
      qa: identitiesComplete ? qa.length : null, real: identitiesComplete ? identities.length - qa.length : null,
      activeQA: identitiesComplete ? qa.filter(active).length : null, bannedQA: identitiesComplete ? qa.filter(u => !active(u)).length : null,
      activeAdmins: identitiesComplete ? identities.filter(u => active(u) && admin(u)).length : null,
      activeQAAdmins: identitiesComplete ? qa.filter(u => active(u) && admin(u)).length : null },
    charter: charterSummary,
    market: summarize(map(market, "seller_id", "submitted_at"), ["SUBMITTED"], ["ACTIVE"]),
    community: summarize(postRows, ["SUBMITTED"], ["ACTIVE"]),
    reports: summarize(reportRows, ["SUBMITTED"], []),
    comments: commentRows ? split(commentRows, owners, identitiesComplete) : null,
    reactions: reactions ? split(childRows(reactions, "actor_id")!, owners, identitiesComplete) : null,
    storage,
    limitation: "Bounded reads (1000 per table); incomplete tables are UNKNOWN. QA uses trusted identity metadata and explicit record markers. Unclassified owners never become Real KPI. Storage objects can be UNKNOWN when the storage schema is not exposed. Read-only, 60-second per-instance cache.",
  };
}
export type BusinessSummary = Awaited<ReturnType<typeof collectBusinessSummary>>;
