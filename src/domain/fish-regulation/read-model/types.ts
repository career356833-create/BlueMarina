import type {
  RegulationPublishStatus,
  RegulationRule,
  RegulationSourceRecord,
  RegulationSourceVersionRecord,
} from "../drafts/regulation-ingestion-contract";
import type { FishDetailRegulationSummary } from "../../../lib/types/drafts/fish-detail-view-model";

export type RegulationReadModelVisibility = "current" | "warning" | "history";

export type RegulationReadModelItem = FishDetailRegulationSummary & {
  sourceRecordId: string;
  sourceVersionStatus: RegulationSourceVersionRecord["status"] | "missing";
  sourceMissing: boolean;
  visibility: RegulationReadModelVisibility;
  publishStatus: RegulationPublishStatus;
};

export type RegulationReadModelBuildInput = {
  speciesId: string;
  rules: RegulationRule[];
  activeVersions: RegulationSourceVersionRecord[];
  sourceRecords?: RegulationSourceRecord[];
  allVersions?: RegulationSourceVersionRecord[];
  minimumConfidenceToShowCurrent?: number;
  includeHistory?: boolean;
};

export type RegulationReadModelBuildResult = {
  current: RegulationReadModelItem[];
  history: RegulationReadModelItem[];
  all: RegulationReadModelItem[];
};
