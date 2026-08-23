import type { FishCleanupQueue } from "../ports/fish-cleanup-queue";
import type { FishMediaCleanupJob } from "../drafts/fish-media-cleanup-contract";
export class InMemoryFishCleanupQueue implements FishCleanupQueue { jobs: FishMediaCleanupJob[] = []; async enqueue(job: FishMediaCleanupJob) { this.jobs.push(job); } }
