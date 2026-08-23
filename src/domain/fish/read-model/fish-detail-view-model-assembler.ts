import type { FishDetailViewModel } from "../../../lib/types/drafts/fish-detail-view-model";
import type {
  FishDetailSectionKey,
  FishDetailSectionState,
  FishDetailViewModelAssemblerInput,
  FishDetailViewModelAssemblyPreview,
} from "./types";

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isArrayWithItems<T>(value: T[] | undefined | null): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

function sectionStateFromText(value: string | null | undefined, sourceStatus?: "present" | "source_missing" | undefined): FishDetailSectionState {
  if (isText(value)) {
    return { status: "available", sourceStatus: sourceStatus ?? "present" };
  }
  if (sourceStatus === "source_missing") {
    return { status: "source_missing", sourceStatus };
  }
  return { status: "empty", sourceStatus };
}

function sectionStateFromArray<T>(items: T[] | undefined | null, sourceStatus?: "present" | "source_missing" | undefined): FishDetailSectionState {
  if (isArrayWithItems(items)) {
    return { status: "available", sourceStatus: sourceStatus ?? "present", count: items.length };
  }
  if (sourceStatus === "source_missing") {
    return { status: "source_missing", sourceStatus, count: 0 };
  }
  return { status: "empty", sourceStatus, count: 0 };
}

function deriveReviewBadges(input: FishDetailViewModelAssemblerInput, sectionStates: Record<FishDetailSectionKey, FishDetailSectionState>) {
  const badges = [...(input.reviewBadges ?? [])];
  if (sectionStates.taxonomy.status === "source_missing") {
    badges.push({ key: "taxonomy-missing", label: "taxonomy missing", tone: "warning", detail: "공식 분류 정보가 아직 없습니다." });
  }
  if (sectionStates.feeding.status === "source_missing") {
    badges.push({ key: "feeding-missing", label: "feeding source missing", tone: "info", detail: "먹이 정보 원문이 아직 없습니다." });
  }
  if (input.sections.seasonSourceStatus === "source_missing") {
    badges.push({ key: "season-missing", label: "season source missing", tone: "warning", detail: "공식 제철 정보가 없습니다." });
  }
  if (sectionStates.regulations.count && sectionStates.regulations.count > 0) {
    badges.push({ key: "regulations-current", label: "regulation available", tone: "approved", detail: "현재 적용 규정이 있습니다." });
  }
  return badges;
}

function defaultSeoTitle(displayName: string) {
  return `${displayName} | Blue Marina`;
}

function defaultSeoDescription(displayName: string) {
  return `${displayName} 공식 어종 정보와 읽기 모델 미리보기`;
}

function deriveSeoMetadata(input: FishDetailViewModelAssemblerInput) {
  if (input.seoMetadata) return input.seoMetadata;
  return {
    title: defaultSeoTitle(input.identity.displayName),
    description: defaultSeoDescription(input.identity.displayName),
    canonicalUrl: `/fish/${input.identity.slug}`,
    ogTitle: defaultSeoTitle(input.identity.displayName),
    ogDescription: defaultSeoDescription(input.identity.displayName),
    keywords: [input.identity.koreanName, input.identity.englishName, input.identity.scientificName].filter(Boolean) as string[],
  };
}

function derivePublishMetadata(input: FishDetailViewModelAssemblerInput) {
  if (input.publishMetadata) return input.publishMetadata;
  return {
    factReviewStatus: input.officialFacts.factReviewStatus,
    publishStatus: input.officialFacts.publishStatus,
    version: input.officialFacts.version,
    updatedAt: input.officialFacts.lastReviewedAt,
  };
}

export function buildFishDetailViewModel(input: FishDetailViewModelAssemblerInput): FishDetailViewModel {
  const regulations = input.regulationReadModel?.current ?? [];
  return {
    identity: input.identity,
    taxonomy: input.taxonomy ?? null,
    officialFacts: input.officialFacts,
    quickFacts: {
      summary: input.sections.quickFactsSummary ?? undefined,
      season: input.sections.season ?? null,
      seasonSourceStatus: input.sections.seasonSourceStatus,
      seasonDisplayText: input.sections.seasonDisplayText ?? undefined,
      seasonFallbackText: input.sections.seasonFallbackText ?? undefined,
      habitat: input.sections.habitat ?? undefined,
      size: input.sections.size ?? undefined,
      fishingMethods: input.fishingGuide?.methods ?? [],
    },
    morphology: input.sections.morphology ?? null,
    morphologySummary: input.sections.morphologySummary ?? null,
    morphologySourceStatus: input.sections.morphologySourceStatus,
    morphologySourceText: input.sections.morphologySourceText ?? null,
    distinguishingFeatures: input.sections.distinguishingFeatures ?? null,
    featureSummary: input.sections.featureSummary ?? null,
    featureSourceStatus: input.sections.featureSourceStatus,
    featureSourceText: input.sections.featureSourceText ?? null,
    habitat: input.sections.habitat ?? undefined,
    distribution: input.sections.distribution ?? undefined,
    ecology: input.sections.ecology ?? undefined,
    spawning: input.sections.spawning ?? undefined,
    feeding: input.sections.feeding ?? undefined,
    size: input.sections.size ?? undefined,
    season: input.sections.seasonDisplayText ?? input.sections.seasonFallbackText ?? undefined,
    fishingGuide: input.fishingGuide ?? { methods: [], tips: [], cautions: [] },
    foodNutrition: input.foodNutrition ?? undefined,
    aliases: input.aliases ?? [],
    displayCategories: input.displayCategories ?? [],
    categoryAssignments: input.categoryAssignments ?? [],
    regulations,
    media: input.media ?? [],
    relatedSpecies: input.relatedSpecies ?? [],
    generatedContents: input.generatedContents ?? [],
    officialSources: input.officialSources ?? [],
    reviewBadges: deriveReviewBadges(input, buildSectionStates(input).sectionStates),
    publishMetadata: derivePublishMetadata(input),
    seoMetadata: deriveSeoMetadata(input),
  };
}

