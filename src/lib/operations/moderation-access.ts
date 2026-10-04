export type ModerationDomain = "charter" | "market" | "community";
export type ModerationRole = {
  operations: boolean;
  charter: boolean;
  market: boolean;
  community: boolean;
};

export function moderationRoles(metadata: Record<string, unknown> | undefined): ModerationRole {
  return {
    operations: metadata?.operations_role === "operations_admin",
    charter: metadata?.charter_role === "charter_admin",
    market: metadata?.market_role === "market_admin",
    community: metadata?.community_role === "community_admin",
  };
}

export function canReadModeration(roles: ModerationRole, domain: ModerationDomain): boolean {
  return roles.operations || roles[domain];
}

export function canActModeration(roles: ModerationRole, domain: ModerationDomain): boolean {
  return roles[domain];
}

export function canAccessAdminPath(pathname: string, metadata: Record<string, unknown> | undefined): boolean {
  const roles = moderationRoles(metadata);
  if (pathname === "/admin/operations/moderation" || pathname.startsWith("/admin/operations/moderation/")) {
    return Object.values(roles).some(Boolean);
  }
  return roles.operations;
}
