"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Anchor, ArrowLeft, Compass, LocateFixed, MapPinned, Radio, ShieldAlert } from "lucide-react";
import { initialBearingDegrees, relativeBearingDegrees } from "@/lib/marine-navigation/bearing";
import { estimateEtaMinutes } from "@/lib/marine-navigation/eta";
import { distanceMeters, hasArrived, metersPerSecondToKnots } from "@/lib/marine-navigation/geo";
import { deriveMovement } from "@/lib/marine-navigation/speed";
import { advanceSimulation, simulationEnabled, simulationOrigin } from "@/lib/marine-navigation/simulation";
import { createLocalStorageAdapter, trackStorageKey, waypointStorageKey } from "@/lib/marine-navigation/storage";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import { shouldAppendTrackPoint } from "@/lib/marine-navigation/track";
import { createSavedWaypoint } from "@/lib/marine-navigation/waypoint";
import type { GeoPoint, GeolocationFailure, MarineNavigationProps, NavigationDestination, NavigationState, SavedWaypoint, TrackSession, VesselPosition } from "@/lib/marine-navigation/types";
import { NavigationCompass } from "./NavigationCompass";
import { NavigationDestinationPanel } from "./NavigationDestinationPanel";
import { NavigationHUD } from "./NavigationHUD";
import { NavigationMapShell } from "./NavigationMapShell";
import { NavigationStatus } from "./NavigationStatus";
import { MarineLayerControl, type SelectedMarineFeature } from "./MarineLayerControl";
import { TrackRecorder } from "./TrackRecorder";
import { WaypointPanel } from "./WaypointPanel";

const sampleDestinations: NavigationDestination[] = [
  { id: "sample-suyeong", name: "수영만 마리나 입구", latitude: 35.1519, longitude: 129.1336, sourceType: "marina", sourceId: "sample-suyeong" },
  { id: "sample-gwangan", name: "광안 연안 표식", latitude: 35.1494, longitude: 129.1391, sourceType: "manual" },
];
const waypointStorage = createLocalStorageAdapter<SavedWaypoint[]>(waypointStorageKey, []);
const trackStorage = createLocalStorageAdapter<TrackSession[]>(trackStorageKey, []);
type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationConstructor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

function mapLocationFailure(error: GeolocationPositionError): GeolocationFailure {
  if (error.code === error.PERMISSION_DENIED) return "permission-denied";
  if (error.code === error.POSITION_UNAVAILABLE) return "unavailable";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unknown";
}

