export function getFishMediaServerConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.FISH_MEDIA_GATEWAY_ENABLED === "true";
  const requestedMode = env.FISH_MEDIA_GATEWAY_MODE;
  return {
    enabled,
    mode: enabled && requestedMode === "live"
      ? "live" as const
      : enabled && requestedMode === "fake"
        ? "fake" as const
        : "disabled" as const,
  };
}
