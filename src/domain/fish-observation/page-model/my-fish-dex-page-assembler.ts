import type { FishAchievement } from "../read-model/fish-achievement";
import type { FishIdentificationResultViewModel } from "../read-model/fish-identification-result-view-model";
import type { MyFishDexCardFilterKey, MyFishDexCardSortKey, MyFishDexCardViewModel } from "./my-fish-dex-card-view-model";
import type {
  BuildMyFishDexPageViewModelInput,
  MyFishDexAchievementViewModel,
  MyFishDexEmptyStateViewModel,
  MyFishDexFeaturedCollectionViewModel,
  MyFishDexPageViewModel,
  MyFishDexRecentAiAnalysisViewModel,
  MyFishDexSummaryViewModel,
  MyFishDexProgressViewModel,
} from "./my-fish-dex-page-view-model";
import type { MyFishDexFilterModel, MyFishDexFilterOption, MyFishDexSortingOption } from "./my-fish-dex-filter-model";

function statusScore(status: MyFishDexCardViewModel["status"]) {
  return { verified: 0, discovered: 1, locked: 2 }[status];
}

function normalizeQuery(query?: string | null) {
  return (query ?? "").trim().toLowerCase();
}

function matchesSearch(card: MyFishDexCardViewModel, query: string) {
  if (!query) return true;
  const parts = [card.speciesName, card.speciesId, card.regionSummary ?? "", card.seasonSummary ?? "", card.verificationStatus];
  return parts.some((value) => value.toLowerCase().includes(query));
}

function buildFilters(cards: MyFishDexCardViewModel[], activeFilter: MyFishDexCardFilterKey) {
  const counts: Record<MyFishDexCardFilterKey, number> = {
    all: cards.length,
    discovered: cards.filter((card) => card.status !== "locked").length,
    undiscovered: cards.filter((card) => card.status === "locked").length,
    verified: cards.filter((card) => card.status === "verified").length,
    region: new Set(cards.flatMap((card) => (card.regionSummary ? [card.regionSummary] : []))).size,
    season: new Set(cards.flatMap((card) => (card.seasonSummary ? [card.seasonSummary] : []))).size,
  };

  return Object.entries(counts).map(([key, count]) => ({
    key: key as MyFishDexCardFilterKey,
    label:
      key === "all"
        ? "전체"
        : key === "discovered"
          ? "발견"
          : key === "undiscovered"
            ? "미발견"
            : key === "verified"
              ? "인증완료"
              : key === "region"
                ? "지역별"
                : "계절별",
    active: key === activeFilter,
    count,
  })) satisfies MyFishDexFilterOption[];
}

function buildSorting(activeSorting: MyFishDexCardSortKey) {
  return [
    { key: "recent_discovery", label: "최근 발견", active: activeSorting === "recent_discovery" },
    { key: "most_caught", label: "많이 잡은 순", active: activeSorting === "most_caught" },
    { key: "largest_record", label: "큰 기록 순", active: activeSorting === "largest_record" },
    { key: "alphabetical", label: "가나다순", active: activeSorting === "alphabetical" },
  ] satisfies MyFishDexSortingOption[];
}

function applySorting(cards: MyFishDexCardViewModel[], activeSorting: MyFishDexCardSortKey) {
  const sorted = [...cards];
  sorted.sort((left, right) => {
    if (activeSorting === "most_caught") {
      return right.count - left.count || statusScore(left.status) - statusScore(right.status) || left.speciesName.localeCompare(right.speciesName);
    }
    if (activeSorting === "largest_record") {
      const leftLength = left.bestRecord?.length ?? -Infinity;
      const rightLength = right.bestRecord?.length ?? -Infinity;
      const lengthDiff = rightLength - leftLength;
      if (lengthDiff !== 0) return lengthDiff;
      const leftWeight = left.bestRecord?.weight ?? -Infinity;
      const rightWeight = right.bestRecord?.weight ?? -Infinity;
      const weightDiff = rightWeight - leftWeight;
      if (weightDiff !== 0) return weightDiff;
      return right.count - left.count || left.speciesName.localeCompare(right.speciesName);
    }
    if (activeSorting === "alphabetical") {
      return left.speciesName.localeCompare(right.speciesName) || statusScore(left.status) - statusScore(right.status);
    }
    return (right.discoveredAt ?? "").localeCompare(left.discoveredAt ?? "") || statusScore(left.status) - statusScore(right.status) || left.speciesName.localeCompare(right.speciesName);
  });
  return sorted;
}

function buildFeaturedCollection(cards: MyFishDexCardViewModel[]): MyFishDexFeaturedCollectionViewModel | null {
  if (!cards.length) return null;
  const selected = [...cards].sort((left, right) => {
    const statusDiff = statusScore(left.status) - statusScore(right.status);
    if (statusDiff !== 0) return statusDiff;
    const countDiff = right.count - left.count;
    if (countDiff !== 0) return countDiff;
    return (right.discoveredAt ?? "").localeCompare(left.discoveredAt ?? "") || left.speciesName.localeCompare(right.speciesName);
  })[0];
  if (!selected) return null;
  const reason: MyFishDexFeaturedCollectionViewModel["reason"] =
    selected.status === "verified"
      ? "latest_verified"
      : selected.count > 1
        ? "most_caught"
        : selected.bestRecord
          ? "best_record"
          : "first_discovery";
  return {
    ...selected,
    reason,
  };
}

