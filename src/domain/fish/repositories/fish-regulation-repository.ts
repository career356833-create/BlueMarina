import type {
  RegulationRule,
  RegulationSourceRecord,
  RegulationSourceVersionRecord,
} from "../../fish-regulation/drafts/regulation-ingestion-contract";

export type FishRegulationReadModelBundle = {
  rules: RegulationRule[];
  sourceRecords: RegulationSourceRecord[];
  activeVersions: RegulationSourceVersionRecord[];
  allVersions?: RegulationSourceVersionRecord[];
};

export interface FishRegulationRepository {
  findActiveBySpeciesId(speciesId: string): Promise<FishRegulationReadModelBundle>;
  findHistoryBySpeciesId(speciesId: string): Promise<FishRegulationReadModelBundle>;
}
