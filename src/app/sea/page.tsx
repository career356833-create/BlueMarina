import { Suspense } from "react";
import { SeaMapView } from "@/components/sea/MapView";

export default function SeaPage() {
  return (
    <Suspense fallback={null}>
      <SeaMapView />
    </Suspense>
  );
}
