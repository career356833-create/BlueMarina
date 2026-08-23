export const DISPOSABLE_SMOKE_DB_CLEANUP_ORDER = [
  "fish_observation_confirmations",
  "fish_observation_verifications",
  "fish_collection_regions",
  "fish_collections",
  "fish_achievement_events",
  "fish_change_logs",
  "fish_identification_attempts",
  "fish_observation_private_locations",
  "fish_media_upload_sessions",
  "fish_media_cleanup_jobs",
  "fish_media",
  "fish_observations",
  "fish_species_sources",
  "fish_species",
  "fish_source_records",
] as const;

export type DisposableSmokeCleanupTarget = {
  fixtureId: string;
  authUserId: string;
  sourceRecordId: string;
  speciesId: string;
};

export interface DisposableSmokeCleanupRepository {
  /** Idempotently removes fixture rows in DISPOSABLE_SMOKE_DB_CLEANUP_ORDER in one transaction. */
  cleanupInTransaction(target: DisposableSmokeCleanupTarget): Promise<void>;
}
