import { FishingConditionClient } from "./fishing-condition-client";
import {
  buildFishingSpotMapHref,
  findFishingSpot,
  getFishingConditionSpecies,
} from "@/lib/fishing-condition/fishing-spot-integration";
import {
  buildNavigationHref,
  navigationDestinationFromFishingSpot,
} from "@/lib/marine-navigation/adapters/navigation-destination-adapter";

export const metadata = {
  title: "Fishing Condition | Blue Marina",
  description: "공식 해양환경과 계절성 근거를 선택해 확인합니다.",
};

type ConditionsQuery = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function FishingConditionPage({ searchParams }: { searchParams: Promise<ConditionsQuery> }) {
  const query = await searchParams;
  const requestedSpecies = getFishingConditionSpecies(first(query.speciesId));
  const spot = findFishingSpot(first(query.spotId));

  return <FishingConditionClient
    initialSpeciesId={requestedSpecies?.id}
    spotContext={spot ? {
      id: spot.id,
      name: spot.name,
      region: [spot.region, spot.city].filter(Boolean).join(" · "),
      detailHref: `/fishing-spots/${encodeURIComponent(spot.id)}`,
      mapHref: buildFishingSpotMapHref(spot),
      navigationHref: buildNavigationHref(navigationDestinationFromFishingSpot(spot)),
    } : undefined}
  />;
}
