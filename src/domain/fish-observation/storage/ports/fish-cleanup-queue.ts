import type { FishMediaCleanupJob } from "../drafts/fish-media-cleanup-contract";
export interface FishCleanupQueue { enqueue(job: FishMediaCleanupJob): Promise<void>; }