export function buildSectionStates(input: FishDetailViewModelAssemblerInput) {
  const regulationsCurrent = input.regulationReadModel?.current ?? [];
  const regulationsHistory = input.regulationReadModel?.history ?? [];
  const sectionStates: Record<FishDetailSectionKey, FishDetailSectionState> = {
    identity: { status: "available", sourceStatus: "present" },
    officialFacts: { status: "available", sourceStatus: "present" },
    taxonomy: input.taxonomy ? { status: "available", sourceStatus: "present" } : { status: "source_missing", sourceStatus: "source_missing" },
    morphology: input.sections.morphologySourceStatus === "source_missing"
      ? { status: "source_missing", sourceStatus: "source_missing" }
      : sectionStateFromText(input.sections.morphology, input.sections.morphologySourceStatus ?? (isText(input.sections.morphology) ? "present" : undefined)).status === "available"
        ? { status: "available", sourceStatus: input.sections.morphologySourceStatus ?? "present" }
        : { status: "empty", sourceStatus: input.sections.morphologySourceStatus },
    habitat: sectionStateFromText(input.sections.habitat, input.sections.habitatSourceStatus ?? (isText(input.sections.habitat) ? "present" : undefined)),
    distribution: sectionStateFromText(input.sections.distribution, input.sections.distributionSourceStatus ?? (isText(input.sections.distribution) ? "present" : undefined)),
    ecology: sectionStateFromText(input.sections.ecology, input.sections.ecologySourceStatus ?? (isText(input.sections.ecology) ? "present" : undefined)),
    spawning: sectionStateFromText(input.sections.spawning, input.sections.spawningSourceStatus ?? (isText(input.sections.spawning) ? "present" : undefined)),
    feeding: input.sections.feedingSourceStatus === "source_missing"
      ? { status: "source_missing", sourceStatus: "source_missing" }
      : sectionStateFromText(input.sections.feeding, input.sections.feedingSourceStatus ?? (isText(input.sections.feeding) ? "present" : undefined)),
    regulations: regulationsCurrent.length > 0
      ? { status: "available", sourceStatus: "present", count: regulationsCurrent.length, note: regulationsHistory.length > 0 ? "history available" : undefined }
      : regulationsHistory.length > 0
        ? { status: "empty", sourceStatus: "present", count: 0, note: "history available" }
        : { status: "empty", sourceStatus: "present", count: 0 },
    media: sectionStateFromArray(input.media, input.media && input.media.length > 0 ? "present" : undefined),
    sources: sectionStateFromArray(input.officialSources, input.officialSources && input.officialSources.length > 0 ? "present" : "source_missing"),
  };

  return { sectionStates, regulationsCurrent, regulationsHistory };
}

export function buildFishDetailViewModelAssemblyPreview(input: FishDetailViewModelAssemblerInput): FishDetailViewModelAssemblyPreview {
  const { sectionStates, regulationsCurrent, regulationsHistory } = buildSectionStates(input);
  const viewModel = buildFishDetailViewModel(input);
  const missingFields = [
    ...(sectionStates.taxonomy.status === "source_missing" ? ["taxonomy"] : []),
    ...(sectionStates.feeding.status === "source_missing" ? ["feeding"] : []),
    ...(sectionStates.regulations.status === "empty" ? ["regulations"] : []),
  ];
  const warnings: string[] = [];
  if (sectionStates.taxonomy.status === "source_missing") warnings.push("taxonomy source missing");
  if (sectionStates.feeding.status === "source_missing") warnings.push("feeding source missing");
  if (sectionStates.regulations.status === "empty" && regulationsHistory.length === 0) warnings.push("regulations empty");
  if (input.sections.seasonSourceStatus === "source_missing") warnings.push("season source missing");

  const readiness =
    sectionStates.identity.status === "available" &&
    sectionStates.officialFacts.status === "available" &&
    sectionStates.media.status === "available" &&
    sectionStates.sources.status === "available"
      ? "ready"
      : "partial";

  return {
    candidateId: input.candidateId,
    sourceId: input.sourceId,
    viewModel,
    sectionStates,
    missingFields,
    warnings,
    readiness,
    regulationCounts: {
      current: regulationsCurrent.length,
      history: regulationsHistory.length,
      all: regulationsCurrent.length + regulationsHistory.length,
    },
  };
}
