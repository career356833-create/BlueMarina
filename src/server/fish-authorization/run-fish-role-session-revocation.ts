import "server-only";
import type { FishRoleRevocationBatchResult } from "../../domain/fish-authorization/worker/fish-role-revocation-result";
import type { FishRoleRevocationClock, FishRoleRevocationQueue } from "../../domain/fish-authorization/worker/types";
import type { FishRoleSessionRevocationWorker } from "../../domain/fish-authorization/worker/fish-role-session-revocation-worker";

export type RunFishRoleSessionRevocationInput = { batchSize: number; workerId: string; maxRuntimeMs: number; dryRun?: boolean };
export type RunFishRoleSessionRevocationDependencies = { enabled?: boolean; queue?: FishRoleRevocationQueue; worker?: FishRoleSessionRevocationWorker; clock?: FishRoleRevocationClock };
export async function runFishRoleSessionRevocation(input: RunFishRoleSessionRevocationInput, deps: RunFishRoleSessionRevocationDependencies = {}): Promise<FishRoleRevocationBatchResult> {
  const dryRun = input.dryRun ?? true; const started = deps.clock?.now() ?? new Date();
  if (!deps.queue) throw new Error("FISH_ROLE_REVOCATION_DEPENDENCY_MISSING");
  if (dryRun) { const candidates = await deps.queue.previewCandidates(input.batchSize, started); return { mode: "dry_run", candidates: candidates.length, claimed: 0, completed: 0, retried: 0, deadLettered: 0, skipped: candidates.length, durationMs: Math.max(0, (deps.clock?.now() ?? new Date()).getTime() - started.getTime()), aborted: false }; }
  if (deps.enabled !== true || !deps.worker) throw new Error("FISH_ROLE_REVOCATION_WORKER_DISABLED");
  return deps.worker.run(input);
}
export function readFishRoleRevocationWorkerEnabled(env: NodeJS.ProcessEnv = process.env) { return env.FISH_ROLE_REVOCATION_WORKER_ENABLED === "true"; }
