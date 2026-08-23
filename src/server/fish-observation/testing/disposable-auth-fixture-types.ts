export const FISH_SMOKE_STAGING_PROJECT_REF = "mlfvpaikfpjrgrhwlrjn";

export type FishSmokeFixtureConfig = {
  enabled: boolean;
  environment: string;
  projectRef: string;
  targetUrl?: string;
};

export type DisposableFixtureAuthorization = {
  allowDisposableFixture: true;
};

export type DisposableFishSmokeFixture = {
  fixtureId: string;
  authUserId: string;
  sourceRecordId: string;
  speciesId: string;
  slug: string;
  createdAt: string;
};

export function getFishSmokeFixtureConfig(env: NodeJS.ProcessEnv = process.env): FishSmokeFixtureConfig {
  return {
    enabled: env.FISH_SMOKE_AUTH_FIXTURE_ENABLED === "true",
    environment: env.FISH_SMOKE_AUTH_ENVIRONMENT ?? "",
    projectRef: env.FISH_SMOKE_AUTH_PROJECT_REF ?? "",
  };
}
