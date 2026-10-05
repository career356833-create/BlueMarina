import { FishingExperienceSection } from "@/components/boat/home/FishingExperienceSection";
import { canonicalMetadata } from "@/lib/release/site-url";

export const metadata = canonicalMetadata("/fishing-spots");
import { FishingSpotsClient } from "./fishing-spots-client";
import { fishingSpotRegions, fishingSpots } from "@/data/fishing-spots";

export default async function FishingSpotsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const initialQuery = (typeof params.q === "string" ? params.q : "").slice(0, 80);
  return (
    <>
      <FishingExperienceSection />
      <FishingSpotsClient key={initialQuery} spots={fishingSpots} regions={fishingSpotRegions} initialQuery={initialQuery} />
    </>
  );
}
