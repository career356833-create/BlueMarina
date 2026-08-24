import { Suspense } from "react";
import { ExploreSeaIntro } from "@/components/boat/sea/ExploreSeaIntro";
import { SeaMapView } from "@/components/sea/MapView";

export default function SeaPage() {
  return (
    <div className="h-[100svh] overflow-y-auto scroll-smooth bg-[#050f19]">
      <ExploreSeaIntro />
      <div id="live-marine-map" className="relative h-[100dvh] scroll-mt-0">
        <Suspense fallback={null}>
          <SeaMapView />
        </Suspense>
      </div>
    </div>
  );
}
