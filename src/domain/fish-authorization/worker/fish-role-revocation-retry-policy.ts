import type { FishRoleRevocationPriority } from "./types";
export const DEFAULT_FISH_ROLE_REVOCATION_MAX_ATTEMPTS = 5;
const normalBackoffMs = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
const criticalBackoffMs = [15_000, 60_000, 300_000, 1_800_000, 7_200_000];
export function fishRoleRevocationBackoffMs(attemptNumber: number, priority: FishRoleRevocationPriority): number {
  const schedule = priority === "critical" ? criticalBackoffMs : normalBackoffMs;
  return schedule[Math.max(0, Math.min(schedule.length - 1, attemptNumber - 1))];
}
export function shouldDeadLetterFishRoleRevocation(attemptNumber: number, retryable: boolean, maxAttempts = DEFAULT_FISH_ROLE_REVOCATION_MAX_ATTEMPTS) {
  return !retryable || attemptNumber >= maxAttempts;
}
