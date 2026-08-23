import type { FishObservation } from "../drafts/fish-observation";
import { buildMyFishDexViewModel } from "../read-model/my-fish-dex-assembler";
import type { MyFishDexEntry, MyFishDexRecentDiscovery } from "../read-model/my-fish-dex-view-model";
import { buildMyFishDexPageViewModel } from "../page-model/my-fish-dex-page-assembler";
import type { MyFishDexPageViewModel } from "../page-model/my-fish-dex-page-view-model";
import type { MyFishDexCardViewModel } from "../page-model/my-fish-dex-card-view-model";
import type {
  FishCollectionRepository,
  FishObservationRepository,
  FishSpeciesRepository,
  MyFishDexNormalizedRouteQuery,
  MyFishDexPageRequest,
  MyFishDexPageState,
  MyFishDexRouteQuery,
} from "./types";
import type { FishIdentificationResultViewModel } from "../read-model/fish-identification-result-view-model";

export type MyFishDexQueryServiceDependencies = {
  fishCollectionRepository: FishCollectionRepository;
  fishObservationRepository: FishObservationRepository;
  fishSpeciesRepository: FishSpeciesRepository;
  now?: () => string;
};

export type MyFishDexQueryService = {
  getPageViewModel(input: MyFishDexPageRequest): Promise<MyFishDexPageViewModel>;
  getPageState(input: MyFishDexPageRequest): Promise<MyFishDexPageState>;
};

const FILTERS = new Set(["all", "discovered", "undiscovered", "verified", "region", "season"]);
const SORTS = new Set(["recent_discovery", "most_caught", "largest_record", "alphabetical"]);
const SEASONS = new Set(["spring", "summer", "autumn", "winter"]);

