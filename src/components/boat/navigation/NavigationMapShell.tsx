"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { real3dGate, real3dSource, type RendererView } from "@/lib/marine-navigation/real3d";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import type { KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";
import type { KhoaNavigationWarning, KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import type { KhoaTideStation } from "@/lib/marine-navigation/adapters/khoa-tide-stations";
import type { KmaMarineWeatherForecastZone } from "@/lib/marine-navigation/adapters/kma-marine-weather";
import type { KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";
import type { KhoaRomsPoint } from "@/lib/sea-info/khoa-roms";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const MapLibreMap = dynamic(() => import("./adapters/MapLibreNavigationMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#17363a]" aria-label="지도를 불러오는 중" /> });
const previewEnabled = process.env.NEXT_PUBLIC_NAVIGATION_REAL3D_PREVIEW === "true";
const source = real3dSource(process.env.NEXT_PUBLIC_NAVIGATION_3D_TILESET_PATH, process.env.NEXT_PUBLIC_NAVIGATION_3D_ATTRIBUTION);
const CesiumMap = dynamic(() => import("./adapters/CesiumNavigationRenderer"), { ssr: false, loading: () => <p role="status">3D 엔진 로딩 중…</p> });
class RendererBoundary extends Component<{ onFailure: (reason: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure("3D 화면을 열지 못해 기존 지도로 복귀했습니다."); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function NavigationMapShell(props: {
  presentation: MapPresentation;
  onRendererChange?: (active: boolean) => void;
  onCameraModeChange?: (mode: "2d" | "3d") => void;
  deepWaterRouteVisible: boolean;
  harborZoneVisible: boolean;
  navigationAidsVisible: boolean;
  trainingFiringZoneVisible: boolean;
  navigationWarningsVisible: boolean;
  tideStationsVisible: boolean;
  marineWeatherVisible: boolean;
  marineObservationsVisible: boolean;
  oceanCurrentModelVisible: boolean;
  navigationWarningFocus: KhoaNavigationWarning | null;
  onPointSelect: (point: GeoPoint) => void;
  onManualMove?: () => void;
  onDeepWaterRouteSelect: (feature: KhoaDeepWaterRouteProperties) => void;
  onHarborZoneSelect: (feature: KhoaHarborZoneProperties) => void;
  onNavigationAidSelect: (feature: KhoaNavigationAid) => void;
  onTrainingFiringZoneSelect: (feature: KhoaTrainingFiringZoneProperties) => void;
  onNavigationWarningSelect: (feature: KhoaNavigationWarning) => void;
  onTideStationSelect: (feature: KhoaTideStation) => void;
  onMarineWeatherSelect: (feature: KmaMarineWeatherForecastZone) => void;
  onMarineObservationSelect: (feature: KmaMarineStation) => void;
  onOceanCurrentModelSelect: (feature: KhoaRomsPoint) => void;
  onDeepWaterRouteStateChange: (state: "loading" | "ready" | "failed") => void;
  onHarborZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationAidsStateChange: (state: "loading" | "ready" | "partial" | "stale" | "failed") => void;
  onTrainingFiringZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsStateChange: (state: "loading" | "ready" | "partial" | "current-unavailable" | "failed") => void;
  onTideStationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineWeatherStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineObservationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onOceanCurrentModelStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsDataChange: (data: KhoaNavigationWarningsResponse | null) => void;
}) {
  const savedView = useRef<RendererView | null>(null);
  const presentation: MapPresentation = { ...props.presentation, rendererView: () => savedView.current, onRendererViewChange: view => { savedView.current = view; } };
  const [real3d, setReal3d] = useState(false);
  const [notice, setNotice] = useState("");
  const rendererChange = props.onRendererChange;
  useEffect(() => { rendererChange?.(real3d); }, [real3d, rendererChange]);
  function fallback(reason: string) { setReal3d(false); setNotice(reason); }
  function select(mode: "2d" | "3d" | "real") {
    if (mode !== "real") { setReal3d(false); props.onCameraModeChange?.(mode); setNotice(""); return; }
    const reason = real3dGate(source, (navigator as Navigator & { deviceMemory?: number }).deviceMemory, navigator.onLine, process.env.NODE_ENV !== "production");
    if (reason) { setNotice(reason); return; }
    setNotice(""); setReal3d(true);
  }
  return <>
    {real3d && source ? <RendererBoundary onFailure={fallback}><CesiumMap source={source} presentation={presentation} onFallback={fallback} onManualMove={props.onManualMove} onPointSelect={props.onPointSelect} /></RendererBoundary> : <MapLibreMap {...props} presentation={presentation} />}
    {previewEnabled && <div className="absolute bottom-[calc(8.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[525] pointer-events-none">
      <div aria-label="지도 엔진 시험" className="pointer-events-auto inline-flex flex-wrap gap-1 rounded-xl bg-[#06131a]/95 p-1 text-[11px]">
        <button type="button" onClick={() => select("2d")} aria-pressed={!real3d && props.presentation.camera?.mode === "2d"} className="min-h-11 px-3">2D 항법</button>
        <button type="button" onClick={() => select("3d")} aria-pressed={!real3d && props.presentation.camera?.mode === "3d"} className="min-h-11 px-3">3D Terrain</button>
        <button type="button" onClick={() => select("real")} aria-pressed={real3d} className="min-h-11 px-3">실사 3D · 시험</button>
      </div>
      {notice && <p role="status" className="mt-1 rounded bg-[#06131a]/95 p-2 text-xs">{notice}</p>}
    </div>}
  </>;
}
