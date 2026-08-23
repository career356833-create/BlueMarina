import "server-only";
import type { FishSupabaseClient, FishSupabaseRow } from "./types";

type QueryResult = { data: unknown; error: { message?: string } | null; count?: number | null };
type QueryBuilder = PromiseLike<QueryResult> & {
  select(columns?: string, options?: { count?: "exact" }): QueryBuilder;
  insert(row: FishSupabaseRow): QueryBuilder;
  update(row: FishSupabaseRow): QueryBuilder;
  delete(options?: { count?: "exact" }): QueryBuilder;
  match(values: FishSupabaseRow): QueryBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
};
export interface SupabaseJsDatabaseClient { from(table: string): QueryBuilder; }

function fail(error: QueryResult["error"]): never { throw new Error(error?.message ? "SUPABASE_DATABASE_OPERATION_FAILED" : "SUPABASE_DATABASE_EMPTY_RESULT"); }

export class SupabaseJsFishClient implements FishSupabaseClient {
  constructor(private readonly client: SupabaseJsDatabaseClient) {}
  async select(table: string, query: FishSupabaseRow) { const result = await this.client.from(table).select("*").match(query); if (result.error) fail(result.error); return Array.isArray(result.data) ? result.data as FishSupabaseRow[] : []; }
  async insert(table: string, row: FishSupabaseRow) { const result = await this.client.from(table).insert(row).select("*").single(); if (result.error || !result.data) fail(result.error); return result.data as FishSupabaseRow; }
  async update(table: string, patch: FishSupabaseRow, match: FishSupabaseRow) { const result = await this.client.from(table).update(patch).match(match).select("*").maybeSingle(); if (result.error) fail(result.error); return result.data ? result.data as FishSupabaseRow : null; }
  async delete(table: string, match: FishSupabaseRow) { const result = await this.client.from(table).delete({ count: "exact" }).match(match); if (result.error) fail(result.error); return result.count ?? 0; }
}
