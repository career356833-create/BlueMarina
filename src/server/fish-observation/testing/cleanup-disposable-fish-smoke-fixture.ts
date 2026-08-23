import "server-only";
import type { DisposableAuthAdminProvider } from "../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";
import type { DisposableSmokeCleanupRepository } from "../../../domain/fish-observation/testing/ports/disposable-smoke-cleanup-repository";
import type { DisposableFishSmokeFixture, FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";
import { assertDisposableFishSmokeFixtureAllowed, assertDisposableSpeciesIdentity } from "./disposable-fixture-safety";

export async function cleanupDisposableFishSmokeFixture(input: {
  fixture: DisposableFishSmokeFixture;
  allowDisposableFixture: boolean;
  config: FishSmokeFixtureConfig;
  authProvider: DisposableAuthAdminProvider;
  cleanupRepository: DisposableSmokeCleanupRepository;
}): Promise<void> {
  assertDisposableFishSmokeFixtureAllowed(input.config, input.allowDisposableFixture);
  assertDisposableSpeciesIdentity("internal_smoke_test", input.fixture.slug);
  await input.cleanupRepository.cleanupInTransaction(input.fixture);
  await input.authProvider.deleteDisposableUser(input.fixture.authUserId);
}
