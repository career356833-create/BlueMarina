export type SpotMapPolicy =
  | "MAP_DISPLAY_ALLOWED"
  | "MAP_DISPLAY_WITH_WARNING"
  | "MAP_DISPLAY_BLOCKED";

export type SpotNavigationPolicy =
  | "NAVIGATION_ALLOWED"
  | "NAVIGATION_BLOCKED_PENDING_REVIEW";

export type SpotCoordinateSafetyPolicy = {
  spotId: string;
  mapPolicy: SpotMapPolicy;
  navigationPolicy: SpotNavigationPolicy;
  reason: string;
};

export const MAP_BLOCKED_NOTICE = "이 포인트는 좌표 검토 중이라 지도 위치를 표시하지 않습니다.";
export const MAP_WARNING_NOTICE = "좌표 검토 중 · 지도 위치는 참고용입니다.";
export const NAVIGATION_HOLD_NOTICE = "좌표 검토 중이라 항법 목적지 사용이 보류되었습니다.";

// Generated from reports/fishing-spots/navigation-coordinate-hold-v1.json.
// The report remains audit evidence; this small map is the runtime contract.
export const SPOT_COORDINATE_SAFETY_POLICIES = {
  "boat-60": {
    spotId: "boat-60",
    mapPolicy: "MAP_DISPLAY_BLOCKED",
    navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
    reason: "이 포인트의 좌표는 현재 검토 중이라 지도 표시와 항법 목적지 사용이 제한됩니다.",
  },
  "boat-128": {
    spotId: "boat-128",
    mapPolicy: "MAP_DISPLAY_WITH_WARNING",
    navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
    reason: "이 포인트의 좌표는 공식 원본에서 지역 충돌이 확인되어 검토 중입니다. 지도 위치는 참고용이며 항법 목적지로 사용할 수 없습니다.",
  },
  "boat-129": {
    spotId: "boat-129",
    mapPolicy: "MAP_DISPLAY_WITH_WARNING",
    navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
    reason: "이 포인트의 좌표는 공식 원본에서 지역 충돌이 확인되어 검토 중입니다. 지도 위치는 참고용이며 항법 목적지로 사용할 수 없습니다.",
  },
  "boat-321": {
    spotId: "boat-321",
    mapPolicy: "MAP_DISPLAY_BLOCKED",
    navigationPolicy: "NAVIGATION_BLOCKED_PENDING_REVIEW",
    reason: "이 포인트의 좌표는 현재 검토 중이라 지도 표시와 항법 목적지 사용이 제한됩니다.",
  },
} as const satisfies Record<string, SpotCoordinateSafetyPolicy>;

const DEFAULT_POLICY: Omit<SpotCoordinateSafetyPolicy, "spotId"> = {
  mapPolicy: "MAP_DISPLAY_ALLOWED",
  navigationPolicy: "NAVIGATION_ALLOWED",
  reason: "",
};

export function getSpotCoordinateSafetyPolicy(spotId: string): SpotCoordinateSafetyPolicy {
  return SPOT_COORDINATE_SAFETY_POLICIES[spotId as keyof typeof SPOT_COORDINATE_SAFETY_POLICIES]
    ?? { spotId, ...DEFAULT_POLICY };
}

export function isCoordinateSafetyHeld(spotId: string) {
  return getSpotCoordinateSafetyPolicy(spotId).navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW";
}
