export type DisposableAuthUserMarker = {
  fixtureId: string;
  purpose: "confirm_fish_observation_functional_smoke";
};

export interface DisposableAuthAdminProvider {
  createDisposableUser(marker: DisposableAuthUserMarker): Promise<{ userId: string }>;
  deleteDisposableUser(userId: string): Promise<void>;
}
