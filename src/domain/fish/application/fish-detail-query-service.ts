import type {
  FishDetailMediaSummary,
  FishDetailOfficialSource,
  FishDetailRelatedSpecies,
  FishDetailSeasonSourceStatus,
} from "../../../lib/types/drafts/fish-detail-view-model";
import type { FishDetailSeasonSummary } from "../../../lib/types/drafts/fish-detail-view-model";
import type { FishMedia, FishSourceRecord, FishSourceTextStatus, FishSpecies } from "../../../lib/types/drafts/nifs-fish-contract";
import type { RegulationReadModelBuildResult } from "../../fish-regulation/read-model/types";
import type {
  FishDetailQueryDependencies,
  FishDetailQueryLookupInput,
  FishDetailQueryResolvedData,
  FishDetailQueryService,
} from "./types";

type FishSlugStemSource = "koreanName" | "commonName" | "englishName" | "scientificName" | "internalShortId";

function pickSpeciesDisplayName(species: FishSpecies) {
  return species.koreanName || species.commonName || species.englishName || species.scientificName || species.slug;
}

function buildIdentity(species: FishSpecies, slugAliases: string[]) {
  const stemSource: FishSlugStemSource = species.koreanName
    ? "koreanName"
    : species.commonName
      ? "commonName"
      : species.englishName
        ? "englishName"
        : species.scientificName
          ? "scientificName"
          : "internalShortId";

  return {
    id: species.id,
    slug: species.slug,
    slugPolicy: {
      strategy: "immutable-readable-short-id" as const,
      stemSource,
      immutable: true as const,
      collisionSuffixStrategy: "short-id" as const,
      redirectFromSlugs: slugAliases,
    },
    slugAliases,
    displayName: pickSpeciesDisplayName(species),
    koreanName: species.koreanName,
    commonName: species.commonName,
    englishName: species.englishName,
    scientificName: species.scientificName,
  };
}

function buildQuickFactsSeason(species: FishSpecies): FishDetailSeasonSummary | null {
  if (!species.season) return null;
  return {
    source: "NIFS",
    rawKey: "season",
    periods: [],
    sourceStatus: "present",
    fallbackText: species.season,
  };
}

function buildSourceStatus(value: string | null | undefined): FishSourceTextStatus {
  return value && value.trim() ? "present" : "source_missing";
}

function mapSourceRecord(record: FishSourceRecord): FishDetailOfficialSource {
  return {
    sourceProvider: record.sourceProvider,
    sourceId: record.sourceId,
    sourceName: record.sourceProvider,
    sourceUrl: record.sourceUrl,
    checkedAt: record.fetchedAt,
  };
}

function mapMedia(records: FishMedia[]): FishDetailMediaSummary[] {
  return records.map((record) => ({
    id: record.id,
    fishSpeciesId: record.fishSpeciesId,
    mediaType: record.mediaType,
    sourceUrl: record.sourceUrl,
    storagePath: record.storagePath,
    referencedSourceMediaId: record.referencedSourceMediaId,
    copyrightStatus: record.copyrightStatus,
    usageStatus: record.usageStatus,
    reviewStatus: record.reviewStatus,
  }));
}

