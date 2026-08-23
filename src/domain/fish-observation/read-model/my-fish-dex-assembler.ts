import type { FishObservationMediaExtension } from "../drafts/fish-media-extension";
import type { FishObservation } from "../drafts/fish-observation";
import type { FishIdentificationVerification } from "../drafts/fish-identification";
import type { FishSpecies } from "../../../lib/types/drafts/nifs-fish-contract";
import { buildFishAchievements } from "./fish-achievement";
import type {
  MyFishDexAssemblerInput,
  MyFishDexBestRecord,
  MyFishDexEntry,
  MyFishDexEntryStatus,
  MyFishDexFavoriteSpecies,
  MyFishDexPhoto,
  MyFishDexRecentDiscovery,
  MyFishDexRegionStat,
  MyFishDexSeasonStat,
  MyFishDexViewModel,
} from "./my-fish-dex-view-model";

type ObservationBucket = {
  observation: FishObservation;
  verification?: FishIdentificationVerification | null;
  media?: FishObservationMediaExtension | null;
};

function pickSpeciesName(species?: FishSpecies | null) {
  if (!species) return "Unknown";
  return species.koreanName || species.commonName || species.englishName || species.scientificName || species.slug;
}

function seasonFromDate(value: string) {
  const month = new Date(value).getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function seasonOrder(season: MyFishDexSeasonStat["season"]) {
  return { spring: 0, summer: 1, autumn: 2, winter: 3 }[season];
}

function rarityFromCount(count: number): MyFishDexEntry["rarity"] {
  if (count <= 1) return "rare";
  if (count <= 3) return "uncommon";
  return "common";
}

function toPhoto(media?: FishObservationMediaExtension | null, capturedAt?: string | null): MyFishDexPhoto | null {
  if (!media) return null;
  return {
    mediaId: media.id ?? null,
    sourceUrl: media.sourceUrl ?? null,
    thumbnailUrl: media.mediaType === "thumbnail" ? media.sourceUrl : media.sourceUrl,
    originType: media.originType,
    privacy: media.privacy,
    capturedAt: capturedAt ?? null,
  };
}

function buildRegionStats(observations: FishObservation[]): MyFishDexRegionStat[] {
  const map = new Map<string, MyFishDexRegionStat & { latestCaughtAt?: string | null }>();
  for (const observation of observations) {
    const regionId = observation.region?.trim() || observation.location?.regionLabel?.trim() || "unknown";
    const current = map.get(regionId) ?? { regionId, count: 0, firstCaughtAt: null, latestCaughtAt: null };
    current.count += 1;
    if (!current.firstCaughtAt || observation.capturedAt < current.firstCaughtAt) current.firstCaughtAt = observation.capturedAt;
    if (!current.latestCaughtAt || observation.capturedAt > current.latestCaughtAt) current.latestCaughtAt = observation.capturedAt;
    map.set(regionId, current);
  }
  return [...map.values()].map((item) => ({
    regionId: item.regionId,
    count: item.count,
    firstCaughtAt: item.firstCaughtAt,
    latestCaughtAt: item.latestCaughtAt,
  })).sort((a, b) => b.count - a.count || a.regionId.localeCompare(b.regionId));
}

function buildSeasonStats(observations: FishObservation[]): MyFishDexSeasonStat[] {
  const map = new Map<MyFishDexSeasonStat["season"], MyFishDexSeasonStat & { latestCaughtAt?: string | null }>();
  for (const observation of observations) {
    const season = seasonFromDate(observation.capturedAt);
    const current = map.get(season) ?? { season, count: 0, firstCaughtAt: null, latestCaughtAt: null };
    current.count += 1;
    if (!current.firstCaughtAt || observation.capturedAt < current.firstCaughtAt) current.firstCaughtAt = observation.capturedAt;
    if (!current.latestCaughtAt || observation.capturedAt > current.latestCaughtAt) current.latestCaughtAt = observation.capturedAt;
    map.set(season, current);
  }
  return [...map.values()]
    .map((item) => ({
      season: item.season,
      count: item.count,
      firstCaughtAt: item.firstCaughtAt,
      latestCaughtAt: item.latestCaughtAt,
    }))
    .sort((a, b) => seasonOrder(a.season) - seasonOrder(b.season));
}

function buildBestRecord(observations: FishObservation[], mediaById: Map<string, FishObservationMediaExtension>) {
  const sorted = [...observations].sort((a, b) => {
    const lengthDiff = (b.length ?? -Infinity) - (a.length ?? -Infinity);
    if (lengthDiff !== 0) return lengthDiff;
    const weightDiff = (b.weight ?? -Infinity) - (a.weight ?? -Infinity);
    if (weightDiff !== 0) return weightDiff;
    return b.capturedAt.localeCompare(a.capturedAt);
  });
  const best = sorted[0];
  if (!best) return null;
  const photo = best.photoMediaId ? toPhoto(mediaById.get(best.photoMediaId), best.capturedAt) : null;
  return {
    observationId: best.id,
    capturedAt: best.capturedAt,
    length: best.length ?? null,
    weight: best.weight ?? null,
    photo,
  } satisfies MyFishDexBestRecord;
}

function buildEntry(
  species: FishSpecies,
  bucket: ObservationBucket[],
  mediaById: Map<string, FishObservationMediaExtension>,
  collection?: NonNullable<MyFishDexAssemblerInput["collections"]>[number] | undefined,
  allowLocked = false,
): MyFishDexEntry | null {
  const verifiedBucket = bucket.filter((item) => item.verification?.verificationType === "user_confirmed" || item.verification?.verificationType === "expert_confirmed");
  const discoverySource = collection ?? null;
  const status: MyFishDexEntryStatus = verifiedBucket.length
    ? "verified"
    : discoverySource
      ? "discovered"
      : "locked";

  if (status === "locked" && !allowLocked) return null;

  const observations = bucket.map((item) => item.observation).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const bestRecord = buildBestRecord(observations, mediaById);
  const firstObservation = observations[0];
  const latestObservation = observations[observations.length - 1];
  const firstPhoto = firstObservation?.photoMediaId ? toPhoto(mediaById.get(firstObservation.photoMediaId), firstObservation.capturedAt) : null;
  const latestPhoto = latestObservation?.photoMediaId ? toPhoto(mediaById.get(latestObservation.photoMediaId), latestObservation.capturedAt) : null;
  const regionStats = buildRegionStats(observations);
  const seasonStats = buildSeasonStats(observations);
  const verification = verifiedBucket[0]?.verification ?? null;

  return {
    speciesId: species.id,
    speciesName: pickSpeciesName(species),
    thumbnail: latestPhoto?.thumbnailUrl ?? firstPhoto?.thumbnailUrl ?? null,
    discoveredAt: collection?.firstDiscoveredAt ?? firstObservation?.capturedAt ?? null,
    discoveryCount: collection?.discoveryCount ?? observations.length,
    firstPhoto,
    latestPhoto,
    bestRecord,
    regions: regionStats,
    seasons: seasonStats,
    rarity: rarityFromCount(collection?.discoveryCount ?? observations.length),
    status,
    verifiedAt: verification?.verifiedAt ?? null,
    verificationType: verification?.verificationType ?? null,
  };
}

function buildAchievements(input: {
  discoveredSpeciesCount: number;
  verifiedSpeciesCount: number;
  regionCount: number;
  bestLength?: number | null;
  bestWeight?: number | null;
  firstDiscoveryAt?: string | null;
  firstVerifiedAt?: string | null;
  now?: string;
}) {
  return buildFishAchievements(input);
}

export function buildMyFishDexViewModel(input: MyFishDexAssemblerInput): MyFishDexViewModel {
  const speciesById = new Map((input.speciesCatalog ?? []).map((species) => [species.id, species] as const));
  const mediaById = new Map((input.media ?? []).filter((media) => media.id).map((media) => [media.id as string, media] as const));
  const observationsBySpecies = new Map<string, FishObservation[]>();
  const verificationBySpecies = new Map<string, FishIdentificationVerification[]>();
  const collectionBySpecies = new Map<string, NonNullable<MyFishDexAssemblerInput["collections"]>[number]>();

  for (const observation of input.observations) {
    if (observation.userId !== input.userId) continue;
    const key = observation.speciesId ?? "unidentified";
    const current = observationsBySpecies.get(key) ?? [];
    current.push(observation);
    observationsBySpecies.set(key, current);
  }

  for (const verification of input.verifications ?? []) {
    const observation = input.observations.find((item) => item.id === verification.observationId && item.userId === input.userId);
    const speciesKey = verification.selectedSpeciesId || observation?.speciesId || "unidentified";
    const current = verificationBySpecies.get(speciesKey) ?? [];
    current.push(verification);
    verificationBySpecies.set(speciesKey, current);
  }

  for (const collection of input.collections ?? []) {
    if (collection.userId !== input.userId) continue;
    collectionBySpecies.set(collection.speciesId, collection);
  }

  const entries: MyFishDexEntry[] = [];

  const catalogSpecies = input.speciesCatalog ?? [];
  for (const species of catalogSpecies) {
    const bucket = observationsBySpecies.get(species.id) ?? [];
    const collection = collectionBySpecies.get(species.id);
    const verificationBucket = verificationBySpecies.get(species.id) ?? [];
    const entry = buildEntry(species, bucket.map((observation) => ({
      observation,
      verification: verificationBucket.find((item) => item.observationId === observation.id) ?? null,
      media: observation.photoMediaId ? mediaById.get(observation.photoMediaId) ?? null : null,
    })), mediaById, collection, true);
    if (entry) entries.push(entry);
  }

  for (const [speciesId, bucket] of observationsBySpecies.entries()) {
    if (speciesId === "unidentified") continue;
    if (entries.some((entry) => entry.speciesId === speciesId)) continue;
    const species = speciesById.get(speciesId);
    if (!species) continue;
    const collection = collectionBySpecies.get(speciesId);
    const verificationBucket = verificationBySpecies.get(speciesId) ?? [];
    const entry = buildEntry(species, bucket.map((observation) => ({
      observation,
      verification: verificationBucket.find((item) => item.observationId === observation.id) ?? null,
      media: observation.photoMediaId ? mediaById.get(observation.photoMediaId) ?? null : null,
    })), mediaById, collection, false);
    if (entry) entries.push(entry);
  }

  entries.sort((left, right) => {
    const statusOrder: Record<MyFishDexEntryStatus, number> = { verified: 0, discovered: 1, locked: 2 };
    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status];
    }
    return (right.discoveryCount - left.discoveryCount) || left.speciesName.localeCompare(right.speciesName);
  });

  const discoveredEntries = entries.filter((entry) => entry.status !== "locked");
  const discoveredSpeciesCount = discoveredEntries.length;
  const verifiedSpeciesCount = entries.filter((entry) => entry.status === "verified").length;
  const totalSpecies = input.catalogSpeciesCount ?? catalogSpecies.length ?? discoveredSpeciesCount;
  const completionRate = totalSpecies > 0 ? Number(((discoveredSpeciesCount / totalSpecies) * 100).toFixed(1)) : 0;
  const regionCount = new Set(discoveredEntries.flatMap((entry) => entry.regions.map((region) => region.regionId))).size;
  const firstDiscoveryAt = discoveredEntries
    .map((entry) => entry.discoveredAt)
    .filter(Boolean)
    .sort()[0] ?? null;
  const firstVerifiedAt = entries
    .flatMap((entry) => entry.verifiedAt ? [entry.verifiedAt] : [])
    .sort()[0] ?? null;
  const bestLength = entries.reduce<number | null>((max, entry) => {
    const candidate = entry.bestRecord?.length ?? null;
    if (candidate === null || candidate === undefined) return max;
    return max === null ? candidate : Math.max(max, candidate);
  }, null);
  const bestWeight = entries.reduce<number | null>((max, entry) => {
    const candidate = entry.bestRecord?.weight ?? null;
    if (candidate === null || candidate === undefined) return max;
    return max === null ? candidate : Math.max(max, candidate);
  }, null);

  const favoriteSpeciesIds = new Set(input.favoriteSpeciesIds ?? []);
  const favoriteSpecies = entries
    .filter((entry) => favoriteSpeciesIds.size === 0 || favoriteSpeciesIds.has(entry.speciesId))
    .slice()
    .sort((left, right) => right.discoveryCount - left.discoveryCount || left.speciesName.localeCompare(right.speciesName))
    .slice(0, 3)
    .map((entry) => ({
      speciesId: entry.speciesId,
      speciesName: entry.speciesName,
      thumbnail: entry.thumbnail ?? null,
      discoveryCount: entry.discoveryCount,
      status: entry.status,
      regions: entry.regions.map((region) => region.regionId),
    })) satisfies MyFishDexFavoriteSpecies[];

  const recentDiscoveries: MyFishDexRecentDiscovery[] = [...discoveredEntries]
    .flatMap((entry) => {
      const bucket = observationsBySpecies.get(entry.speciesId) ?? [];
      return bucket.map((observation) => ({
        observationId: observation.id,
        speciesId: entry.speciesId,
        speciesName: entry.speciesName,
        capturedAt: observation.capturedAt,
        region: observation.region ?? observation.location?.regionLabel ?? null,
        thumbnail: observation.photoMediaId ? mediaById.get(observation.photoMediaId)?.sourceUrl ?? null : entry.thumbnail ?? null,
        status: entry.status,
      }));
    })
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .slice(0, 5);

  const achievements = buildAchievements({
    discoveredSpeciesCount,
    verifiedSpeciesCount,
    regionCount,
    bestLength,
    bestWeight,
    firstDiscoveryAt,
    firstVerifiedAt,
    now: input.now,
  });

  return {
    userId: input.userId,
    summary: {
      totalSpecies,
      discoveredSpecies: discoveredSpeciesCount,
      completionRate,
    },
    entries,
    achievements,
    recentDiscoveries,
    favoriteSpecies,
    generatedAt: input.now ?? new Date().toISOString(),
    catalogSpeciesCount: totalSpecies,
  };
}
