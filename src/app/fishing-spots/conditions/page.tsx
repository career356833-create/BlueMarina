import { FishingConditionClient } from "./fishing-condition-client";
import { RecentlyViewedTracker } from "@/components/account/RecentlyViewedTracker";
import {
  buildFishingSpotMapHref,
  findFishingSpot,
} from "@/lib/fishing-condition/fishing-spot-integration";
import { getFishingConditionProfile } from "@/lib/fishing-condition/profile-registry";
import { safeJourneyReturnTo } from "@/lib/fishing-spots/journey";
import {
  buildNavigationHref,
  navigationDestinationFromFishingSpot,
} from "@/lib/marine-navigation/adapters/navigation-destination-adapter";
import {
  getSpotCoordinateSafetyPolicy,
  NAVIGATION_HOLD_NOTICE,
} from "@/lib/fishing-spots/coordinate-safety";

export const metadata = {
  title: "Fishing Condition | Blue Marina",
  description: "공식 해양환경과 계절성 근거를 선택해 확인합니다.",
};

type ConditionsQuery = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function FishingConditionPage({ searchParams }: { searchParams: Promise<ConditionsQuery> }) {
  const query = await searchParams;
  const requestedSpecies = getFishingConditionProfile(first(query.speciesId));
  const spot = findFishingSpot(first(query.spotId));
  const coordinatePolicy = spot ? getSpotCoordinateSafetyPolicy(spot.id) : null;
  const mapBlocked = coordinatePolicy?.mapPolicy === "MAP_DISPLAY_BLOCKED";
  const navigationBlocked = coordinatePolicy?.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW";

  return <>
    {requestedSpecies ? <RecentlyViewedTracker item={{ entityType: "FISH", entityId: requestedSpecies.speciesId, label: requestedSpecies.koreanName, href: `/fishing-spots/conditions?speciesId=${encodeURIComponent(requestedSpecies.speciesId)}` }} /> : null}
    <FishingConditionClient
    initialSpeciesId={requestedSpecies?.speciesId}
    spotContext={spot ? {
      id: spot.id,
      name: spot.name,
      region: [spot.region, spot.city].filter(Boolean).join(" · "),
      detailHref: `/fishing-spots/${encodeURIComponent(spot.id)}`,
      mapHref: mapBlocked ? undefined : buildFishingSpotMapHref(spot, requestedSpecies?.speciesId),
      navigationHref: navigationBlocked ? undefined : buildNavigationHref(navigationDestinationFromFishingSpot(spot)),
      coordinateNotice: navigationBlocked ? coordinatePolicy.reason : undefined,
      mapBlockedReason: mapBlocked ? "좌표 검토 중이라 지도 표시가 제한됩니다." : undefined,
      navigationBlockedReason: navigationBlocked ? NAVIGATION_HOLD_NOTICE : undefined,
    } : undefined}
    journey={{ spotId: spot?.id, speciesId: requestedSpecies?.speciesId, source: first(query.source), returnTo: safeJourneyReturnTo(first(query.returnTo), spot ? `/fishing-spots/${encodeURIComponent(spot.id)}` : "/fishing-spots") }}
    />
  </>;
}
