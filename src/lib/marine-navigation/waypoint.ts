import type { NavigationDestination, SavedWaypoint } from "./types";

export function createSavedWaypoint(destination: NavigationDestination, createdAt = Date.now()): SavedWaypoint {
  return { ...destination, id: `waypoint-${createdAt}`, sourceType: "manual", createdAt };
}
