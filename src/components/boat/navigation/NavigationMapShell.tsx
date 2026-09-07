"use client";

import dynamic from "next/dynamic";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import type { KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";
import type { KhoaNavigationWarning, KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import type { KhoaTideStation } from "@/lib/marine-navigation/adapters/khoa-tide-stations";
import type { KmaMarineWeatherForecastZone } from "@/lib/marine-navigation/adapters/kma-marine-weather";
import type { KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const MapLibreMap = dynamic(() => import("./adapters/MapLibreNavigationMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#17363a]" aria-label="지도를 불러오는 중" /> });

export function NavigationMapShell(props: {
  presentation: MapPresentation;
  deepWaterRouteVisible: boolean;
  harborZoneVisible: boolean;
  navigationAidsVisible: boolean;
  trainingFiringZoneVisible: boolean;
  navigationWarningsVisible: boolean;
  tideStationsVisible: boolean;
  marineWeatherVisible: boolean;
  marineObservationsVisible: boolean;
  navigationWarningFocus: KhoaNavigationWarning | null;
  onPointSelect: (point: GeoPoint) => void;
  onDeepWaterRouteSelect: (feature: KhoaDeepWaterRouteProperties) => void;
  onHarborZoneSelect: (feature: KhoaHarborZoneProperties) => void;
  onNavigationAidSelect: (feature: KhoaNavigationAid) => void;
  onTrainingFiringZoneSelect: (feature: KhoaTrainingFiringZoneProperties) => void;
  onNavigationWarningSelect: (feature: KhoaNavigationWarning) => void;
  onTideStationSelect: (feature: KhoaTideStation) => void;
  onMarineWeatherSelect: (feature: KmaMarineWeatherForecastZone) => void;
  onMarineObservationSelect: (feature: KmaMarineStation) => void;
  onDeepWaterRouteStateChange: (state: "loading" | "ready" | "failed") => void;
  onHarborZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationAidsStateChange: (state: "loading" | "ready" | "failed") => void;
  onTrainingFiringZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsStateChange: (state: "loading" | "ready" | "failed") => void;
  onTideStationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineWeatherStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineObservationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsDataChange: (data: KhoaNavigationWarningsResponse | null) => void;
}) {
  return <MapLibreMap {...props} />;
}
