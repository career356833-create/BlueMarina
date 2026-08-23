export type DisposableSpeciesFixtureInput = {
  fixtureId: string;
  sourceProvider: "internal_smoke_test";
  sourceId: string;
  koreanName: "스모크테스트어종";
  scientificName: "Smokeus testensis";
  slug: string;
  factReviewStatus: "approved";
  publishStatus: "published";
  marker: {
    isTestFixture: true;
    purpose: "confirm_fish_observation_functional_smoke";
  };
  createdAt: string;
};

export type DisposableSpeciesFixtureResult = {
  sourceRecordId: string;
  speciesId: string;
};

export interface DisposableSpeciesFixtureRepository {
  /** Creates source, species, and their link in one database transaction. */
  createInTransaction(input: DisposableSpeciesFixtureInput): Promise<DisposableSpeciesFixtureResult>;
}
