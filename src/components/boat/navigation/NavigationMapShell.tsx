"use client";

import dynamic from "next/dynamic";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const MapLibreMap = dynamic(() => import("./adapters/MapLibreNavigationMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#17363a]" aria-label="지도를 불러오는 중" /> });

export function NavigationMapShell(props: {
  presentation: MapPresentation;
  deepWaterRouteVisible: boolean;
  harborZoneVisible: boolean;
  navigationAidsVisible: boolean;
  onPointSelect: (point: GeoPoint) => void;
  onDeepWaterRouteSelect: (feature: KhoaDeepWaterRouteProperties) => void;
  onHarborZoneSelect: (feature: KhoaHarborZoneProperties) => void;
  onNavigationAidSelect: (feature: KhoaNavigationAid) => void;
  onDeepWaterRouteStateChange: (state: "loading" | "ready" | "failed") => void;
  onHarborZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationAidsStateChange: (state: "loading" | "ready" | "failed") => void;
}) {
  return <MapLibreMap {...props} />;
}