function firstValue(value?: string | string[] | null) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeNonEmpty(value?: string | string[] | null) {
  const resolved = firstValue(value);
  const trimmed = typeof resolved === "string" ? resolved.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMyFishDexRouteQuery(query: MyFishDexRouteQuery = {}): MyFishDexNormalizedRouteQuery {
  const filter = firstValue(query.filter);
  const sort = firstValue(query.sort);
  const search = normalizeNonEmpty(query.search) ?? "";
  const region = normalizeNonEmpty(query.region);
  const seasonValue = normalizeNonEmpty(query.season);
  const pageValue = Number.parseInt(firstValue(query.page) ?? "", 10);

  return {
    activeFilter: FILTERS.has(filter ?? "") ? (filter as MyFishDexNormalizedRouteQuery["activeFilter"]) : "all",
    activeSorting: SORTS.has(sort ?? "") ? (sort as MyFishDexNormalizedRouteQuery["activeSorting"]) : "recent_discovery",
    search,
    region,
    season: seasonValue && SEASONS.has(seasonValue) ? (seasonValue as MyFishDexNormalizedRouteQuery["season"]) : null,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function mapEntryRegions(entry: MyFishDexEntry) {
  return entry.regions
    .map((region) => region.regionId.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function mapEntrySeasons(entry: MyFishDexEntry) {
  return entry.seasons.map((season) => season.season).join(", ");
}

function toCard(entry: MyFishDexEntry): MyFishDexCardViewModel {
  return {
    speciesId: entry.speciesId,
    speciesName: entry.speciesName,
    thumbnail: entry.thumbnail ?? null,
    status: entry.status,
    discoveredAt: entry.discoveredAt ?? null,
    count: entry.discoveryCount,
    bestRecord: entry.bestRecord ?? null,
    regionSummary: mapEntryRegions(entry) || null,
    seasonSummary: mapEntrySeasons(entry) || null,
    verificationStatus:
      entry.verificationType ?? (entry.status === "verified" ? "user_confirmed" : entry.status === "locked" ? "ai_only" : "unverified"),
  };
}

function mapRecentDiscovery(discovery: MyFishDexRecentDiscovery) {
  return {
    observationId: discovery.observationId,
    speciesId: discovery.speciesId,
    speciesName: discovery.speciesName,
    capturedAt: discovery.capturedAt,
    thumbnail: discovery.thumbnail ?? null,
    status: discovery.status,
  };
}

function buildPageViewModelFromBase(
  base: ReturnType<typeof buildMyFishDexViewModel>,
  query: MyFishDexNormalizedRouteQuery,
  recentAiAnalyses?: FishIdentificationResultViewModel[] | null,
  now?: string,
): MyFishDexPageViewModel {
  return buildMyFishDexPageViewModel({
    userId: base.userId,
    baseSummary: base.summary,
    entries: base.entries.map(toCard),
    achievements: base.achievements,
    recentDiscoveries: base.recentDiscoveries.map(mapRecentDiscovery),
    recentAiAnalyses: recentAiAnalyses ?? null,
    activeFilter: query.activeFilter,
    activeSorting: query.activeSorting,
    searchQuery: query.search,
    now: now ?? base.generatedAt,
  });
}

export function createMyFishDexQueryService(deps: MyFishDexQueryServiceDependencies): MyFishDexQueryService {
  return {
    async getPageViewModel(input: MyFishDexPageRequest) {
      if (!input.userId) {
        throw new Error("UNAUTHORIZED");
      }

      const query = normalizeMyFishDexRouteQuery(input.query);
      const [speciesCatalog, observations, verifications, collections, media] = await Promise.all([
        deps.fishSpeciesRepository.findPublished(),
        deps.fishObservationRepository.findByUserId(input.userId),
        deps.fishObservationRepository.findVerificationsByUserId(input.userId),
        deps.fishCollectionRepository.findByUserId(input.userId),
        deps.fishObservationRepository.findMediaByUserId(input.userId),
      ]);

      const base = buildMyFishDexViewModel({
        userId: input.userId,
        speciesCatalog,
        observations,
        verifications,
        collections,
        media,
        now: deps.now?.(),
      });

      return buildPageViewModelFromBase(base, query, input.recentAiAnalyses ?? null, deps.now?.());
    },

    async getPageState(input: MyFishDexPageRequest) {
      if (!input.userId) {
        return { kind: "unauthorized", redirectTo: "/login" };
      }
      try {
        const viewModel = await this.getPageViewModel(input);
        if (!viewModel.entries.length) {
          return { kind: "empty", viewModel, emptyState: viewModel.emptyState };
        }
        return { kind: "success", viewModel };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message === "UNAUTHORIZED") {
          return { kind: "unauthorized", redirectTo: "/login" };
        }
        return { kind: "error", message, retryable: true };
      }
    },
  };
}

export function buildMyFishDexRoutePreviewState(
  viewModel: MyFishDexPageViewModel | null | undefined,
  input: { userId?: string | null; loading?: boolean; errorMessage?: string | null; redirectTo?: string },
): MyFishDexPageState {
  if (!input.userId) {
    return { kind: "unauthorized", redirectTo: input.redirectTo ?? "/login" };
  }
  if (input.loading) {
    return { kind: "loading", message: "Loading MyFishDex" };
  }
  if (input.errorMessage) {
    return { kind: "error", message: input.errorMessage, retryable: true };
  }
  if (!viewModel) {
    return { kind: "loading", message: "Preparing MyFishDex" };
  }
  if (!viewModel.entries.length) {
    return { kind: "empty", viewModel, emptyState: viewModel.emptyState };
  }
  return { kind: "success", viewModel };
}

export function sanitizeMyFishDexObservationPreview(
  observation: FishObservation,
  speciesName: string,
  thumbnail?: string | null,
): {
  observationId: string;
  speciesId: string;
  speciesName: string;
  capturedAt: string;
  region: string | null;
  thumbnail: string | null;
  status: "locked" | "discovered" | "verified";
} {
  return {
    observationId: observation.id,
    speciesId: observation.speciesId ?? "unidentified",
    speciesName,
    capturedAt: observation.capturedAt,
    region: observation.region?.trim() || observation.location?.regionLabel?.trim() || null,
    thumbnail: thumbnail ?? null,
    status: observation.speciesId ? "discovered" : "locked",
  };
}
