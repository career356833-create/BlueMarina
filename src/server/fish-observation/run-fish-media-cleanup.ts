import type { FishMediaCleanupWorker } from "../../domain/fish-observation/storage/worker/fish-media-cleanup-worker";
export async function runFishMediaCleanup(worker: FishMediaCleanupWorker, input: { batchSize: number; workerId: string; maxRuntimeMs: number; dryRun?: boolean }) { return worker.run({ ...input, dryRun: input.dryRun ?? true }); }
