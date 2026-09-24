import { FishingExperienceSection } from "@/components/boat/home/FishingExperienceSection";
import { canonicalMetadata } from "@/lib/release/site-url";

export const metadata = canonicalMetadata("/fishing-spots");
import { FishingSpotsClient } from "./fishing-spots-client";
import { fishingSpotRegions, fishingSpots } from "@/data/fishing-spots";

export default function FishingSpotsPage() {
  return (
    <>
      <FishingExperienceSection />
      <FishingSpotsClient spots={fishingSpots} regions={fishingSpotRegions} />
    </>
  );
}
