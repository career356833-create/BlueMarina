/** Existing public GitHub/Vercel deployment integration; no new control-plane credential. */
const REPOSITORY_API = "https://api.github.com/repos/career356833-create/BlueMarina";
export async function readProductionStatus(sha: string | null, deploymentHost: string | undefined, fetcher: typeof fetch = fetch) {
  const unknown = { state: "UNKNOWN", deployedAt: null as string | null, evidence: "UNVERIFIED", checkedAt: new Date().toISOString() };
  if (!sha || !/^[a-f0-9]{40}$/.test(sha) || !deploymentHost || !/^[a-z0-9-]+\.vercel\.app$/i.test(deploymentHost)) return unknown;
  const options: RequestInit = { headers: { "User-Agent": "BlueMarina-Operations", Accept: "application/vnd.github+json" }, cache: "no-store", signal: AbortSignal.timeout(4000) };
  try {
    const response = await fetcher(`${REPOSITORY_API}/deployments?environment=Production&sha=${sha}&per_page=5`, options);
    if (!response.ok) return unknown;
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) return unknown;
    const deployment = rows.find(row => row.sha === sha && row.environment === "Production" && Number.isSafeInteger(row.id));
    if (!deployment) return unknown;
    // Construct from an integer ID; never fetch a URL supplied by repository content.
    const statuses = await fetcher(`${REPOSITORY_API}/deployments/${deployment.id}/statuses?per_page=1`, options);
    if (!statuses.ok) return unknown;
    const values: unknown = await statuses.json();
    const status = Array.isArray(values) ? values[0] : null;
    if (!status || status.environment !== "Production" || typeof status.environment_url !== "string") return unknown;
    const url = new URL(status.environment_url);
    if (url.origin !== `https://${deploymentHost}` || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return unknown;
    const state = status.state === "success" ? "READY" : ["failure", "error"].includes(status.state) ? "ERROR" : ["pending", "in_progress", "queued"].includes(status.state) ? "BUILDING" : "UNKNOWN";
    return { state, deployedAt: state === "READY" && typeof status.created_at === "string" && Number.isFinite(Date.parse(status.created_at)) ? status.created_at : null,
      evidence: "GITHUB_VERCEL_PRODUCTION_SHA_AND_URL_MATCH", checkedAt: new Date().toISOString() };
  } catch { return unknown; }
}
