"use client";
/* eslint-disable @next/next/no-css-tags -- Lazy Cesium widget CSS is served beside its locally copied vendor assets. */

import { useEffect, useRef, useState } from "react";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { GeoPoint } from "@/lib/marine-navigation/types";
import { REAL3D_LIMITS, RendererLease, validRendererView, real3dPresentation, type Real3dCameraMode, type Real3dSource } from "@/lib/marine-navigation/real3d";
import { loadCesium } from "@/lib/marine-navigation/load-cesium";
import type { Viewer, Cesium3DTileset } from "cesium";

type Props = { presentation: MapPresentation; source: Real3dSource; onFallback: (reason: string) => void; onManualMove?: () => void; onPointSelect: (point: GeoPoint) => void };

export default function CesiumNavigationRenderer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const credits = useRef<HTMLDivElement>(null);
  const focusData = useRef<() => void>(() => {});
  const latest = useRef(props);
  const meshVisible = useRef(false);
  const mode = useRef<Real3dCameraMode>("TOP_DOWN");
  const viewerRef = useRef<Viewer | null>(null);
  const tilesRef = useRef<Cesium3DTileset | null>(null);
  const update = useRef<() => void>(() => {});
  const [cameraMode, setCameraMode] = useState<Real3dCameraMode>("TOP_DOWN");
  const [status, setStatus] = useState("3D 엔진 로딩 중");
  useEffect(() => { latest.current = props; props.presentation.fieldObserver?.({ map: meshVisible.current ? "LOADED" : "LOADING" }); update.current(); }, [props]);

  useEffect(() => {
    meshVisible.current = false;
    const lease = new RendererLease();
    const epoch = lease.begin();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const fallback = (reason: string) => {
      if (stopped || !lease.current(epoch)) return;
      stopped = true;
      latest.current.presentation.fieldObserver?.({ mapError: "MAP_RESOURCE_ERROR" });
      latest.current.onFallback(reason);
    };
    void (async () => {
      const C = await loadCesium();
      if (!lease.current(epoch) || !host.current || !credits.current) return;
      const viewer = new C.Viewer(host.current, {
        creditContainer: credits.current,
        baseLayer: false, baseLayerPicker: false, geocoder: false, animation: false,
        timeline: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        fullscreenButton: false, infoBox: false, selectionIndicator: false,
        skyBox: false, skyAtmosphere: false, requestRenderMode: false,
        maximumRenderTimeChange: Infinity, useBrowserRecommendedResolution: true,
        terrainProvider: new C.EllipsoidTerrainProvider(),
      });
      lease.attach(epoch, () => { if (!viewer.isDestroyed()) viewer.destroy(); });
      viewerRef.current = viewer;
      viewer.resolutionScale = Math.min(1, 1.5 / (window.devicePixelRatio || 1));
      viewer.scene.globe.baseColor = C.Color.fromCssColorString("#102a36");
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 20;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20_000_000;
      viewer.creditDisplay.addStaticCredit(new C.Credit(props.source.attribution.replace(/[<>&"']/g, ""), true));
      const fail = () => fallback("실사 3D를 불러오지 못해 기존 지도로 복귀했습니다.");
      const contextLost = (event: Event) => { event.preventDefault(); fallback("3D GPU 연결이 중단되어 기존 지도로 복귀했습니다."); };
      const offline = () => fallback("네트워크가 끊겨 기존 지도로 복귀했습니다.");
      const manual = () => { mode.current = "FREE"; setCameraMode("FREE"); latest.current.onManualMove?.(); };
      viewer.canvas.addEventListener("webglcontextlost", contextLost);
      viewer.canvas.addEventListener("pointerdown", manual);
      viewer.canvas.addEventListener("wheel", manual, { passive: true });
      window.addEventListener("offline", offline);
      let renderedFrames = 0;
      const removeFrames = viewer.scene.postRender.addEventListener(() => { if (host.current) {
        host.current.dataset.renderedFrames = String(++renderedFrames);

      } });
      const removeError = viewer.scene.renderError.addEventListener(fail);
      const visibility = () => { viewer.useDefaultRenderLoop = !document.hidden; if (!document.hidden) viewer.scene.requestRender(); };
      document.addEventListener("visibilitychange", visibility);
      const handler = new C.ScreenSpaceEventHandler(viewer.canvas);
      viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      handler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
        const position = viewer.camera.pickEllipsoid(event.position, C.Ellipsoid.WGS84);
        if (!position) return;
        const point = C.Cartographic.fromCartesian(position);
        latest.current.onPointSelect({ latitude: C.Math.toDegrees(point.latitude), longitude: C.Math.toDegrees(point.longitude) });
      }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      const removals: Array<() => void> = [];
      lease.attach(epoch, () => {
        const position = viewer.camera.positionCartographic;
        latest.current.presentation.onRendererViewChange?.({ longitude: C.Math.toDegrees(position.longitude), latitude: C.Math.toDegrees(position.latitude), height: Math.max(20, position.height), heading: C.Math.toDegrees(viewer.camera.heading), pitch: C.Math.toDegrees(viewer.camera.pitch) });
        clearTimeout(deadline); update.current = () => {}; viewerRef.current = null; tilesRef.current = null;
        window.removeEventListener("offline", offline); document.removeEventListener("visibilitychange", visibility);
        viewer.canvas.removeEventListener("webglcontextlost", contextLost);
        viewer.canvas.removeEventListener("pointerdown", manual); viewer.canvas.removeEventListener("wheel", manual);
        removeFrames(); removeError(); removals.forEach(remove => remove()); handler.destroy();
        if (!viewer.isDestroyed()) viewer.destroy();
      });
      deadline = setTimeout(() => fallback("30초 안에 3D mesh가 표시되지 않아 기존 지도로 복귀했습니다."), REAL3D_LIMITS.loadTimeoutMs);
      setStatus("3D Tiles 데이터 로딩 중");
      const tiles = await C.Cesium3DTileset.fromUrl(props.source.url, {
        maximumScreenSpaceError: REAL3D_LIMITS.maximumScreenSpaceError,
        cacheBytes: REAL3D_LIMITS.cacheBytes, maximumCacheOverflowBytes: REAL3D_LIMITS.cacheBytes / 2,
        preloadWhenHidden: false, showCreditsOnScreen: true,
      });
      if (!lease.current(epoch)) { tiles.destroy(); return; }
      setStatus("3D Tiles 목록 수신 · mesh 준비 중");
      focusData.current = () => { void viewer.zoomTo(tiles, new C.HeadingPitchRange(0, -Math.PI / 4, tiles.boundingSphere.radius * 3)); };
      tilesRef.current = tiles;
      viewer.scene.primitives.add(tiles);
      viewer.scene.requestRender();
      removals.push(tiles.tileFailed.addEventListener(fail));
      removals.push(tiles.loadProgress.addEventListener((pending: number, processing: number) => {
        if (pending + processing > 0) setStatus(`3D 타일 로딩 · 요청 ${pending} / 처리 ${processing}`);
      }));
      removals.push(tiles.tileVisible.addEventListener(tile => {
        if (tile.content.trianglesLength > 0) { meshVisible.current = true; latest.current.presentation.fieldObserver?.({ map: "LOADED" }); clearTimeout(deadline); viewer.scene.requestRenderMode = true; setStatus("3D mesh 표시 · 한국 coverage / 실사 품질 별도 검증 필요"); }
      }));
      const anchor = latest.current.presentation.vessel ?? latest.current.presentation.destination;
      const saved = latest.current.presentation.rendererView?.();
      if (saved && validRendererView(saved)) viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(saved.longitude, saved.latitude, saved.height), orientation: { heading: C.Math.toRadians(saved.heading), pitch: C.Math.toRadians(saved.pitch), roll: 0 } });
      else if (anchor) viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(anchor.longitude, anchor.latitude, 3000) });
      else await viewer.zoomTo(tiles, new C.HeadingPitchRange(0, -Math.PI / 4, tiles.boundingSphere.radius * 3));
      if (!lease.current(epoch)) return;
      let cameraKey = "";
      update.current = () => {
        if (!lease.current(epoch)) return;
        const p = latest.current.presentation;
        const data = real3dPresentation(p);
        viewer.entities.removeAll();
        for (const f of data.points) {
          const [lon, lat] = f.geometry.coordinates;
          viewer.entities.add({ id: `${f.properties.kind}:${f.properties.id}`, position: C.Cartesian3.fromDegrees(lon, lat, 0),
            point: { pixelSize: f.properties.kind === "vessel" ? 13 : 9, color: C.Color.fromCssColorString(f.properties.kind === "vessel" ? "#8fffe9" : "#f2cd8c"), outlineWidth: 2, outlineColor: C.Color.BLACK, disableDepthTestDistance: Infinity },
            label: { text: f.properties.name, font: "12px sans-serif", pixelOffset: new C.Cartesian2(0, -22), showBackground: true, disableDepthTestDistance: Infinity },
          });
        }
        for (const f of data.track) viewer.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(f.geometry.coordinates.flat()), width: 3, material: C.Color.CYAN } });
        if (data.vessel && p.destination) viewer.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray([data.vessel.longitude, data.vessel.latitude, p.destination.longitude, p.destination.latitude]), width: 2, material: new C.PolylineDashMaterialProperty({ color: C.Color.YELLOW }) } });
        if (data.vessel && data.accuracy) viewer.entities.add({ position: C.Cartesian3.fromDegrees(data.vessel.longitude, data.vessel.latitude), ellipse: { semiMajorAxis: data.accuracy, semiMinorAxis: data.accuracy, material: C.Color.CYAN.withAlpha(.12), height: 0 } });
        const key = `${p.vessel?.timestamp}:${p.camera?.recenter}:${p.camera?.follow}:${p.camera?.mode}:${p.camera?.courseUp}:${mode.current}`;
        if (key !== cameraKey && data.vessel && p.camera?.follow && !p.historicalTrackId) {
          if (cameraKey && (p.camera.recenter !== Number(cameraKey.split(":")[1]) || cameraKey.split(":")[2] === "false")) { mode.current = "TOP_DOWN"; setCameraMode("TOP_DOWN"); }
          if (mode.current !== "FREE") {
            const heading = p.camera.courseUp ? data.course ?? 0 : 0;
            const forward = mode.current === "FORWARD";
            // Camera target is ahead of the vessel; vessel stays below screen centre.
            const ahead = forward ? 450 : 0;
            const radians = C.Math.toRadians(heading);
            const lat = data.vessel.latitude + Math.cos(radians) * ahead / 111320;
            const lon = data.vessel.longitude + Math.sin(radians) * ahead / (111320 * Math.max(.01, Math.cos(C.Math.toRadians(lat))));
            viewer.camera.lookAt(C.Cartesian3.fromDegrees(lon, lat, 0), new C.HeadingPitchRange(radians, C.Math.toRadians(forward ? -35 : -90), 2000));
            viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
          }
        }
        cameraKey = key; viewer.scene.requestRender();
      };
      update.current(); viewer.resize(); viewer.render();
    })().catch(() => fallback("3D 엔진 또는 데이터 오류로 기존 지도로 복귀했습니다."));
    return () => { stopped = true; lease.clear(); clearTimeout(deadline); };
  }, [props.source.url, props.source.attribution]);

  function changeMode(value: Real3dCameraMode) {
    mode.current = value; setCameraMode(value);
    if (value === "FREE") latest.current.onManualMove?.();
    if (value !== "FREE" && viewerRef.current) {
      const camera = viewerRef.current.camera;
      camera.setView({ orientation: { heading: camera.heading, pitch: value === "TOP_DOWN" ? -Math.PI / 2 : -Math.PI / 5, roll: 0 } });
    }
    update.current(); viewerRef.current?.scene.requestRender();
  }
  return <div className="relative h-full w-full" data-navigation-renderer="cesium">
    <link rel="stylesheet" href="/cesium/Widgets/widgets.css" precedence="cesium" />
    <div ref={host} className="h-full w-full" aria-label="실사 3D 데이터 시험 지도" />
    <div ref={credits} className="absolute bottom-[calc(12.5rem+env(safe-area-inset-bottom))] left-16 right-2 z-[510] rounded bg-[#06131a]/90 p-1 text-[10px] [&_a]:text-white [&_img]:max-h-5" />
    <div className="absolute right-2 top-3 z-[510] flex max-w-[65%] flex-wrap justify-end gap-1 rounded bg-[#06131a]/90 p-1 text-[11px]">
      {([["TOP_DOWN", "위에서"], ["FORWARD", "전방"], ["FREE", "자유"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={cameraMode === value} onClick={() => changeMode(value)} className="min-h-11 min-w-11 rounded border border-white/30 px-2">{label}</button>)}
      <button type="button" onClick={() => { if (tilesRef.current && viewerRef.current) { changeMode("FREE"); focusData.current(); } }} className="min-h-11 px-2">데이터 범위</button>
      <button type="button" aria-label="3D 확대" onClick={() => { viewerRef.current?.camera.zoomIn(300); viewerRef.current?.scene.requestRender(); }} className="min-h-11 min-w-11">＋</button>
      <button type="button" aria-label="3D 축소" onClick={() => { viewerRef.current?.camera.zoomOut(300); viewerRef.current?.scene.requestRender(); }} className="min-h-11 min-w-11">−</button>
    </div>
    <p role="status" className="pointer-events-none absolute left-16 right-3 top-32 rounded bg-[#06131a]/90 p-2 text-[10px]">{status}<br />해양 레이어는 기존 지도에서 확인 · 표면 높이는 GPS 고도/수심이 아님 · 안전항로 아님</p>
  </div>;
}
