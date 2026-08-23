import "server-only";
import type { DisposableAuthAdminProvider } from "../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";
import type { FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";
import { assertDisposableFishSmokeFixtureAllowed } from "./disposable-fixture-safety";

export async function createDisposableAuthUser(input: {
  fixtureId: string;
  allowDisposableFixture: boolean;
  config: FishSmokeFixtureConfig;
  provider: DisposableAuthAdminProvider;
}): Promise<{ userId: string }> {
  assertDisposableFishSmokeFixtureAllowed(input.config, input.allowDisposableFixture);
  return input.provider.createDisposableUser({
    fixtureId: input.fixtureId,
    purpose: "confirm_fish_observation_functional_smoke",
  });
}
