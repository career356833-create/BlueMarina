import { FishingSpotsClient } from "./fishing-spots-client";
import { fishingSpotRegions, fishingSpots } from "@/data/fishing-spots";

export default function FishingSpotsPage() {
  return <FishingSpotsClient spots={fishingSpots} regions={fishingSpotRegions} />;
}
