import "server-only";
import { randomUUID } from "node:crypto";
import type { DisposableAuthAdminProvider } from "../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";
import type { DisposableSpeciesFixtureRepository } from "../../../domain/fish-observation/testing/ports/disposable-species-fixture-repository";
import type { DisposableFishSmokeFixture, FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";
import { createDisposableAuthUser } from "./create-disposable-auth-user";
import { assertDisposableFishSmokeFixtureAllowed, assertDisposableSpeciesIdentity } from "./disposable-fixture-safety";

export async function createDisposableFishSmokeFixture(input: {
  allowDisposableFixture: boolean;
  config: FishSmokeFixtureConfig;
  authProvider: DisposableAuthAdminProvider;
  speciesRepository: DisposableSpeciesFixtureRepository;
  createId?: () => string;
  now?: () => string;
}): Promise<DisposableFishSmokeFixture> {
  assertDisposableFishSmokeFixtureAllowed(input.config, input.allowDisposableFixture);
  const createId = input.createId ?? randomUUID;
  const fixtureId = createId();
  const sourceId = createId();
  const slug = `smoke-test-${fixtureId.replaceAll("-", "").slice(0, 8).toLowerCase()}`;
  const createdAt = (input.now ?? (() => new Date().toISOString()))();
  assertDisposableSpeciesIdentity("internal_smoke_test", slug);

  const auth = await createDisposableAuthUser({
    fixtureId,
    allowDisposableFixture: input.allowDisposableFixture,
    config: input.config,
    provider: input.authProvider,
  });

  try {
    const species = await input.speciesRepository.createInTransaction({
      fixtureId,
      sourceProvider: "internal_smoke_test",
      sourceId,
      koreanName: "스모크테스트어종",
      scientificName: "Smokeus testensis",
      slug,
      factReviewStatus: "approved",
      publishStatus: "published",
      marker: { isTestFixture: true, purpose: "confirm_fish_observation_functional_smoke" },
      createdAt,
    });
    return { fixtureId, authUserId: auth.userId, ...species, slug, createdAt };
  } catch (error) {
    await input.authProvider.deleteDisposableUser(auth.userId).catch(() => undefined);
    throw error;
  }
}
