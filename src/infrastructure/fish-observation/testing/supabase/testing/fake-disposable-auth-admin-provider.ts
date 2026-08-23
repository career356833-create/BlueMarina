import type { DisposableAuthAdminProvider, DisposableAuthUserMarker } from "../../../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";

export class FakeDisposableAuthAdminProvider implements DisposableAuthAdminProvider {
  readonly users = new Map<string, DisposableAuthUserMarker>();
  createCalls = 0;
  deleteCalls = 0;
  failDeleteCount = 0;

  async createDisposableUser(marker: DisposableAuthUserMarker): Promise<{ userId: string }> {
    this.createCalls += 1;
    const userId = `auth-fixture-${marker.fixtureId}`;
    this.users.set(userId, marker);
    return { userId };
  }

  async deleteDisposableUser(userId: string): Promise<void> {
    this.deleteCalls += 1;
    if (this.failDeleteCount > 0) {
      this.failDeleteCount -= 1;
      throw new Error("FAKE_AUTH_DELETE_FAILED");
    }
    this.users.delete(userId);
  }
}
