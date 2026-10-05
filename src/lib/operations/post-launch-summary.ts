import "server-only";
import controlPlaneData from "@/data/operations/control-plane-v1.json";
import securityAudit from "@/data/operations/security-audit-v1.json";
import aidsData from "@/data/marine-navigation/v3/navigation-aids.json";
import listData from "@/data/marine-navigation/v3/navigation-warning-list.json";
import detailData from "@/data/marine-navigation/v3/navigation-warning-details.json";
import { evaluateAids, evaluateWarnings, type AidStore, type WarningListStore, type WarningDetailStore } from "@/lib/marine-navigation/reliability-v3";
import { collectBusinessSummary } from "./business-summary";
import { ageHours, DATA_REFERENCE, type summarizeRuntime } from "./summary-model";

type ControlPlane = {
  production: null | { checkedAt: string; deploymentId: string; state: string; deployedSha: string | null; mainSha: string | null; deployedAt: string;
    rollback: null | { url: string; sha: string | null; state: string } };
  runtime: null | (ReturnType<typeof summarizeRuntime> & { checkedAt: string; window: string; scope: string });
};
const controlPlane = controlPlaneData as ControlPlane;

export async function collectPostLaunchSummary() {
  const now = Date.now();
  const business = await collectBusinessSummary(now);
  let mainSha: string | null = null;
  try {
    const response = await fetch("https://api.github.com/repos/career356833-create/BlueMarina/commits/main", {
      headers: { Accept: "application/vnd.github.sha", "User-Agent": "BlueMarina-Operations" }, cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    const value = response.ok ? (await response.text()).trim() : "";
    if (/^[a-f0-9]{40}$/.test(value)) mainSha = value;
  } catch { /* A failed main lookup cannot imply a matching deployment. */ }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const deployedSha = sha && /^[a-f0-9]{40}$/.test(sha) ? sha : null;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null;
  const audit = controlPlane.production;
  const sameDeployment = !!deploymentId && deploymentId === audit?.deploymentId;
  const aids = evaluateAids(aidsData as unknown as AidStore, now);
  const warnings = evaluateWarnings(listData as unknown as WarningListStore, detailData as unknown as WarningDetailStore, now);
  return {
    business,
    production: { deploymentId, deployedSha, mainSha, match: mainSha && deployedSha ? mainSha === deployedSha : null,
      state: sameDeployment && audit && (ageHours(audit.checkedAt, now) ?? Infinity) < 1 ? audit.state : "UNKNOWN",
      deployedAt: sameDeployment && audit ? audit.deployedAt : null, lastAudit: audit,
      limitation: "Runtime identity is live; READY and rollback are timestamped control-plane evidence. A new deployment does not inherit the previous READY state. Main SHA uses the public GitHub repository; failed lookup is UNKNOWN." },
    runtime: { evidence: controlPlane.runtime, ageHours: ageHours(controlPlane.runtime?.checkedAt ?? null, now),
      state: controlPlane.runtime ? (ageHours(controlPlane.runtime.checkedAt, now) ?? Infinity) < 1 ? "AVAILABLE" : "STALE" : "UNKNOWN",
      limitation: "Read-only Vercel request-log sample, manually collected. Not total traffic, error rate or session analytics. No auth-event source: successful sessions, auth failures, callback failures and bad_oauth_state remain UNKNOWN." },
    security: { ...securityAudit, ageHours: ageHours(securityAudit.checkedAt, now), state: (ageHours(securityAudit.checkedAt, now) ?? Infinity) < 24 ? "AUDITED" : "STALE" },
    dataIntegrity: { expected: DATA_REFERENCE, observed: securityAudit.dataIntegrity, checkedAt: securityAudit.checkedAt,
      match: Object.entries(DATA_REFERENCE).every(([key, value]) => securityAudit.dataIntegrity[key as keyof typeof DATA_REFERENCE] === value), kind: "AUDITED_REFERENCE_NOT_LIVE_SCAN" },
    navigation: { aidsState: aids.state, validCategories: aids.complete, storedValidatedCategories: aids.present, totalCategories: 9,
      records: aids.items.length, lastSuccessAt: aids.lastSuccessAt, ageHours: ageHours(aids.lastSuccessAt, now),
      warningState: warnings.state, warningLastSuccessAt: warnings.lastSuccessAt, warningAgeHours: ageHours(warnings.lastSuccessAt, now),
      currentWarnings: warnings.state === "CURRENT_STATUS_UNAVAILABLE" ? null : warnings.listItems.length,
      limitation: "Stored validated categories can be stale; present != fresh. Provider failures remain unresolved. A stale warning list is never current. Zero warnings is not SAFE. Navigation Beta does not establish a safe route." },
  };
}
export type PostLaunchSummary = Awaited<ReturnType<typeof collectPostLaunchSummary>>;
