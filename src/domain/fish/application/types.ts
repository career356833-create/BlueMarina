import type { FishDetailViewModel } from "../../../lib/types/drafts/fish-detail-view-model";
import type { FishDetailMediaSummary } from "../../../lib/types/drafts/fish-detail-view-model";
import type { FishSourceRecord, FishSpecies } from "../../../lib/types/drafts/nifs-fish-contract";
import type {
  FishDetailViewModelAssemblerInput,
  FishDetailViewModelAssemblyPreview,
} from "../read-model/types";
import type { FishSpeciesRelationRow, FishSpeciesRepository } from "../repositories/fish-species-repository";
import type {
  FishRegulationRepository,
} from "../repositories/fish-regulation-repository";
import type { RegulationReadModelBuildInput, RegulationReadModelBuildResult } from "../../fish-regulation/read-model/types";

export type FishDetailQueryLookupInput =
  | { slug: string; speciesId?: never }
  | { speciesId: string; slug?: never };

export type FishDetailQueryDependencies = {
  speciesRepository: FishSpeciesRepository;
  regulationRepository: FishRegulationRepository;
  projectRegulationReadModel(input: RegulationReadModelBuildInput): RegulationReadModelBuildResult;
  assembleViewModel(input: FishDetailViewModelAssemblerInput): FishDetailViewModel;
};

export type FishDetailQueryResolvedData = {
  lookup: FishDetailQueryLookupInput;
  species: FishSpecies;
  sources: FishSourceRecord[];
  media: FishDetailMediaSummary[];
  relations: FishSpeciesRelationRow[];
  regulationReadModel: RegulationReadModelBuildResult;
  assemblerInput: FishDetailViewModelAssemblerInput;
  viewModel: FishDetailViewModel;
  preview?: FishDetailViewModelAssemblyPreview;
};

export type FishDetailQueryService = {
  load(input: FishDetailQueryLookupInput): Promise<FishDetailViewModel | null>;
  resolve(input: FishDetailQueryLookupInput): Promise<FishDetailQueryResolvedData | null>;
};
