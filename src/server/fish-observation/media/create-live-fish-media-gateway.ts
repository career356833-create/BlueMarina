import "server-only";
import { StorageBackedSharpFishImageProcessor } from "../../../infrastructure/fish-observation/image/storage-backed-sharp-fish-image-processor";
import { SupabaseFishCleanupQueue } from "../../../infrastructure/fish-observation/supabase/supabase-fish-cleanup-queue";
import { SupabaseFishMediaAuditLog } from "../../../infrastructure/fish-observation/supabase/supabase-fish-media-audit-log";
import { SupabaseFishMediaRepository } from "../../../infrastructure/fish-observation/supabase/supabase-fish-media-repository";
import { SupabaseFishObservationAccess } from "../../../infrastructure/fish-observation/supabase/supabase-fish-observation-access";
import { SupabaseFishStorageProvider } from "../../../infrastructure/fish-observation/supabase/supabase-fish-storage-provider";
import type { FishStorageTransport, FishSupabaseClient } from "../../../infrastructure/fish-observation/supabase/types";
import { createFishMediaGateway } from "./create-fish-media-gateway";

export const BLUE_MARINA_STAGING_PROJECT_REF = "mlfvpaikfpjrgrhwlrjn";
export type LiveFishMediaGatewayInput = { database: FishSupabaseClient; storage: FishStorageTransport; environment: string; projectRef: string; env?: NodeJS.ProcessEnv };

export function assertLiveFishMediaGatewayAllowed(input: Pick<LiveFishMediaGatewayInput, "environment" | "projectRef" | "env">) {
  const env = input.env ?? process.env;
  if (input.environment !== "staging") throw new Error("FISH_MEDIA_LIVE_PRODUCTION_BLOCKED");
  if (input.projectRef !== BLUE_MARINA_STAGING_PROJECT_REF) throw new Error("FISH_MEDIA_LIVE_PROJECT_REF_MISMATCH");
  if (env.FISH_MEDIA_GATEWAY_ENABLED !== "true" || env.FISH_MEDIA_LIVE_SMOKE_ENABLED !== "true") throw new Error("FISH_MEDIA_LIVE_SMOKE_DISABLED");
}

export function createLiveFishMediaGateway(input: LiveFishMediaGatewayInput) {
  assertLiveFishMediaGatewayAllowed(input);
  const repository = new SupabaseFishMediaRepository(input.database);
  const storageProvider = new SupabaseFishStorageProvider(input.storage);
  const imageProcessor = new StorageBackedSharpFishImageProcessor(input.storage, input.database);
  const gateway = createFishMediaGateway({ repository, storage: storageProvider, imageProcessor, cleanupQueue: new SupabaseFishCleanupQueue(input.database), observationAccess: new SupabaseFishObservationAccess(input.database), auditLog: new SupabaseFishMediaAuditLog(input.database) }, { ...(input.env ?? process.env), FISH_MEDIA_GATEWAY_MODE: "live" });
  return { gateway, repository, storageProvider, imageProcessor };
}
