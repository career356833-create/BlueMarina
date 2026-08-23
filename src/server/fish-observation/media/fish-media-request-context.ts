export type FishMediaRequestContext = { actorUserId: string; authRole: "user" | "admin"; fishRole?: "fish_reviewer" | "fish_admin" | "fish_crawler"; requestId: string; };
