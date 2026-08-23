import { isFishRole, type FishRoleOrNone } from "../../../domain/fish-authorization/drafts/fish-role";
import type { FishAuthAdminUser, FishRoleSnapshot } from "./types";
import { SupabaseFishRoleError } from "./supabase-fish-role-errors";
export function roleFromAppMetadata(metadata: Record<string, unknown> | null): FishRoleOrNone { const value = metadata?.fish_role; return isFishRole(value) ? value : null; }
export function snapshotFromAuthUser(user: FishAuthAdminUser): FishRoleSnapshot { if (!user.appMetadata || Array.isArray(user.appMetadata)) throw new SupabaseFishRoleError("FISH_ROLE_METADATA_MALFORMED"); return { userId: user.id, role: roleFromAppMetadata(user.appMetadata), identityType: user.identityType, version: user.version }; }
export function metadataWithRole(metadata: Record<string, unknown>, role: FishRoleOrNone) { const next = { ...metadata }; if (role) next.fish_role = role; else delete next.fish_role; return next; }
