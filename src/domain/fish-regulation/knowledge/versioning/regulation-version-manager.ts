import type { RegulationSourceVersion } from "./regulation-source-version";
import { createRegulationSourceVersion } from "./regulation-source-version";

export type RegulationVersionManagerState = {
  versions: RegulationSourceVersion[];
};

export function createVersion(
  state: RegulationVersionManagerState,
  input: Parameters<typeof createRegulationSourceVersion>[0]
): RegulationVersionManagerState {
  const version = createRegulationSourceVersion(input);
  return {
    versions: [...state.versions.filter((item) => item.versionId !== version.versionId), version]
  };
}

export function activateVersion(state: RegulationVersionManagerState, versionId: string): RegulationVersionManagerState {
  const target = state.versions.find((version) => version.versionId === versionId);
  if (!target) return state;
  return {
    versions: state.versions.map((version) => {
      if (version.versionId === versionId) return { ...version, status: "active" };
      if (version.sourceId === target.sourceId && version.status === "active") return { ...version, status: "expired" };
      return version;
    })
  };
}

export function expireVersion(state: RegulationVersionManagerState, versionId: string): RegulationVersionManagerState {
  return updateStatus(state, versionId, "expired");
}

export function archiveVersion(state: RegulationVersionManagerState, versionId: string): RegulationVersionManagerState {
  return updateStatus(state, versionId, "archived");
}

export function getActiveVersion(state: RegulationVersionManagerState, sourceId: string) {
  return state.versions.find((version) => version.sourceId === sourceId && version.status === "active") ?? null;
}

function updateStatus(
  state: RegulationVersionManagerState,
  versionId: string,
  status: RegulationSourceVersion["status"]
): RegulationVersionManagerState {
  return {
    versions: state.versions.map((version) => version.versionId === versionId ? { ...version, status } : version)
  };
}