function buildRecentAiAnalyses(analyses?: FishIdentificationResultViewModel[] | null): MyFishDexRecentAiAnalysisViewModel[] {
  return (analyses ?? []).map((analysis) => ({
    requestId: analysis.requestId,
    imagePreview: analysis.imagePreview ?? null,
    status: analysis.status,
    candidates: analysis.candidates.map((candidate) => ({
      speciesId: candidate.speciesId,
      speciesName: candidate.speciesName,
      thumbnail: candidate.thumbnail ?? null,
      confidence: candidate.confidence,
      rank: candidate.rank,
    })),
    topCandidate: analysis.topCandidate
      ? {
          speciesId: analysis.topCandidate.speciesId,
          speciesName: analysis.topCandidate.speciesName,
          thumbnail: analysis.topCandidate.thumbnail ?? null,
          confidence: analysis.topCandidate.confidence,
          rank: analysis.topCandidate.rank,
        }
      : null,
    warning: analysis.warning ?? null,
    canConfirm: analysis.canConfirm,
    canRetry: analysis.canRetry,
  }));
}

function buildEmptyState(cards: MyFishDexCardViewModel[], filteredCards: MyFishDexCardViewModel[], query: string): MyFishDexEmptyStateViewModel {
  if (!cards.length) {
    return {
      kind: "initial",
      status: "empty",
      hasDiscoveries: false,
      hasConfirmedSpecies: false,
      actionKeys: ["register_first_fish", "upload_first_photo"],
    };
  }
  if (query && !filteredCards.length) {
    return {
      kind: "search",
      status: "empty",
      hasDiscoveries: cards.some((card) => card.status !== "locked"),
      hasConfirmedSpecies: cards.some((card) => card.status === "verified"),
      actionKeys: ["clear_search", "reset_filters"],
    };
  }
  return {
    kind: "none",
    status: "hidden",
    hasDiscoveries: cards.some((card) => card.status !== "locked"),
    hasConfirmedSpecies: cards.some((card) => card.status === "verified"),
    actionKeys: [],
  };
}

function buildAchievements(achievements: FishAchievement[]): MyFishDexAchievementViewModel[] {
  return achievements.map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    progress: achievement.progress,
    unlocked: achievement.status === "earned",
    unlockedAt: achievement.earnedAt ?? null,
  }));
}

export function buildMyFishDexPageViewModel(input: BuildMyFishDexPageViewModelInput): MyFishDexPageViewModel {
  const activeFilter = input.activeFilter ?? "all";
  const activeSorting = input.activeSorting ?? "recent_discovery";
  const normalizedQuery = normalizeQuery(input.searchQuery);
  const cards = [...input.entries];
  const filteredCards = cards.filter((card) => {
    if (activeFilter === "discovered" && card.status === "locked") return false;
    if (activeFilter === "undiscovered" && card.status !== "locked") return false;
    if (activeFilter === "verified" && card.status !== "verified") return false;
    if (activeFilter === "region" && !card.regionSummary) return false;
    if (activeFilter === "season" && !card.seasonSummary) return false;
    return matchesSearch(card, normalizedQuery);
  });
  const sortedCards = applySorting(filteredCards, activeSorting);
  const totalCount = input.baseSummary.totalSpecies;
  const discoveredCount = input.baseSummary.discoveredSpecies;
  const verifiedCount = cards.filter((card) => card.status === "verified").length;
  const remainingCount = Math.max(0, totalCount - discoveredCount);
  const latestDiscovery = [...cards]
    .filter((card) => card.discoveredAt)
    .sort((left, right) => (right.discoveredAt ?? "").localeCompare(left.discoveredAt ?? ""))
    .map((card) => ({
      speciesId: card.speciesId,
      speciesName: card.speciesName,
      capturedAt: card.discoveredAt as string,
    }))[0] ?? null;

  const summary: MyFishDexSummaryViewModel = {
    discoveredCount,
    totalCount,
    completionRate: input.baseSummary.completionRate,
    verifiedCount,
    latestDiscovery,
  };

  const progress: MyFishDexProgressViewModel = {
    discoveredCount,
    totalCount,
    completionRate: input.baseSummary.completionRate,
    verifiedCount,
    remainingCount,
    latestDiscoveryAt: latestDiscovery?.capturedAt ?? null,
    progressLabel: `${discoveredCount} / ${totalCount}종 발견`,
  };

  const filters = {
    activeFilter,
    filters: buildFilters(cards, activeFilter),
    activeSorting,
    sorting: buildSorting(activeSorting),
    search: {
      query: input.searchQuery ?? "",
      fields: ["speciesName", "scientificName", "alias", "record"],
      resultCount: sortedCards.length,
      canSearchScientificName: true,
      canSearchAliases: true,
      canSearchRecords: true,
    },
    regionFilters: [...new Set(cards.flatMap((card) => (card.regionSummary ? [card.regionSummary] : [])))].sort((a, b) => a.localeCompare(b)),
    seasonFilters: [...new Set(cards.flatMap((card) => (card.seasonSummary ? [card.seasonSummary] : []))).values()] as Array<"spring" | "summer" | "autumn" | "winter">,
  } satisfies MyFishDexFilterModel;

  return {
    userId: input.userId,
    summary,
    progress,
    featuredCollection: buildFeaturedCollection(sortedCards),
    recentDiscoveries: [...input.recentDiscoveries].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt)),
    entries: sortedCards,
    achievements: buildAchievements(input.achievements),
    filters,
    sorting: activeSorting,
    search: filters.search,
    emptyState: buildEmptyState(cards, filteredCards, normalizedQuery),
    recentAiAnalyses: buildRecentAiAnalyses(input.recentAiAnalyses),
    generatedAt: input.now ?? new Date().toISOString(),
    catalogSpeciesCount: totalCount,
  };
}
