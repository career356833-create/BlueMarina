import type { FishRoleSessionRevoker } from "../ports/fish-role-session-revoker";
export async function rotateFishRoleSession(revoker: FishRoleSessionRevoker, targetUserId: string) { await revoker.revokeAllSessions(targetUserId); }
