import type { MyFishDexCardFilterKey, MyFishDexCardSearchField, MyFishDexCardSortKey } from "./my-fish-dex-card-view-model";

export type MyFishDexFilterOption = {
  key: MyFishDexCardFilterKey;
  label: string;
  active: boolean;
  count: number;
};

export type MyFishDexSortingOption = {
  key: MyFishDexCardSortKey;
  label: string;
  active: boolean;
};

export type MyFishDexSearchModel = {
  query: string;
  fields: MyFishDexCardSearchField[];
  resultCount: number;
  canSearchScientificName: boolean;
  canSearchAliases: boolean;
  canSearchRecords: boolean;
};

export type MyFishDexFilterModel = {
  activeFilter: MyFishDexCardFilterKey;
  filters: MyFishDexFilterOption[];
  activeSorting: MyFishDexCardSortKey;
  sorting: MyFishDexSortingOption[];
  search: MyFishDexSearchModel;
  regionFilters: string[];
  seasonFilters: Array<"spring" | "summer" | "autumn" | "winter">;
};
