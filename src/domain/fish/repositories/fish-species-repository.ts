import type {
  FishMedia,
  FishSourceRecord,
  FishSpecies,
} from "../../../lib/types/drafts/nifs-fish-contract";
import type { FishSpeciesRelation } from "../../../lib/types/drafts/fish-detail-view-model";

export type FishSpeciesRepositoryPublishedQuery = {
  limit?: number;
  offset?: number;
  orderBy?: "slug" | "koreanName" | "scientificName" | "version";
  includeHidden?: boolean;
};

export type FishSpeciesRelationRow = FishSpeciesRelation & {
  targetSpecies: Pick<
    FishSpecies,
    "id" | "slug" | "koreanName" | "commonName" | "englishName" | "scientificName"
  >;
};

export interface FishSpeciesRepository {
  findBySlug(slug: string): Promise<FishSpecies | null>;
  findById(speciesId: string): Promise<FishSpecies | null>;
  findPublished(query?: FishSpeciesRepositoryPublishedQuery): Promise<FishSpecies[]>;
  findSources(speciesId: string): Promise<FishSourceRecord[]>;
  findMedia(speciesId: string): Promise<FishMedia[]>;
  findRelations(speciesId: string): Promise<FishSpeciesRelationRow[]>;
}
