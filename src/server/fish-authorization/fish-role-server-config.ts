export type FishRoleServerConfig = { enabled: boolean };
export function readFishRoleServerConfig(env: NodeJS.ProcessEnv = process.env): FishRoleServerConfig { return { enabled: env.FISH_ROLE_MANAGEMENT_ENABLED === "true" }; }
