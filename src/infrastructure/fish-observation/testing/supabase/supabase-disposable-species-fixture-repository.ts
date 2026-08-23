import "server-only";
import { createHash } from "node:crypto";
import type {
  DisposableSpeciesFixtureInput,
  DisposableSpeciesFixtureRepository,
  DisposableSpeciesFixtureResult,
} from "../../../../domain/fish-observation/testing/ports/disposable-species-fixture-repository";
import type {
  DisposableSmokeCleanupRepository,
  DisposableSmokeCleanupTarget,
} from "../../../../domain/fish-observation/testing/ports/disposable-smoke-cleanup-repository";

export interface DisposableFixtureTransactionClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
}

export interface DisposableFixtureTransactionExecutor {
  transaction<T>(work: (client: DisposableFixtureTransactionClient) => Promise<T>): Promise<T>;
}

function requireId(row: Record<string, unknown> | undefined, code: string): string {
  if (typeof row?.id !== "string") throw new Error(code);
  return row.id;
}

export class SupabaseDisposableSpeciesFixtureRepository
  implements DisposableSpeciesFixtureRepository, DisposableSmokeCleanupRepository
{
  constructor(private readonly executor?: DisposableFixtureTransactionExecutor) {}

  async createInTransaction(input: DisposableSpeciesFixtureInput): Promise<DisposableSpeciesFixtureResult> {
    if (!this.executor) throw new Error("FISH_SMOKE_TRANSACTION_EXECUTOR_MISSING");
    if (input.sourceProvider !== "internal_smoke_test" || !input.slug.startsWith("smoke-test-")) {
      throw new Error("FISH_SMOKE_SPECIES_IDENTITY_BLOCKED");
    }
    const contentHash = createHash("sha256").update(`${input.fixtureId}:${input.sourceId}`).digest("hex");
    return this.executor.transaction(async (client) => {
      const source = await client.query<{ id: string }>(
        `insert into public.fish_source_records
          (source_provider, source_id, source_url, raw_payload_summary, content_hash, parser_version,
           crawl_status, fetched_at, last_seen_at, is_current)
         values ($1, $2, $3, $4::jsonb, $5, 'smoke-fixture-v1', 'complete', $6::timestamptz, $6::timestamptz, true)
         returning id`,
        [input.sourceProvider, input.sourceId, `urn:blue-marina:smoke-fixture:${input.sourceId}`, JSON.stringify(input.marker), contentHash, input.createdAt],
      );
      const sourceRecordId = requireId(source.rows[0], "FISH_SMOKE_SOURCE_CREATE_FAILED");
      const species = await client.query<{ id: string }>(
        `insert into public.fish_species
          (slug, korean_name, scientific_name, official_facts, fact_review_status, publish_status)
         values ($1, $2, $3, $4::jsonb, $5, $6)
         returning id`,
        [input.slug, input.koreanName, input.scientificName, JSON.stringify(input.marker), input.factReviewStatus, input.publishStatus],
      );
      const speciesId = requireId(species.rows[0], "FISH_SMOKE_SPECIES_CREATE_FAILED");
      await client.query(
        `insert into public.fish_species_sources
          (fish_species_id, source_record_id, is_primary, field_precedence, linked_by)
         values ($1, $2, true, '{}'::jsonb, 'manual')`,
        [speciesId, sourceRecordId],
      );
      return { sourceRecordId, speciesId };
    });
  }

  async cleanupInTransaction(target: DisposableSmokeCleanupTarget): Promise<void> {
    if (!this.executor) throw new Error("FISH_SMOKE_TRANSACTION_EXECUTOR_MISSING");
    await this.executor.transaction(async (client) => {
      const observations = `select id from public.fish_observations where user_id=$1 or species_id=$2`;
      await client.query(`delete from public.fish_observation_confirmations where observation_id in (${observations})`, [target.authUserId, target.speciesId]);
      await client.query(`delete from public.fish_observation_verifications where observation_id in (${observations}) or selected_species_id=$2`, [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_collection_regions where user_id=$1 and species_id=$2", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_collections where user_id=$1 and species_id=$2", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_achievement_events where user_id=$1 or species_id=$2", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_change_logs where entity_id in ($1::uuid,$2::uuid) or source_record_id=$1", [target.sourceRecordId, target.speciesId]);
      await client.query(`delete from public.fish_identification_attempts where observation_id in (${observations})`, [target.authUserId, target.speciesId]);
      await client.query(`delete from public.fish_observation_private_locations where observation_id in (${observations})`, [target.authUserId, target.speciesId]);
      await client.query(`delete from public.fish_media_upload_sessions where user_id=$1 or observation_id in (${observations})`, [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_media_cleanup_jobs where media_id in (select id from public.fish_media where user_id=$1 or fish_species_id=$2)", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_media where user_id=$1 or fish_species_id=$2", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_observations where user_id=$1 or species_id=$2", [target.authUserId, target.speciesId]);
      await client.query("delete from public.fish_species_sources where fish_species_id=$1 and source_record_id=$2", [target.speciesId, target.sourceRecordId]);
      await client.query("delete from public.fish_species where id=$1 and slug like 'smoke-test-%'", [target.speciesId]);
      await client.query("delete from public.fish_source_records where id=$1 and source_provider='internal_smoke_test'", [target.sourceRecordId]);
    });
  }
}
