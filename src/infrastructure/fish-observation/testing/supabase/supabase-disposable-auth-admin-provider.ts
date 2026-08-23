import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { DisposableAuthAdminProvider, DisposableAuthUserMarker } from "../../../../domain/fish-observation/testing/ports/disposable-auth-admin-provider";

type SupabaseAdminResult<T> = { data: T; error: { code?: string; message?: string } | null };

export interface SupabaseDisposableAuthAdminClient {
  auth: {
    admin: {
      createUser(attributes: {
        email: string;
        password: string;
        email_confirm: boolean;
        app_metadata: Record<string, unknown>;
      }): Promise<SupabaseAdminResult<{ user: { id: string } | null }>>;
      deleteUser(userId: string): Promise<SupabaseAdminResult<Record<string, unknown>>>;
    };
  };
}

export class SupabaseDisposableAuthAdminProvider implements DisposableAuthAdminProvider {
  constructor(private readonly client?: SupabaseDisposableAuthAdminClient) {}

  async createDisposableUser(marker: DisposableAuthUserMarker): Promise<{ userId: string }> {
    if (!this.client) throw new Error("FISH_SMOKE_AUTH_ADMIN_CLIENT_MISSING");
    const identifier = randomUUID();
    const result = await this.client.auth.admin.createUser({
      email: `fish-smoke-${identifier}@example.invalid`,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      app_metadata: { fish_smoke_fixture: true, ...marker },
    });
    if (result.error || !result.data.user) throw new Error("FISH_SMOKE_AUTH_CREATE_FAILED");
    return { userId: result.data.user.id };
  }

  async deleteDisposableUser(userId: string): Promise<void> {
    if (!this.client) throw new Error("FISH_SMOKE_AUTH_ADMIN_CLIENT_MISSING");
    const result = await this.client.auth.admin.deleteUser(userId);
    if (result.error && result.error.code !== "user_not_found") throw new Error("FISH_SMOKE_AUTH_DELETE_FAILED");
  }
}
