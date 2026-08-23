export type FishRoleRevocationBatchResult = {
  mode: "dry_run" | "execute";
  candidates: number;
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
  skipped: number;
  durationMs: number;
  aborted: boolean;
  errorCode?: string;
};
export type FishRoleRevocationJobResult = { outcome: "completed" | "retried" | "dead_lettered" | "skipped"; providerSystemFailure: boolean };
