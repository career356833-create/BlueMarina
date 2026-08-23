import "server-only";
import type { DisposableAuthAdminProvider } from "../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";
import type { DisposableSmokeCleanupRepository } from "../../../domain/fish-observation/testing/ports/disposable-smoke-cleanup-repository";
import type { DisposableSpeciesFixtureRepository } from "../../../domain/fish-observation/testing/ports/disposable-species-fixture-repository";
import type { DisposableFishSmokeFixture, FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";
import { cleanupDisposableFishSmokeFixture } from "./cleanup-disposable-fish-smoke-fixture";
import { createDisposableFishSmokeFixture } from "./create-disposable-fish-smoke-fixture";

export async function withDisposableFishSmokeFixture<T>(input: {
  allowDisposableFixture: boolean;
  config: FishSmokeFixtureConfig;
  authProvider: DisposableAuthAdminProvider;
  speciesRepository: DisposableSpeciesFixtureRepository;
  cleanupRepository: DisposableSmokeCleanupRepository;
  run: (fixture: DisposableFishSmokeFixture) => Promise<T>;
  createId?: () => string;
  now?: () => string;
}): Promise<T> {
  const fixture = await createDisposableFishSmokeFixture(input);
  try {
    return await input.run(fixture);
  } finally {
    await cleanupDisposableFishSmokeFixture({
      fixture,
      allowDisposableFixture: input.allowDisposableFixture,
      config: input.config,
      authProvider: input.authProvider,
      cleanupRepository: input.cleanupRepository,
    });
  }
}
