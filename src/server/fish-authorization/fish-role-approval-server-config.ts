export type FishRoleApprovalServerConfig = { enabled: boolean };
export function readFishRoleApprovalServerConfig(env: NodeJS.ProcessEnv = process.env): FishRoleApprovalServerConfig { return { enabled: env.FISH_ROLE_APPROVAL_VERIFIER_ENABLED === "true" }; }
