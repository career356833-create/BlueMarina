export type FishMediaCleanupJobResult = { jobId: string; status: "completed" | "retried" | "dead_lettered" | "skipped"; errorCode?: string };