function mapOfficialSources(records: FishSourceRecord[]): FishDetailOfficialSource[] {
  const seen = new Set<string>();
  const mapped: FishDetailOfficialSource[] = [];
  for (const record of records) {
    const key = `${record.sourceProvider}:${record.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mapped.push(mapSourceRecord(record));
  }
  return mapped;
}

function mapRelatedSpecies(relations: Array<{
  sourceSpeciesId: string;
  targetSpeciesId: string;
  relationType: FishDetailRelatedSpecies["relationType"];
  reason: string;
  sourceType: FishDetailRelatedSpecies["sourceType"];
  reviewStatus: FishDetailRelatedSpecies["reviewStatus"];
  displayOrder: number;
  targetSpecies: {
    id: string;
    slug?: string | null;
    koreanName: string;
    commonName?: string | null;
    englishName?: string | null;
    scientificName?: string | null;
  };
}>): FishDetailRelatedSpecies[] {
  return [...relations]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((relation) => ({
      speciesId: relation.targetSpeciesId,
      slug: relation.targetSpecies.slug ?? undefined,
      displayName:
        relation.targetSpecies.koreanName ||
        relation.targetSpecies.commonName ||
        relation.targetSpecies.englishName ||
        relation.targetSpecies.scientificName ||
        relation.targetSpecies.slug ||
        relation.targetSpeciesId,
      relationType: relation.relationType,
      reason: relation.reason,
      sourceType: relation.sourceType,
      reviewStatus: relation.reviewStatus,
      displayOrder: relation.displayOrder,
    }));
}

function mergeRegulationBundles(active: RegulationReadModelBuildResult, history: RegulationReadModelBuildResult) {
  const byKey = new Map<string, (typeof active.all)[number]>();
  for (const item of [...active.all, ...history.all]) {
    byKey.set(item.regulationId, item);
  }
  const all = [...byKey.values()].sort((left, right) => {
    if (left.visibility !== right.visibility) {
      const order: Record<"current" | "warning" | "history", number> = { current: 0, warning: 1, history: 2 };
      return order[left.visibility] - order[right.visibility];
    }
    return left.title.localeCompare(right.title);
  });
  return {
    current: all.filter((item) => item.visibility !== "history"),
    history: all.filter((item) => item.visibility === "history"),
    all,
  };
}

function buildAssemblerInput(
  species: FishSpecies,
  resolvedSources: FishSourceRecord[],
  media: FishDetailMediaSummary[],
  relations: FishDetailRelatedSpecies[],
  regulationReadModel: RegulationReadModelBuildResult,
) {
  const seasonSourceStatus: FishDetailSeasonSourceStatus = species.season ? "present" : "source_missing";
  return {
    candidateId: species.id,
    sourceId: species.id,
    identity: buildIdentity(species, []),
    officialFacts: {
      factReviewStatus: species.factReviewStatus,
      publishStatus: species.publishStatus,
      version: species.version,
      sourceRefs: resolvedSources.map((record) => ({
        sourceProvider: record.sourceProvider,
        sourceId: record.sourceId,
      })),
    },
    taxonomy: species.taxonomy ?? null,
    sections: {
      morphology: species.morphology ?? null,
      morphologySummary: species.morphologySummary ?? null,
      morphologySourceStatus: species.morphologySourceStatus ?? buildSourceStatus(species.morphology),
      morphologySourceText: species.morphologySourceText ?? null,
      distinguishingFeatures: species.distinguishingFeatures ?? null,
      featureSummary: species.featureSummary ?? null,
      featureSourceStatus: species.featureSourceStatus ?? buildSourceStatus(species.distinguishingFeatures),
      featureSourceText: species.featureSourceText ?? null,
      habitat: species.habitat ?? null,
      habitatSourceStatus: buildSourceStatus(species.habitat),
      distribution: species.distribution ?? null,
      distributionSourceStatus: buildSourceStatus(species.distribution),
      ecology: species.ecology ?? null,
      ecologySourceStatus: buildSourceStatus(species.ecology),
      spawning: species.spawning ?? null,
      spawningSourceStatus: buildSourceStatus(species.spawning),
      feeding: species.feeding ?? null,
      feedingSourceStatus: buildSourceStatus(species.feeding),
      size: species.size ?? null,
      season: buildQuickFactsSeason(species),
      seasonSourceStatus,
      seasonDisplayText: species.season ?? null,
      seasonFallbackText: species.season ? null : "공식 제철 정보 없음",
      quickFactsSummary: species.koreanName,
    },
    fishingGuide: {
      methods: species.fishingMethods ?? [],
      tips: [],
      cautions: [],
    },
    foodNutrition: species.foodNutrition ?? null,
    aliases: species.aliases ?? [],
    displayCategories: [],
    categoryAssignments: [],
    regulationReadModel,
    media,
    relatedSpecies: relations,
    generatedContents: [],
    officialSources: mapOfficialSources(resolvedSources),
    reviewBadges: [],
  };
}

export function createFishDetailQueryService(dependencies: FishDetailQueryDependencies): FishDetailQueryService {
  async function resolve(input: FishDetailQueryLookupInput): Promise<FishDetailQueryResolvedData | null> {
    let species: FishSpecies | null;
    if ("slug" in input) {
      species = await dependencies.speciesRepository.findBySlug(input.slug as string);
    } else {
      species = await dependencies.speciesRepository.findById(input.speciesId as string);
    }

    if (!species) return null;

    const [sources, media, relations, activeRegulations, historyRegulations] = await Promise.all([
      dependencies.speciesRepository.findSources(species.id),
      dependencies.speciesRepository.findMedia(species.id),
      dependencies.speciesRepository.findRelations(species.id),
      dependencies.regulationRepository.findActiveBySpeciesId(species.id),
      dependencies.regulationRepository.findHistoryBySpeciesId(species.id),
    ]);

    const regulationReadModel = mergeRegulationBundles(
      dependencies.projectRegulationReadModel({
        speciesId: species.id,
        rules: activeRegulations.rules,
        activeVersions: activeRegulations.activeVersions,
        sourceRecords: activeRegulations.sourceRecords,
        allVersions: activeRegulations.allVersions ?? activeRegulations.activeVersions,
        includeHistory: true,
      }),
      dependencies.projectRegulationReadModel({
        speciesId: species.id,
        rules: historyRegulations.rules,
        activeVersions: historyRegulations.activeVersions,
        sourceRecords: historyRegulations.sourceRecords,
        allVersions: historyRegulations.allVersions ?? historyRegulations.activeVersions,
        includeHistory: true,
      }),
    );

    const relatedSpecies = mapRelatedSpecies(relations);
    const mappedMedia = mapMedia(media);
    const assemblerInput = buildAssemblerInput(species, sources, mappedMedia, relatedSpecies, regulationReadModel);
    const viewModel = dependencies.assembleViewModel(assemblerInput);

    return {
      lookup: input,
      species,
      sources,
      media: mappedMedia,
      relations,
      regulationReadModel,
      assemblerInput,
      viewModel,
    };
  }

  return {
    async resolve(input: FishDetailQueryLookupInput) {
      return resolve(input);
    },
    async load(input: FishDetailQueryLookupInput) {
      const resolved = await resolve(input);
      return resolved?.viewModel ?? null;
    },
  };
}