export function MarineNavigation({ initialDestination, initialQueryError, destinationOptions = sampleDestinations, arrivalRadiusMeters = 75, onNavigationStart, onNavigationStop, onArrive }: MarineNavigationProps) {
  const allowSimulation = simulationEnabled();
  const [mode, setMode] = useState<"live" | "simulation">("live");
  const [vessel, setVessel] = useState<VesselPosition | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [destination, setDestination] = useState<NavigationDestination | null>(initialDestination ?? null);
  const [status, setStatus] = useState<NavigationState["status"]>("idle");
  const [gpsActive, setGpsActive] = useState(false);
  const [failure, setFailure] = useState<GeolocationFailure | null>(null);
  const [waypoints, setWaypoints] = useState<SavedWaypoint[]>([]);
  const [tracks, setTracks] = useState<TrackSession[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [deepWaterRouteVisible, setDeepWaterRouteVisible] = useState(true);
  const [deepWaterRouteState, setDeepWaterRouteState] = useState<"loading" | "ready" | "failed">("loading");
  const [harborZoneVisible, setHarborZoneVisible] = useState(false);
  const [harborZoneState, setHarborZoneState] = useState<"loading" | "ready" | "failed">("loading");
  const [navigationAidsVisible, setNavigationAidsVisible] = useState(false);
  const [navigationAidsState, setNavigationAidsState] = useState<"loading" | "ready" | "failed">("loading");
  const [selectedMarineFeature, setSelectedMarineFeature] = useState<SelectedMarineFeature | null>(null);
  const watchId = useRef<number | null>(null);
  const previous = useRef<VesselPosition | null>(null);
  const orientationCleanup = useRef<(() => void) | null>(null);
  const arrivedId = useRef<string | null>(null);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const visibleTrack = activeTrack ?? tracks.at(-1) ?? null;

  useEffect(() => { const savedWaypoints = waypointStorage.load(); const savedTracks = trackStorage.load(); setWaypoints(savedWaypoints); setTracks(savedTracks); setActiveTrackId(savedTracks.findLast((track) => track.status !== "completed")?.id ?? null); }, []);
  useEffect(() => waypointStorage.save(waypoints), [waypoints]);
  useEffect(() => trackStorage.save(tracks), [tracks]);

  const stopGps = useCallback(() => { if (watchId.current != null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId.current); watchId.current = null; setGpsActive(false); }, []);
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); orientationCleanup.current?.(); }, []);

  const acceptPosition = useCallback((position: GeolocationPosition) => {
    const timestamp = position.timestamp || Date.now(); const accuracyMeters = position.coords.accuracy;
    const base: VesselPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude, timestamp, accuracyMeters, source: "GPS_NATIVE", headingSource: "UNAVAILABLE", speedSource: "UNAVAILABLE" };
    if (position.coords.heading != null) { base.heading = position.coords.heading; base.headingSource = "GPS_NATIVE"; }
    if (position.coords.speed != null && position.coords.speed >= 0) { base.speedKnots = metersPerSecondToKnots(position.coords.speed); base.speedSource = "NATIVE_GEOLOCATION"; }
    else { const derived = deriveMovement(previous.current, base); if (derived.speedKnots != null) { base.speedKnots = derived.speedKnots; base.speedSource = "DERIVED"; base.source = "GPS_DERIVED"; } if (base.heading == null && derived.heading != null) { base.heading = derived.heading; base.headingSource = "DERIVED_MOVEMENT"; } }
    previous.current = base; setVessel(base); setFailure(null);
  }, []);

  const startGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setFailure("unavailable"); return; }
    stopGps(); setMode("live");
    watchId.current = navigator.geolocation.watchPosition(acceptPosition, (error) => { setFailure(mapLocationFailure(error)); setGpsActive(false); }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 2_000 });
    setGpsActive(true);
  }, [acceptPosition, stopGps]);

  const enableCompass = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const Orientation = window.DeviceOrientationEvent as OrientationConstructor;
    if (Orientation.requestPermission && await Orientation.requestPermission() !== "granted") return;
    orientationCleanup.current?.();
    const listener = (event: Event) => { const reading = event as OrientationEventWithCompass; const heading = reading.webkitCompassHeading ?? (reading.alpha == null ? null : 360 - reading.alpha); if (heading != null && Number.isFinite(heading)) setDeviceHeading(((heading % 360) + 360) % 360); };
    window.addEventListener("deviceorientationabsolute", listener); window.addEventListener("deviceorientation", listener);
    orientationCleanup.current = () => { window.removeEventListener("deviceorientationabsolute", listener); window.removeEventListener("deviceorientation", listener); };
  }, []);

  const effectiveVessel = useMemo(() => vessel && vessel.heading == null && deviceHeading != null ? { ...vessel, heading: deviceHeading, headingSource: "DEVICE_ORIENTATION" as const } : vessel, [deviceHeading, vessel]);
  const navigation = useMemo<NavigationState>(() => {
    if (!effectiveVessel || !destination) return { status, destination, distanceMeters: null, bearingDegrees: null, relativeBearingDegrees: null, speedKnots: effectiveVessel?.speedKnots ?? null, etaMinutes: null };
    const distance = distanceMeters(effectiveVessel, destination); const bearing = initialBearingDegrees(effectiveVessel, destination);
    return { status, destination, distanceMeters: distance, bearingDegrees: bearing, relativeBearingDegrees: effectiveVessel.heading == null ? null : relativeBearingDegrees(bearing, effectiveVessel.heading), speedKnots: effectiveVessel.speedKnots ?? null, etaMinutes: estimateEtaMinutes(distance, effectiveVessel.speedKnots) };
  }, [destination, effectiveVessel, status]);

  useEffect(() => { if (status === "navigating" && destination && effectiveVessel && navigation.distanceMeters != null && hasArrived(navigation.distanceMeters, effectiveVessel.accuracyMeters, arrivalRadiusMeters)) { setStatus("arrived"); if (arrivedId.current !== destination.id) { arrivedId.current = destination.id; onArrive?.(destination); } } }, [arrivalRadiusMeters, destination, effectiveVessel, navigation.distanceMeters, onArrive, status]);
  useEffect(() => { if (mode !== "simulation" || status !== "navigating" || !destination) return; const timer = window.setInterval(() => setVessel((current) => current ? advanceSimulation(current, destination) : current), 1_000); return () => window.clearInterval(timer); }, [destination, mode, status]);
  useEffect(() => { if (!effectiveVessel || !activeTrackId) return; setTracks((current) => current.map((track) => track.id === activeTrackId && track.status === "recording" && shouldAppendTrackPoint(track.points.at(-1), effectiveVessel) ? { ...track, points: [...track.points, effectiveVessel] } : track)); }, [activeTrackId, effectiveVessel]);

  function selectDestination(next: NavigationDestination) { setDestination(next); setStatus("idle"); arrivedId.current = null; }
  function selectMapPoint(point: GeoPoint) { selectDestination({ id: `manual:${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`, name: "지도 선택 지점", ...point, sourceType: "manual" }); }
  function changeMode(next: "live" | "simulation") { setStatus("idle"); arrivedId.current = null; if (next === "simulation") { stopGps(); setFailure(null); setVessel({ ...simulationOrigin, heading: 92, headingSource: "SIMULATION", speedKnots: 0, speedSource: "SIMULATION", accuracyMeters: 3, timestamp: Date.now(), source: "SIMULATION" }); } else setVessel(null); setMode(next); }
  function startTrack() { const next: TrackSession = { id: `track-${Date.now()}`, name: `항적 ${tracks.length + 1}`, status: "recording", startedAt: Date.now(), points: effectiveVessel ? [effectiveVessel] : [] }; setTracks((current) => [...current, next]); setActiveTrackId(next.id); }
  function updateTrack(nextStatus: TrackSession["status"]) { if (!activeTrackId) return; setTracks((current) => current.map((track) => track.id === activeTrackId ? { ...track, status: nextStatus, ...(nextStatus === "completed" ? { endedAt: Date.now() } : {}) } : track)); if (nextStatus === "completed") setActiveTrackId(null); }

  return (
    <main className="grid h-[100svh] min-h-[640px] w-full grid-rows-[64px_minmax(0,1fr)] overflow-hidden bg-[#06131a] text-[#f2eee3]">
      <header className="flex items-center justify-between border-b border-white/10 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><Link href="/sea" aria-label="바다 지도로 돌아가기" title="바다 지도로 돌아가기" className="grid size-9 shrink-0 place-items-center border border-[#d2b178]/60 text-[#d2b178]"><ArrowLeft size={17} aria-hidden="true" /></Link><Anchor size={18} className="hidden text-[#d2b178] sm:block" /><div className="min-w-0"><p className="truncate font-serif text-sm tracking-[0.12em]">BLUE MARINA</p><p className="text-[9px] text-[#899793]">MARINE NAVIGATION</p></div></div>
        <div className="flex items-center gap-2">{allowSimulation ? <div className="flex h-9 border border-white/15"><button type="button" onClick={() => changeMode("live")} className={`px-3 text-[10px] ${mode === "live" ? "bg-[#e9e2d2] text-[#07161b]" : ""}`}>LIVE</button><button type="button" onClick={() => changeMode("simulation")} className={`px-3 text-[10px] ${mode === "simulation" ? "bg-[#d2b178] text-[#07161b]" : ""}`}>SIM</button></div> : null}<button type="button" onClick={mode === "live" && gpsActive ? stopGps : startGps} title={gpsActive ? "GPS 추적 중지" : "GPS 위치 추적"} className="grid size-9 place-items-center border border-white/15">{gpsActive ? <Radio size={16} /> : <LocateFixed size={16} />}</button><button type="button" onClick={enableCompass} title="기기 나침반 사용" className="hidden size-9 place-items-center border border-white/15 sm:grid"><Compass size={16} /></button></div>
      </header>
      <div className="grid min-h-0 grid-rows-[minmax(280px,56%)_minmax(0,44%)] lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="bm-navigation-scrollbar order-2 min-h-0 overflow-y-auto border-t border-white/10 bg-[#081b20] lg:order-1 lg:border-r lg:border-t-0">
          <NavigationStatus navigation={navigation} mode={mode} gpsActive={gpsActive} failure={failure} queryError={initialQueryError} />
          <NavigationDestinationPanel destination={destination} options={destinationOptions} onSelect={selectDestination} />
          <WaypointPanel waypoints={waypoints} vessel={effectiveVessel} destination={destination} onSave={(point) => setWaypoints((current) => [...current, createSavedWaypoint(point)])} onDelete={(id) => setWaypoints((current) => current.filter((point) => point.id !== id))} onSelect={selectDestination} />
          <TrackRecorder activeTrack={activeTrack} savedTrackCount={tracks.length} onStart={startTrack} onPause={() => updateTrack("paused")} onResume={() => updateTrack("recording")} onStop={() => updateTrack("completed")} onClear={() => { setTracks([]); setActiveTrackId(null); trackStorage.clear(); }} />
        </aside>
        <section className="relative order-1 min-h-0 overflow-hidden lg:order-2" aria-label="해상 내비게이션">
          <NavigationMapShell presentation={{ vessel: effectiveVessel, destination, waypoints, track: visibleTrack?.points ?? [] }} deepWaterRouteVisible={deepWaterRouteVisible} harborZoneVisible={harborZoneVisible} navigationAidsVisible={navigationAidsVisible} onPointSelect={selectMapPoint} onDeepWaterRouteSelect={(properties: KhoaDeepWaterRouteProperties) => setSelectedMarineFeature({ kind: "deep-water-route", properties })} onHarborZoneSelect={(properties: KhoaHarborZoneProperties) => setSelectedMarineFeature({ kind: "harbor-zone", properties })} onNavigationAidSelect={(properties: KhoaNavigationAid) => setSelectedMarineFeature({ kind: "navigation-aid", properties })} onDeepWaterRouteStateChange={setDeepWaterRouteState} onHarborZoneStateChange={setHarborZoneState} onNavigationAidsStateChange={setNavigationAidsState} />
          <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-96px)] border-l-2 border-[#d2b178] bg-[#06131a]/90 px-3 py-2 backdrop-blur-sm"><p className="text-[9px] text-[#d2b178]">{mode === "simulation" ? "SIMULATION · 직선 이동" : "TEMPORARY BASE MAP"}</p><p className="mt-1 truncate text-sm">{destination?.name ?? "지도에서 목적지를 선택하세요"}</p></div>
          <MarineLayerControl deepWaterRouteVisible={deepWaterRouteVisible} deepWaterRouteState={deepWaterRouteState} harborZoneVisible={harborZoneVisible} harborZoneState={harborZoneState} navigationAidsVisible={navigationAidsVisible} navigationAidsState={navigationAidsState} selected={selectedMarineFeature} onDeepWaterRouteVisibleChange={(visible) => { setDeepWaterRouteVisible(visible); if (!visible && selectedMarineFeature?.kind === "deep-water-route") setSelectedMarineFeature(null); }} onHarborZoneVisibleChange={(visible) => { setHarborZoneVisible(visible); if (!visible && selectedMarineFeature?.kind === "harbor-zone") setSelectedMarineFeature(null); }} onNavigationAidsVisibleChange={(visible) => { setNavigationAidsVisible(visible); if (!visible && selectedMarineFeature?.kind === "navigation-aid") setSelectedMarineFeature(null); }} onCloseFeature={() => setSelectedMarineFeature(null)} />
          {navigation.relativeBearingDegrees != null ? <NavigationCompass relativeBearing={navigation.relativeBearingDegrees} /> : null}
          <div className="absolute inset-x-0 bottom-0 z-[500]"><NavigationHUD navigation={navigation} vessel={effectiveVessel} /><div className="flex min-h-12 items-center justify-between gap-3 bg-[#06131a]/96 px-3 sm:px-5"><div className="flex min-w-0 items-center gap-2 text-[9px] leading-4 text-[#9ba6a1]"><ShieldAlert size={14} className="shrink-0 text-[#d2b178]" /><span className="line-clamp-2">직선 방위 보조이며 안전항로·육지/암초 회피 또는 공식 항법장비가 아닙니다.</span></div>{status === "navigating" || status === "arrived" ? <button type="button" onClick={() => { setStatus("idle"); onNavigationStop?.(); }} className="h-9 shrink-0 border border-white/20 px-4 text-xs">항해 종료</button> : <button type="button" disabled={!destination || !effectiveVessel} onClick={() => { if (!destination) return; setStatus("navigating"); arrivedId.current = null; onNavigationStart?.(destination); }} className="flex h-9 shrink-0 items-center gap-2 bg-[#eee7d8] px-4 text-xs font-semibold text-[#07161b] disabled:opacity-35"><MapPinned size={14} /> 항해 시작</button>}</div></div>
        </section>
      </div>
    </main>
  );
}
