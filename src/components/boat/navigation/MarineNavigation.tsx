"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Layers3, LocateFixed, MapPinned, Radio, ShieldAlert, X } from "lucide-react";
import { initialBearingDegrees, relativeBearingDegrees } from "@/lib/marine-navigation/bearing";
import { useVoyageManager } from "./useVoyageManager";
import { VoyagePanel, formatVoyageTime } from "./VoyagePanel";
import { distanceMeters, metersToNauticalMiles } from "@/lib/marine-navigation/geo";
import { compassHeading, compassPermission, positionLabels, positionQuality, POSITION_MAX_AGE_MS, watchLivePosition } from "@/lib/marine-navigation/live-sensors";
import { filterGpsSpeed, KNOTS_PER_MPS, reliableCourse, type SpeedSample, type VesselCamera } from "@/lib/marine-navigation/vessel-instruments";
import { NavigationInstruments } from "./NavigationInstruments";
import { simulationEnabled } from "@/lib/marine-navigation/simulation";
import { createLocalStorageAdapter, hudVisibilityStorageKey } from "@/lib/marine-navigation/storage";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import type { KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";
import type { KhoaNavigationWarning, KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import type { KhoaTideStation } from "@/lib/marine-navigation/adapters/khoa-tide-stations";
import type { KmaMarineWeatherForecastZone } from "@/lib/marine-navigation/adapters/kma-marine-weather";
import { parseKmaMarineWeatherWarningsResponse, type KmaMarineWeatherWarningsResponse } from "@/lib/marine-navigation/adapters/kma-marine-weather-warnings";
import type { KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";
import type { KhoaRomsPoint } from "@/lib/sea-info/khoa-roms";
import { appendSessionTrack, freshAccurateFix, plausibleFix } from "@/lib/marine-navigation/session-track";
import type { GeoPoint, GeolocationFailure, MarineNavigationProps, NavigationDestination, NavigationState, TrackSession, VesselPosition } from "@/lib/marine-navigation/types";
import { NavigationCompass } from "./NavigationCompass";
import { NavigationDestinationPanel } from "./NavigationDestinationPanel";
import { NavigationMapShell } from "./NavigationMapShell";
import { NavigationStatus } from "./NavigationStatus";
import { NavigationTurnHUD } from "./NavigationTurnHUD";
import { MarineLayerControl, type SelectedMarineFeature } from "./MarineLayerControl";

const sampleDestinations: NavigationDestination[] = [
  { id: "sample-suyeong", name: "수영만 마리나 입구", latitude: 35.1519, longitude: 129.1336, sourceType: "marina", sourceId: "sample-suyeong" },
  { id: "sample-gwangan", name: "광안 연안 표식", latitude: 35.1494, longitude: 129.1391, sourceType: "manual" },
];
const NavigationGpsSimulator = process.env.NODE_ENV !== "production" ? dynamic(() => import("./NavigationGpsSimulator").then(mod => mod.NavigationGpsSimulator), { ssr: false }) : null;
const hudVisibilityStorage = createLocalStorageAdapter<boolean>(hudVisibilityStorageKey, true);
type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationConstructor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function MarineNavigation({ initialDestination, initialQueryError, destinationOptions = sampleDestinations, onNavigationStart, onNavigationStop, onArrive }: MarineNavigationProps) {
  const allowSimulation = simulationEnabled();
  const [mode, setMode] = useState<"live" | "simulation">("live");
  const [vessel, setVessel] = useState<VesselPosition | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<{ degrees: number; at: number } | null>(null);
  const [clock, setClock] = useState(0);
  const [compassNotice, setCompassNotice] = useState<string | null>(null);
  const [destination, setDestination] = useState<NavigationDestination | null>(initialDestination ?? null);
  const [status, setStatus] = useState<NavigationState["status"]>("idle");
  const [gpsActive, setGpsActive] = useState(false);
  const [failure, setFailure] = useState<GeolocationFailure | null>(null);
  const [mapPoint, setMapPoint] = useState<GeoPoint | null>(null);
  const [tracks, setTracks] = useState<TrackSession[]>([{ id: "session", name: "세션 항적", status: "recording", startedAt: 0, points: [] }]);
  const [trackVisible, setTrackVisible] = useState(true);
  const lastTrustedFix = useRef<VesselPosition | null>(null);
  const trackBreak = useRef(false);
  const [fixNotice, setFixNotice] = useState<string | null>(null);
  const [activeTrackId] = useState<string | null>("session");
  const [hudVisible, setHudVisible] = useState(true);
  const [camera, setCamera] = useState<VesselCamera>({ mode: "2d", follow: true, courseUp: false, recenter: 0 });
  const [speedUnit, setSpeedUnit] = useState<"kn" | "km/h">("kn");
  const speedSample = useRef<SpeedSample | null>(null);
  const suspendFollow = useCallback(() => setCamera(current => ({ ...current, follow: false })), []);
  const [layersOpen, setLayersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deepWaterRouteVisible, setDeepWaterRouteVisible] = useState(true);
  const [deepWaterRouteState, setDeepWaterRouteState] = useState<"loading" | "ready" | "failed">("loading");
  const [harborZoneVisible, setHarborZoneVisible] = useState(false);
  const [harborZoneState, setHarborZoneState] = useState<"loading" | "ready" | "failed">("loading");
  const [navigationAidsVisible, setNavigationAidsVisible] = useState(false);
  const [navigationAidsState, setNavigationAidsState] = useState<"loading" | "ready" | "partial" | "stale" | "failed">("loading");
  const [trainingFiringZoneVisible, setTrainingFiringZoneVisible] = useState(false);
  const [trainingFiringZoneState, setTrainingFiringZoneState] = useState<"loading" | "ready" | "failed">("loading");
  const [navigationWarningsVisible, setNavigationWarningsVisible] = useState(false);
  const [navigationWarningsState, setNavigationWarningsState] = useState<"loading" | "ready" | "partial" | "current-unavailable" | "failed">("loading");
  const [navigationWarningsData, setNavigationWarningsData] = useState<KhoaNavigationWarningsResponse | null>(null);
  const [navigationWarningFocus, setNavigationWarningFocus] = useState<KhoaNavigationWarning | null>(null);
  const [tideStationsVisible, setTideStationsVisible] = useState(false);
  const [tideStationsState, setTideStationsState] = useState<"loading" | "ready" | "failed">("loading");
  const [marineWeatherVisible, setMarineWeatherVisible] = useState(false);
  const [marineWeatherState, setMarineWeatherState] = useState<"loading" | "ready" | "failed">("loading");
  const [marineObservationsVisible, setMarineObservationsVisible] = useState(false);
  const [marineObservationsState, setMarineObservationsState] = useState<"loading" | "ready" | "failed">("loading");
  const [oceanCurrentModelVisible, setOceanCurrentModelVisible] = useState(false);
  const [oceanCurrentModelState, setOceanCurrentModelState] = useState<"loading" | "ready" | "failed">("ready");
  const [weatherWarningsVisible, setWeatherWarningsVisible] = useState(false);
  const [weatherWarningsState, setWeatherWarningsState] = useState<"loading" | "ready" | "failed">("loading");
  const [weatherWarningsData, setWeatherWarningsData] = useState<KmaMarineWeatherWarningsResponse | null>(null);
  const [selectedMarineFeature, setSelectedMarineFeature] = useState<SelectedMarineFeature | null>(null);
  const gpsCleanup = useRef<(() => void) | null>(null);
  const compassGeneration = useRef(0);
  const orientationCleanup = useRef<(() => void) | null>(null);
  const arrivedId = useRef<string | null>(null);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const visibleTrack = activeTrack ?? tracks.at(-1) ?? null;
  const journeySource = initialDestination?.sourceType === "fishing_spot" ? initialDestination : destination;
  const returnHref = journeySource?.sourceType === "fishing_spot" && journeySource.sourceId
    ? `/fishing-spots/${encodeURIComponent(journeySource.sourceId)}` : "/sea";

  useEffect(() => { setHudVisible(hudVisibilityStorage.load()); }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/sea-info/weather-warnings", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("KMA_WEATHER_WARNING_UNAVAILABLE");
        return parseKmaMarineWeatherWarningsResponse(await response.json());
      })
      .then((data) => { if (active) { setWeatherWarningsData(data); setWeatherWarningsState("ready"); } })
      .catch(() => { if (active) setWeatherWarningsState("failed"); });
    return () => { active = false; };
  }, []);

  const stopGps = useCallback(() => { gpsCleanup.current?.(); gpsCleanup.current = null; speedSample.current = null; trackBreak.current = true; setVessel(null); setGpsActive(false); setMode("live"); }, []);
  useEffect(() => () => { gpsCleanup.current?.(); compassGeneration.current++; orientationCleanup.current?.(); }, []);
  useEffect(() => {
    if (!gpsActive) return;
    const refresh = () => setClock(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 1_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [gpsActive, mode]);

  const acceptPosition = useCallback((position: GeolocationPosition, simulated = false) => {
    const timestamp = position.timestamp; const accuracyMeters = position.coords.accuracy;
    if (![position.coords.latitude, position.coords.longitude, timestamp, accuracyMeters].every(Number.isFinite) || Math.abs(position.coords.latitude) > 90 || Math.abs(position.coords.longitude) > 180 || accuracyMeters < 0) { setFailure("unavailable"); setVessel(null); return; }
    const base: VesselPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude, timestamp, accuracyMeters, source: simulated ? "SIMULATION" : "GPS_NATIVE", headingSource: "UNAVAILABLE", speedSource: "UNAVAILABLE" };
    if (lastTrustedFix.current?.timestamp === timestamp) return;
    if (freshAccurateFix(base, Date.now()) && !plausibleFix(lastTrustedFix.current, base)) { trackBreak.current = true; speedSample.current = null; setVessel(null); setFailure("unavailable"); setFixNotice("GPS 위치 점프/역행 제외 · 새 측정 대기"); return; }
    if (freshAccurateFix(base, Date.now())) { lastTrustedFix.current = base; setFixNotice(null); }
    else { trackBreak.current = true; speedSample.current = null; }
    if (position.coords.heading != null && Number.isFinite(position.coords.heading) && position.coords.heading >= 0 && position.coords.heading < 360) { base.heading = position.coords.heading; base.headingSource = simulated ? "SIMULATION" : "GPS_NATIVE"; }
    const sample = filterGpsSpeed(position.coords.speed, accuracyMeters, timestamp, Date.now(), speedSample.current);
    if (sample) { speedSample.current = sample; base.speedKnots = sample.metersPerSecond * KNOTS_PER_MPS; base.speedSource = simulated ? "SIMULATION" : "NATIVE_GEOLOCATION"; }
    // Missing native speed stays unknown; noisy coordinate differencing is not a SOG reading.
    if (position.coords.speed == null || position.coords.speed < 1 || reliableCourse(base) == null) { base.heading = undefined; base.headingSource = "UNAVAILABLE"; }
    setVessel(base); setClock(Date.now()); setFailure(null);
  }, []);

  const startGps = useCallback(() => {
    stopGps(); setMode("live"); setFailure(null); setDeviceHeading(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) { setFailure("unavailable"); return; }
    setCamera(current => ({ ...current, follow: true, recenter: current.recenter + 1 }));
    setGpsActive(true); setClock(Date.now());
    gpsCleanup.current = watchLivePosition(navigator.geolocation, acceptPosition, error => { trackBreak.current = true; setFailure(error); setGpsActive(false); });
  }, [acceptPosition, stopGps]);

  const enableCompass = useCallback(async () => {
    const generation = ++compassGeneration.current;
    orientationCleanup.current?.(); setDeviceHeading(null);
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) { setCompassNotice("나침반 미지원 · 목적지 방위만 표시합니다."); return; }
    const granted = await compassPermission(window.DeviceOrientationEvent as OrientationConstructor);
    if (generation !== compassGeneration.current) return;
    if (!granted) { setCompassNotice("나침반 권한을 허용하지 않았습니다. 목적지 방위만 표시합니다."); return; }
    setCompassNotice("나침반 수신 대기 · 센서가 없으면 목적지 방위만 표시합니다.");
    const listener = (event: Event) => { const heading = compassHeading(event as OrientationEventWithCompass); if (heading != null) { setDeviceHeading({ degrees: heading, at: Date.now() }); setCompassNotice(null); } };
    window.addEventListener("deviceorientationabsolute", listener); window.addEventListener("deviceorientation", listener);
    orientationCleanup.current = () => { window.removeEventListener("deviceorientationabsolute", listener); window.removeEventListener("deviceorientation", listener); };
  }, []);

  const quality = positionQuality(vessel, gpsActive, failure, clock);
  const gpsLabel = mode === "simulation" ? `TEST · ${positionLabels[quality]}` : positionLabels[quality];
  const vesselState = quality === "GOOD" ? "LIVE" : quality === "LOW_ACCURACY" ? "LOW_ACCURACY" : quality === "STALE" ? "STALE" : "UNAVAILABLE";
  const displayVessel = quality === "OFF" || quality === "UNAVAILABLE" || quality === "ACQUIRING" ? null : vessel;
  const effectiveVessel = useMemo(() => {
    if (quality !== "GOOD") return null;
    if (!vessel) return null;
    const heading = reliableCourse(vessel);
    if (heading != null) return vessel;
    return deviceHeading != null && clock - deviceHeading.at <= POSITION_MAX_AGE_MS
      ? { ...vessel, heading: deviceHeading.degrees, headingSource: "DEVICE_ORIENTATION" as const }
      : { ...vessel, heading: undefined, headingSource: "UNAVAILABLE" as const };
  }, [clock, deviceHeading, quality, vessel]);
  const voyage = useVoyageManager(effectiveVessel, destination);
  const waypoints = voyage.waypoints;
  const voyageState = voyage.session?.state;
  useEffect(()=>{if(!voyageState)return;setStatus(voyageState === "RECORDING" ? "navigating" : "idle");if(voyageState === "COMPLETED")onNavigationStop?.();},[voyageState,onNavigationStop]);
  const navigation = useMemo<NavigationState>(() => {
    if (!effectiveVessel || !destination) return { status, destination, distanceMeters: null, bearingDegrees: null, relativeBearingDegrees: null, speedKnots: effectiveVessel?.speedKnots ?? null, etaMinutes: null };
    const distance = distanceMeters(effectiveVessel, destination); const bearing = initialBearingDegrees(effectiveVessel, destination);
    return { status, destination, distanceMeters: distance, bearingDegrees: bearing, relativeBearingDegrees: effectiveVessel.heading == null ? null : relativeBearingDegrees(bearing, effectiveVessel.heading), speedKnots: effectiveVessel.speedKnots ?? null, etaMinutes: voyage.eta };
  }, [destination, effectiveVessel, status, voyage.eta]);

  useEffect(() => { if (voyage.alert && destination && arrivedId.current !== destination.id) { arrivedId.current = destination.id; onArrive?.(destination); } }, [voyage.alert, destination, onArrive]);
  useEffect(() => {
    if (!effectiveVessel || !activeTrackId) return;
    const breakSegment = trackBreak.current;
    trackBreak.current = false;
    setTracks(current => current.map(track => track.id === activeTrackId && track.status === "recording"
      ? { ...track, points: appendSessionTrack(track.points, effectiveVessel, Date.now(), breakSegment) } : track));
  }, [activeTrackId, effectiveVessel]);

  function selectDestination(next: NavigationDestination) { setDestination(next); setStatus("idle"); arrivedId.current = null; }
  function selectMapPoint(point: GeoPoint) { setMapPoint(point); setDetailsOpen(true); }
  function startSimulation() { stopGps(); setMode("simulation"); setGpsActive(true); setFailure(null); setDeviceHeading(null); speedSample.current = null; setClock(Date.now()); }
  function acceptSimulation(fix: GeolocationPosition) { acceptPosition(fix, true); }
  function failSimulation() { trackBreak.current = true; setFailure("unavailable"); }
  function toggleHud() { setHudVisible((current) => { const next = !current; hudVisibilityStorage.save(next); return next; }); }
  const selectNavigationWarning = useCallback((properties: KhoaNavigationWarning) => setSelectedMarineFeature({ kind: "navigation-warning", properties }), []);
  const focusNavigationWarning = useCallback((properties: KhoaNavigationWarning) => { setNavigationWarningsVisible(true); setSelectedMarineFeature({ kind: "navigation-warning", properties }); setNavigationWarningFocus(properties); }, []);
  useEffect(() => { if (selectedMarineFeature) setLayersOpen(true); }, [selectedMarineFeature]);

  return (
    <main data-navigation-immersive="true" className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#06131a] text-[#f2eee3]">
      <header className="z-[530] flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#06131a]/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-2"><Link href={returnHref} aria-label={journeySource?.sourceType === "fishing_spot" ? "낚시 포인트 상세로 돌아가기" : "바다 지도로 돌아가기"} className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/20 text-[#d2b178] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]"><ArrowLeft size={19} aria-hidden="true" /></Link><div className="min-w-0"><p className="truncate text-sm font-semibold">{destination?.name ?? "해양 항법 보조"}</p><p className="truncate text-[10px] text-[#9baea9]">직선 방위 참고 · 안전항로 아님</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><span role="status" className={`rounded-full px-2 py-1 text-[10px] font-semibold ${failure ? "bg-amber-900/70 text-amber-100" : "bg-white/10 text-[#d5e4df]"}`}>{gpsLabel}</span><button type="button" onClick={gpsActive ? stopGps : startGps} aria-label={gpsActive ? "GPS 추적 중지" : "GPS 위치 추적 시작"} className="grid size-11 place-items-center rounded-xl border border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]">{gpsActive ? <Radio size={16} /> : <LocateFixed size={16} />}</button></div>
      </header>
      <NavigationInstruments elapsed={voyage.session ? formatVoyageTime(voyage.session.elapsedMs + (voyage.session.activeSince == null ? 0 : Math.max(0, voyage.now - voyage.session.activeSince))) : undefined} navigation={navigation} vessel={effectiveVessel} unit={speedUnit} onUnitChange={() => setSpeedUnit(unit => unit === "kn" ? "km/h" : "kn")} following={camera.follow} gpsState={vesselState} accuracy={displayVessel?.accuracyMeters} compass={deviceHeading && clock - deviceHeading.at <= POSITION_MAX_AGE_MS ? deviceHeading.degrees : null} />
      {voyage.alert && <div role="alert" className="z-[530] flex shrink-0 items-center justify-between gap-2 border-b border-amber-200/40 bg-[#102832] px-3 py-2 text-xs text-amber-100">설정한 목적지 반경에 접근했습니다.<button className="min-h-11 px-2" onClick={()=>voyage.selectRadius(0)}>알림 OFF</button></div>}
      <div className="relative min-h-0 flex-1">
        <aside id="navigation-details" className={`bm-navigation-scrollbar absolute inset-x-0 bottom-0 z-[525] overflow-y-auto border-t border-white/20 shadow-[0_-16px_40px_rgba(0,0,0,.35)] backdrop-blur-xl transition-[height] duration-200 lg:left-1/2 lg:right-auto lg:w-[min(560px,60vw)] lg:-translate-x-1/2 ${detailsOpen ? "h-[min(58dvh,540px)]" : "h-[calc(4.5rem+env(safe-area-inset-bottom))]"}`} aria-label="항법 상세 정보">
          <button type="button" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen} aria-controls="navigation-details-content" className="flex min-h-[4.5rem] w-full items-center justify-between gap-3 px-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]">
            <span className="min-w-0"><span className="block truncate text-xs font-semibold">{voyage.session ? "항해 관리 · " + (voyage.session.state === "RECORDING" ? "기록 중" : voyage.session.state === "PAUSED" ? "일시정지" : "종료") : "항해 기록 · 웨이포인트"}</span><span className="mt-1 block text-[10px] text-[#a9bcb6]">{navigation.bearingDegrees == null ? "방위 --" : `방위 ${Math.round(navigation.bearingDegrees)}°`} · {navigation.distanceMeters == null ? "직선거리 --" : `직선거리 ${metersToNauticalMiles(navigation.distanceMeters).toFixed(2)} NM`} · {gpsLabel}</span></span>
            <ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
          <div id="navigation-details-content" hidden={!detailsOpen} className="pb-[env(safe-area-inset-bottom)]">
          {fixNotice ? <p role="status" className="px-5 py-2 text-xs text-amber-200">{fixNotice}</p> : null}
          <NavigationStatus gpsLabel={gpsLabel} navigation={navigation} mode={mode} gpsActive={gpsActive} failure={failure} queryError={initialQueryError} />
          {quality === "STALE" && mode === "live" ? <p role="status" className="px-5 py-2 text-xs text-amber-200">위치 갱신이 15초 이상 지연됐습니다. 새 위치 수신 전에는 방향·거리 안내를 중지합니다.</p> : null}
          {quality === "LOW_ACCURACY" && mode === "live" ? <p role="status" className="px-5 py-2 text-xs text-amber-200">위치 오차 약 {Math.round(vessel?.accuracyMeters ?? 0)}m · 방향·거리는 부정확할 수 있습니다.</p> : null}
          {compassNotice ? <p role="status" className="px-5 py-2 text-xs text-amber-200">{compassNotice}</p> : null}
          <VoyagePanel manager={voyage} fix={effectiveVessel} mapPoint={mapPoint} onSelect={selectDestination} />
          <details><summary className="min-h-11 cursor-pointer px-4 py-3 text-sm">다른 목적지 선택</summary><NavigationDestinationPanel destination={destination} options={destinationOptions} onSelect={selectDestination} /></details>
          {allowSimulation && NavigationGpsSimulator ? <NavigationGpsSimulator active={mode === "simulation"} destination={destination} onStart={startSimulation} onFix={acceptSimulation} onUnavailable={failSimulation} /> : null}
          <div className="flex flex-wrap gap-2 px-5 py-4"><button type="button" onClick={enableCompass} className="min-h-11 rounded-xl border border-white/20 px-3 text-xs">기기 나침반 사용</button></div>
          <p className="px-5 pb-5 text-xs leading-5 text-[#a9bcb6]">직선 방위·거리는 안전항로가 아닙니다. 육지·암초·수심 회피, AIS 충돌회피, 자동 항로 생성을 제공하지 않으며 공식 항법장비를 대체하지 않습니다.</p>
          </div>
        </aside>
        <section className="relative h-full min-h-0 overflow-hidden" aria-label="해상 내비게이션">
          <NavigationMapShell onManualMove={suspendFollow} presentation={{ vessel: effectiveVessel, displayVessel: effectiveVessel ?? displayVessel, vesselState, destination, waypoints, historicalTrackId: voyage.viewed?.id, track: trackVisible ? voyage.viewed?.points ?? voyage.session?.points ?? visibleTrack?.points ?? [] : [], camera }} deepWaterRouteVisible={deepWaterRouteVisible} harborZoneVisible={harborZoneVisible} navigationAidsVisible={navigationAidsVisible} trainingFiringZoneVisible={trainingFiringZoneVisible} navigationWarningsVisible={navigationWarningsVisible} tideStationsVisible={tideStationsVisible} marineWeatherVisible={marineWeatherVisible} marineObservationsVisible={marineObservationsVisible} oceanCurrentModelVisible={oceanCurrentModelVisible} navigationWarningFocus={navigationWarningFocus} onPointSelect={selectMapPoint} onDeepWaterRouteSelect={(properties: KhoaDeepWaterRouteProperties) => setSelectedMarineFeature({ kind: "deep-water-route", properties })} onHarborZoneSelect={(properties: KhoaHarborZoneProperties) => setSelectedMarineFeature({ kind: "harbor-zone", properties })} onNavigationAidSelect={(properties: KhoaNavigationAid) => setSelectedMarineFeature({ kind: "navigation-aid", properties })} onTrainingFiringZoneSelect={(properties: KhoaTrainingFiringZoneProperties) => setSelectedMarineFeature({ kind: "training-firing-zone", properties })} onNavigationWarningSelect={selectNavigationWarning} onTideStationSelect={(properties: KhoaTideStation) => setSelectedMarineFeature({ kind: "tide-station", properties })} onMarineWeatherSelect={(properties: KmaMarineWeatherForecastZone) => setSelectedMarineFeature({ kind: "marine-weather", properties })} onMarineObservationSelect={(properties: KmaMarineStation) => setSelectedMarineFeature({ kind: "marine-observation", properties })} onOceanCurrentModelSelect={(properties: KhoaRomsPoint) => setSelectedMarineFeature({ kind: "ocean-current-model", properties })} onDeepWaterRouteStateChange={setDeepWaterRouteState} onHarborZoneStateChange={setHarborZoneState} onNavigationAidsStateChange={setNavigationAidsState} onTrainingFiringZoneStateChange={setTrainingFiringZoneState} onNavigationWarningsStateChange={setNavigationWarningsState} onTideStationsStateChange={setTideStationsState} onMarineWeatherStateChange={setMarineWeatherState} onMarineObservationsStateChange={setMarineObservationsState} onOceanCurrentModelStateChange={setOceanCurrentModelState} onNavigationWarningsDataChange={setNavigationWarningsData} />
          <div className="absolute left-3 top-3 z-[520] flex gap-2"><button type="button" onClick={() => setLayersOpen((open) => !open)} aria-expanded={layersOpen} aria-controls="navigation-layer-drawer" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-[#06131a]/85 px-3 text-xs font-semibold shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]"><Layers3 size={16} aria-hidden="true" />레이어</button><button type="button" onClick={toggleHud} aria-pressed={hudVisible} aria-label={`방향 HUD ${hudVisible ? "끄기" : "켜기"}`} className="min-h-11 rounded-xl border border-white/25 bg-[#06131a]/85 px-3 text-xs shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]">HUD {hudVisible ? "ON" : "OFF"}</button></div>
          {layersOpen ? <button type="button" onClick={() => { setLayersOpen(false); setSelectedMarineFeature(null); }} aria-label="해양 레이어 닫기" className="absolute right-3 top-3 z-[540] grid size-11 place-items-center rounded-xl border border-white/25 bg-[#06131a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]"><X size={18} aria-hidden="true" /></button> : null}
          {hudVisible && effectiveVessel ? <NavigationTurnHUD navigation={navigation} vessel={effectiveVessel} /> : null}
          {layersOpen ? <div id="navigation-layer-drawer"><MarineLayerControl deepWaterRouteVisible={deepWaterRouteVisible} deepWaterRouteState={deepWaterRouteState} harborZoneVisible={harborZoneVisible} harborZoneState={harborZoneState} navigationAidsVisible={navigationAidsVisible} navigationAidsState={navigationAidsState} trainingFiringZoneVisible={trainingFiringZoneVisible} trainingFiringZoneState={trainingFiringZoneState} navigationWarningsVisible={navigationWarningsVisible} navigationWarningsState={navigationWarningsState} navigationWarningsData={navigationWarningsData} tideStationsVisible={tideStationsVisible} tideStationsState={tideStationsState} marineWeatherVisible={marineWeatherVisible} marineWeatherState={marineWeatherState} marineObservationsVisible={marineObservationsVisible} marineObservationsState={marineObservationsState} oceanCurrentModelVisible={oceanCurrentModelVisible} oceanCurrentModelState={oceanCurrentModelState} weatherWarningsVisible={weatherWarningsVisible} weatherWarningsState={weatherWarningsState} weatherWarningsData={weatherWarningsData} selected={selectedMarineFeature} onDeepWaterRouteVisibleChange={(visible) => { setDeepWaterRouteVisible(visible); if (!visible && selectedMarineFeature?.kind === "deep-water-route") setSelectedMarineFeature(null); }} onHarborZoneVisibleChange={(visible) => { setHarborZoneVisible(visible); if (!visible && selectedMarineFeature?.kind === "harbor-zone") setSelectedMarineFeature(null); }} onNavigationAidsVisibleChange={(visible) => { setNavigationAidsVisible(visible); if (!visible && selectedMarineFeature?.kind === "navigation-aid") setSelectedMarineFeature(null); }} onTrainingFiringZoneVisibleChange={(visible) => { setTrainingFiringZoneVisible(visible); if (!visible && selectedMarineFeature?.kind === "training-firing-zone") setSelectedMarineFeature(null); }} onNavigationWarningsVisibleChange={(visible) => { setNavigationWarningsVisible(visible); if (!visible && selectedMarineFeature?.kind === "navigation-warning") setSelectedMarineFeature(null); }} onTideStationsVisibleChange={(visible) => { setTideStationsVisible(visible); if (!visible && selectedMarineFeature?.kind === "tide-station") setSelectedMarineFeature(null); }} onMarineWeatherVisibleChange={(visible) => { setMarineWeatherVisible(visible); if (!visible && selectedMarineFeature?.kind === "marine-weather") setSelectedMarineFeature(null); }} onMarineObservationsVisibleChange={(visible) => { setMarineObservationsVisible(visible); if (!visible && selectedMarineFeature?.kind === "marine-observation") setSelectedMarineFeature(null); }} onOceanCurrentModelVisibleChange={(visible) => { setOceanCurrentModelVisible(visible); if (!visible && selectedMarineFeature?.kind === "ocean-current-model") setSelectedMarineFeature(null); }} onWeatherWarningsVisibleChange={setWeatherWarningsVisible} onNavigationWarningFocus={focusNavigationWarning} onCloseFeature={() => setSelectedMarineFeature(null)} /></div> : null}
          {!hudVisible && navigation.relativeBearingDegrees != null ? <NavigationCompass relativeBearing={navigation.relativeBearingDegrees} /> : null}
          <div aria-label="지도 시점 제어" className="absolute left-3 top-16 z-[520] flex flex-col gap-2">
            <button type="button" aria-label="2D / 3D 전환" aria-pressed={camera.mode === "3d"} onClick={() => setCamera(current => ({ ...current, mode: current.mode === "2d" ? "3d" : "2d" }))} className="min-h-11 min-w-11 rounded-xl border border-white/25 bg-[#06131a]/90 px-2 text-xs">{camera.mode === "2d" ? "3D" : "2D"}</button>
            <button type="button" aria-label="내 위치로 이동" disabled={!effectiveVessel} onClick={() => setCamera(current => ({ ...current, follow: true, recenter: current.recenter + 1 }))} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/25 bg-[#06131a]/90 disabled:opacity-40"><LocateFixed size={18} /></button>
            <button type="button" aria-label="보트 추적" aria-pressed={camera.follow} onClick={() => setCamera(current => ({ ...current, follow: !current.follow }))} className="min-h-11 min-w-11 rounded-xl border border-white/25 bg-[#06131a]/90 px-2 text-[10px]">{camera.follow ? "추적 ON" : "추적 OFF"}</button>
            <button type="button" aria-label="북쪽 / 이동방향 기준 전환" aria-pressed={camera.courseUp} onClick={() => setCamera(current => ({ ...current, courseUp: !current.courseUp }))} className="min-h-11 min-w-11 rounded-xl border border-white/25 bg-[#06131a]/90 px-2 text-[10px]">{camera.courseUp ? "COG ↑" : "북쪽 ↑"}</button>
            <button type="button" aria-label="항적 표시" aria-pressed={trackVisible} onClick={() => setTrackVisible(value => !value)} className="min-h-11 min-w-11 rounded-xl border border-white/25 bg-[#06131a]/90 px-2 text-[10px]">항적 {trackVisible ? "ON" : "OFF"}</button>
          </div>
          <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-[520] max-w-[calc(100%-1.5rem)] rounded-lg bg-[#06131a]/80 px-2.5 py-1.5 text-[10px] text-[#d7ded9] backdrop-blur-sm"><ShieldAlert size={12} className="mr-1 inline text-[#d2b178]" aria-hidden="true" />직선 참고 · 항적은 지나온 기록</div>
          <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-[520]"><button type="button" disabled={!effectiveVessel && (!voyage.session || voyage.session.state === "COMPLETED")} onClick={() => { if (!voyage.session || voyage.session.state === "COMPLETED") { voyage.start(); setStatus("navigating"); if(destination) onNavigationStart?.(destination); } else { setDetailsOpen(true); } }} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#eee7d8] px-3 text-xs font-semibold text-[#07161b] disabled:opacity-40"><MapPinned size={14} />{voyage.session && voyage.session.state !== "COMPLETED" ? "항해 관리" : "항해 시작"}</button></div>
          {voyage.viewed && <p className="pointer-events-none absolute inset-x-3 top-28 z-[521] rounded bg-[#102832]/95 p-2 text-center text-xs text-amber-100">과거 항적 표시 · 현재 GPS 위치 아님</p>}
        </section>
      </div>
    </main>
  );
}
