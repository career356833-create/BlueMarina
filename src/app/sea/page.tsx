import { Suspense } from "react";
import { canonicalMetadata } from "@/lib/release/site-url";

export const metadata = canonicalMetadata("/sea");
import { ExploreSeaIntro } from "@/components/boat/sea/ExploreSeaIntro";
import { SeaMapView } from "@/components/sea/MapView";

export default function SeaPage() {
  return (
    <div className="h-[calc(100svh-5rem)] overflow-y-auto scroll-smooth bg-[#050f19]">
      <ExploreSeaIntro />
      <div id="live-marine-map" className="relative h-[calc(100dvh-5rem)] scroll-mt-0">
        <Suspense fallback={null}>
          <SeaMapView />
        </Suspense>
      </div>
    </div>
  );
}
