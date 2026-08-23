import { FISH_SMOKE_STAGING_PROJECT_REF, type FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";

export class DisposableFishSmokeFixtureSafetyError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "DisposableFishSmokeFixtureSafetyError";
  }
}

function projectRefFromUrl(value: string): string | null {
  try {
    const host = new URL(value).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_TARGET_URL_INVALID");
  }
}

export function assertDisposableFishSmokeFixtureAllowed(
  config: FishSmokeFixtureConfig,
  allowDisposableFixture: boolean,
): void {
  if (!config.enabled) throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_FIXTURE_DISABLED");
  if (!allowDisposableFixture) throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_EXPLICIT_ALLOW_REQUIRED");
  if (config.environment !== "staging") throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_STAGING_ONLY");
  if (config.projectRef !== FISH_SMOKE_STAGING_PROJECT_REF) {
    throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_PROJECT_REF_MISMATCH");
  }
  if (config.targetUrl) {
    const urlProjectRef = projectRefFromUrl(config.targetUrl);
    if (urlProjectRef !== FISH_SMOKE_STAGING_PROJECT_REF) {
      throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_PRODUCTION_OR_FOREIGN_URL_BLOCKED");
    }
  }
}

export function assertDisposableSpeciesIdentity(sourceProvider: string, slug: string): void {
  if (sourceProvider !== "internal_smoke_test") {
    throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_SOURCE_PROVIDER_BLOCKED");
  }
  if (!/^smoke-test-[a-f0-9]{8}$/.test(slug)) {
    throw new DisposableFishSmokeFixtureSafetyError("FISH_SMOKE_SLUG_INVALID");
  }
}
