import "server-only";
import type { FishRoleApprovalReconciliationBatchResult } from "../../domain/fish-authorization/approval/worker/index";
import type { FishRoleApprovalReconciliationInventory, FishRoleApprovalReconciliationWorkerDependencies } from "../../domain/fish-authorization/approval/worker/index";
import type { FishRoleApprovalReconciliationWorker } from "../../domain/fish-authorization/approval/worker/index";
import { FishRoleApprovalReconciliationWorker as FishRoleApprovalReconciliationWorkerImpl } from "../../domain/fish-authorization/approval/worker/index";

export type RunFishRoleApprovalReconciliationInput = {
  batchSize: number;
  workerId: string;
  maxRuntimeMs: number;
  dryRun?: boolean;
  inventory: FishRoleApprovalReconciliationInventory;
};

export type RunFishRoleApprovalReconciliationDependencies = {
  enabled?: boolean;
  worker?: FishRoleApprovalReconciliationWorker;
  audit?: FishRoleApprovalReconciliationWorkerDependencies["audit"];
  clock?: FishRoleApprovalReconciliationWorkerDependencies["clock"];
  writer?: FishRoleApprovalReconciliationWorkerDependencies["writer"];
};

export async function runFishRoleApprovalReconciliation(input: RunFishRoleApprovalReconciliationInput, deps: RunFishRoleApprovalReconciliationDependencies = {}): Promise<FishRoleApprovalReconciliationBatchResult> {
  const dryRun = input.dryRun ?? true;
  if (dryRun) {
    if (!deps.audit || !deps.clock) throw new Error("FISH_ROLE_APPROVAL_RECONCILIATION_DEPENDENCY_MISSING");
    const worker = deps.worker ?? new FishRoleApprovalReconciliationWorkerImpl({ audit: deps.audit, clock: deps.clock });
    return worker.run({ batchSize: input.batchSize, workerId: input.workerId, maxRuntimeMs: input.maxRuntimeMs, dryRun: true }, input.inventory);
  }
  if (deps.enabled !== true) throw new Error("FISH_ROLE_APPROVAL_RECONCILIATION_DISABLED");
  if (!deps.audit || !deps.clock) throw new Error("FISH_ROLE_APPROVAL_RECONCILIATION_DEPENDENCY_MISSING");
  const worker = deps.worker ?? new FishRoleApprovalReconciliationWorkerImpl({ audit: deps.audit, clock: deps.clock, writer: deps.writer });
  return worker.run({ batchSize: input.batchSize, workerId: input.workerId, maxRuntimeMs: input.maxRuntimeMs, dryRun: false }, input.inventory);
}

export function readFishRoleApprovalReconciliationWorkerEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.FISH_ROLE_APPROVAL_RECONCILIATION_ENABLED === "true";
}
