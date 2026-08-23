import "server-only";
import type { DisposableAuthAdminProvider } from "../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";
import type { FishSmokeFixtureConfig } from "./disposable-auth-fixture-types";
import { assertDisposableFishSmokeFixtureAllowed } from "./disposable-fixture-safety";

export async function deleteDisposableAuthUser(input: {
  userId: string;
  allowDisposableFixture: boolean;
  config: FishSmokeFixtureConfig;
  provider: DisposableAuthAdminProvider;
}): Promise<void> {
  assertDisposableFishSmokeFixtureAllowed(input.config, input.allowDisposableFixture);
  await input.provider.deleteDisposableUser(input.userId);
}
