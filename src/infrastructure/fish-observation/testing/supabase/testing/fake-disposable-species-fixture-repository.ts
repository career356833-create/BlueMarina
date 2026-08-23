import type { DisposableSpeciesFixtureInput, DisposableSpeciesFixtureRepository } from "../../../../../domain/fish-observation/testing/ports/disposable-species-fixture-repository";
import type { DisposableSmokeCleanupRepository, DisposableSmokeCleanupTarget } from "../../../../../domain/fish-observation/testing/ports/disposable-smoke-cleanup-repository";

export class FakeDisposableSpeciesFixtureRepository
  implements DisposableSpeciesFixtureRepository, DisposableSmokeCleanupRepository
{
  readonly fixtures = new Map<string, DisposableSpeciesFixtureInput>();
  cleanupCalls = 0;
  failCleanupCount = 0;

  async createInTransaction(input: DisposableSpeciesFixtureInput) {
    if (input.sourceProvider !== "internal_smoke_test") throw new Error("FAKE_NIFS_PROVIDER_BLOCKED");
    this.fixtures.set(input.fixtureId, input);
    return { sourceRecordId: `source-${input.sourceId}`, speciesId: `species-${input.fixtureId}` };
  }

  async cleanupInTransaction(target: DisposableSmokeCleanupTarget): Promise<void> {
    this.cleanupCalls += 1;
    if (this.failCleanupCount > 0) {
      this.failCleanupCount -= 1;
      throw new Error("FAKE_DB_CLEANUP_FAILED");
    }
    this.fixtures.delete(target.fixtureId);
  }
}
