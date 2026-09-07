"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import { createKhoaDeepWaterRouteLayerConfig, KHOA_DEEP_WATER_ROUTE_DATA_URL, KHOA_DEEP_WATER_ROUTE_LAYER_ID, parseKhoaDeepWaterRouteFeatureProperties, parseKhoaDeepWaterRouteGeoJson, type KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import { createKhoaHarborZoneLayerConfig, KHOA_HARBOR_ZONE_DATA_URL, KHOA_HARBOR_ZONE_LAYER_ID, parseKhoaHarborZoneFeatureProperties, parseKhoaHarborZoneGeoJson, type KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import { createKhoaNavigationAidsLayerConfig, KHOA_NAVIGATION_AIDS_DATA_URL, KHOA_NAVIGATION_AIDS_LAYER_ID, parseKhoaNavigationAidFeatureProperties, parseKhoaNavigationAidsGeoJson, type KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import { createKhoaTrainingFiringZoneLayerConfig, KHOA_TRAINING_FIRING_ZONE_DATA_URL, KHOA_TRAINING_FIRING_ZONE_LAYER_ID, parseKhoaTrainingFiringZoneFeatureProperties, parseKhoaTrainingFiringZoneGeoJson, type KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";
import { createKhoaNavigationWarningsLayerConfig, KHOA_NAVIGATION_WARNINGS_DATA_URL, KHOA_NAVIGATION_WARNINGS_LAYER_ID, parseKhoaNavigationWarningFeatureProperties, parseKhoaNavigationWarningsResponse, warningGeometryPoints, type KhoaNavigationWarning, type KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import { createKhoaTideStationsLayerConfig, KHOA_TIDE_STATIONS_DATA_URL, KHOA_TIDE_STATIONS_LAYER_ID, parseKhoaTideStationFeatureProperties, parseKhoaTideStationsResponse, type KhoaTideStation } from "@/lib/marine-navigation/adapters/khoa-tide-stations";
import { createKmaMarineWeatherLayerConfig, KMA_MARINE_WEATHER_LAYER_ID, parseKmaMarineWeatherFeatureProperties, type KmaMarineWeatherForecastZone } from "@/lib/marine-navigation/adapters/kma-marine-weather";
import { createKmaMarineObservationsLayerConfig, KMA_MARINE_OBSERVATIONS_LAYER_ID, KMA_MARINE_OBSERVATIONS_STATIONS_URL, parseKmaMarineStationFeatureProperties, parseKmaMarineStationsResponse } from "@/lib/marine-navigation/adapters/kma-marine-observations";
import { createKhoaRomsLayerConfig, KHOA_OCEAN_CURRENT_MODEL_LAYER_ID, KHOA_OCEAN_CURRENT_MODEL_MIN_ZOOM, parseKhoaRomsApiResponse, parseKhoaRomsFeatureProperties } from "@/lib/marine-navigation/adapters/khoa-ocean-current-model";
import type { KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";
import { buildViewportSampleBbox, type KhoaRomsPoint } from "@/lib/sea-info/khoa-roms";
import type { GeoPoint } from "@/lib/marine-navigation/types";
import { MapLibreNavigationProvider } from "./MapLibreNavigationProvider";

export default function MapLibreNavigationMap({ presentation, deepWaterRouteVisible, harborZoneVisible, navigationAidsVisible, trainingFiringZoneVisible, navigationWarningsVisible, tideStationsVisible, marineWeatherVisible, marineObservationsVisible, oceanCurrentModelVisible, navigationWarningFocus, onPointSelect, onDeepWaterRouteSelect, onHarborZoneSelect, onNavigationAidSelect, onTrainingFiringZoneSelect, onNavigationWarningSelect, onTideStationSelect, onMarineWeatherSelect, onMarineObservationSelect, onOceanCurrentModelSelect, onDeepWaterRouteStateChange, onHarborZoneStateChange, onNavigationAidsStateChange, onTrainingFiringZoneStateChange, onNavigationWarningsStateChange, onTideStationsStateChange, onMarineWeatherStateChange, onMarineObservationsStateChange, onOceanCurrentModelStateChange, onNavigationWarningsDataChange }: {
  presentation: MapPresentation;
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
  onNavigationAidsStateChange: (state: "loading" | "ready" | "failed") => void;
  onTrainingFiringZoneStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsStateChange: (state: "loading" | "ready" | "failed") => void;
  onTideStationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineWeatherStateChange: (state: "loading" | "ready" | "failed") => void;
  onMarineObservationsStateChange: (state: "loading" | "ready" | "failed") => void;
  onOceanCurrentModelStateChange: (state: "loading" | "ready" | "failed") => void;
  onNavigationWarningsDataChange: (data: KhoaNavigationWarningsResponse | null) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<MapLibreNavigationProvider | null>(null);
  const pointSelectRef = useRef(onPointSelect);
  const deepWaterRouteSelectRef = useRef(onDeepWaterRouteSelect);
  const harborZoneSelectRef = useRef(onHarborZoneSelect);
  const navigationAidSelectRef = useRef(onNavigationAidSelect);
  const trainingFiringZoneSelectRef = useRef(onTrainingFiringZoneSelect);
  const navigationWarningSelectRef = useRef(onNavigationWarningSelect);
  const tideStationSelectRef = useRef(onTideStationSelect);
  const marineWeatherSelectRef = useRef(onMarineWeatherSelect);
  const marineObservationSelectRef = useRef(onMarineObservationSelect);
  const oceanCurrentModelSelectRef = useRef(onOceanCurrentModelSelect);
  const deepWaterRouteVisibleRef = useRef(deepWaterRouteVisible);
  const harborZoneVisibleRef = useRef(harborZoneVisible);
  const navigationAidsVisibleRef = useRef(navigationAidsVisible);
  const trainingFiringZoneVisibleRef = useRef(trainingFiringZoneVisible);
  const navigationWarningsVisibleRef = useRef(navigationWarningsVisible);
  const tideStationsVisibleRef = useRef(tideStationsVisible);
  const marineWeatherVisibleRef = useRef(marineWeatherVisible);
  const marineObservationsVisibleRef = useRef(marineObservationsVisible);
  const requestedRomsValidAtRef = useRef("");
  const [romsValidTimes, setRomsValidTimes] = useState<string[]>([]);
  const [romsSelectedValidAt, setRomsSelectedValidAt] = useState("");
  const [romsTimeRevision, setRomsTimeRevision] = useState(0);

  useEffect(() => {
    if (!elementRef.current || providerRef.current) return;
    const provider = new MapLibreNavigationProvider(elementRef.current, (point) => pointSelectRef.current(point), (layerId, properties) => {
      if (layerId === KHOA_DEEP_WATER_ROUTE_LAYER_ID) {
        const deepWaterRoute = parseKhoaDeepWaterRouteFeatureProperties(properties);
        if (deepWaterRoute) deepWaterRouteSelectRef.current(deepWaterRoute);
      } else if (layerId === KHOA_HARBOR_ZONE_LAYER_ID) {
        const harborZone = parseKhoaHarborZoneFeatureProperties(properties);
        if (harborZone) harborZoneSelectRef.current(harborZone);
      } else if (layerId === KHOA_NAVIGATION_AIDS_LAYER_ID) {
        const navigationAid = parseKhoaNavigationAidFeatureProperties(properties);
        if (navigationAid) navigationAidSelectRef.current(navigationAid);
      } else if (layerId === KHOA_TRAINING_FIRING_ZONE_LAYER_ID) {
        const trainingFiringZone = parseKhoaTrainingFiringZoneFeatureProperties(properties);
        if (trainingFiringZone) trainingFiringZoneSelectRef.current(trainingFiringZone);
      } else if (layerId === KHOA_NAVIGATION_WARNINGS_LAYER_ID) {
        const warning = parseKhoaNavigationWarningFeatureProperties(properties);
        if (warning) navigationWarningSelectRef.current(warning);
      } else if (layerId === KHOA_TIDE_STATIONS_LAYER_ID) {
        const station = parseKhoaTideStationFeatureProperties(properties);
        if (station) tideStationSelectRef.current(station);
      } else if (layerId === KMA_MARINE_WEATHER_LAYER_ID) {
        const zone = parseKmaMarineWeatherFeatureProperties(properties);
        if (zone) marineWeatherSelectRef.current(zone);
      } else if (layerId === KMA_MARINE_OBSERVATIONS_LAYER_ID) {
        const station = parseKmaMarineStationFeatureProperties(properties);
        if (station) marineObservationSelectRef.current(station);
      } else if (layerId === KHOA_OCEAN_CURRENT_MODEL_LAYER_ID) {
        const point = parseKhoaRomsFeatureProperties(properties);
        if (point) oceanCurrentModelSelectRef.current(point);
      }
    });
    const resizeObserver = new ResizeObserver(() => provider.resize());
    resizeObserver.observe(elementRef.current);
    providerRef.current = provider;
    return () => {
      resizeObserver.disconnect();
      provider.destroy();
      providerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    onDeepWaterRouteStateChange("loading");
    fetch(KHOA_DEEP_WATER_ROUTE_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA layer request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const collection = parseKhoaDeepWaterRouteGeoJson(value);
        providerRef.current?.addMarineLayer(createKhoaDeepWaterRouteLayerConfig(collection, deepWaterRouteVisibleRef.current));
        onDeepWaterRouteStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onDeepWaterRouteStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_DEEP_WATER_ROUTE_LAYER_ID);
    };
  }, [onDeepWaterRouteStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onHarborZoneStateChange("loading");
    fetch(KHOA_HARBOR_ZONE_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA harbor layer request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const collection = parseKhoaHarborZoneGeoJson(value);
        providerRef.current?.addMarineLayer(createKhoaHarborZoneLayerConfig(collection, harborZoneVisibleRef.current));
        onHarborZoneStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onHarborZoneStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_HARBOR_ZONE_LAYER_ID);
    };
  }, [onHarborZoneStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onNavigationAidsStateChange("loading");
    fetch(KHOA_NAVIGATION_AIDS_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA navigation-aids request failed: ${response.status}`);
        return response.json() as Promise<{ geoJson?: unknown }>;
      })
      .then((value) => {
        const collection = parseKhoaNavigationAidsGeoJson(value.geoJson);
        providerRef.current?.addMarineLayer(createKhoaNavigationAidsLayerConfig(collection, navigationAidsVisibleRef.current));
        onNavigationAidsStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onNavigationAidsStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_NAVIGATION_AIDS_LAYER_ID);
    };
  }, [onNavigationAidsStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onTrainingFiringZoneStateChange("loading");
    fetch(KHOA_TRAINING_FIRING_ZONE_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA training/firing-zone request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const collection = parseKhoaTrainingFiringZoneGeoJson(value);
        providerRef.current?.addMarineLayer(createKhoaTrainingFiringZoneLayerConfig(collection, trainingFiringZoneVisibleRef.current));
        onTrainingFiringZoneStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onTrainingFiringZoneStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_TRAINING_FIRING_ZONE_LAYER_ID);
    };
  }, [onTrainingFiringZoneStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onNavigationWarningsStateChange("loading");
    fetch(KHOA_NAVIGATION_WARNINGS_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA navigation-warning request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const data = parseKhoaNavigationWarningsResponse(value);
        providerRef.current?.addMarineLayer(createKhoaNavigationWarningsLayerConfig(data.geoJson, navigationWarningsVisibleRef.current));
        onNavigationWarningsDataChange(data);
        onNavigationWarningsStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onNavigationWarningsDataChange(null);
        onNavigationWarningsStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_NAVIGATION_WARNINGS_LAYER_ID);
    };
  }, [onNavigationWarningsDataChange, onNavigationWarningsStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onTideStationsStateChange("loading");
    fetch(KHOA_TIDE_STATIONS_DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KHOA tide-station request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const data = parseKhoaTideStationsResponse(value);
        providerRef.current?.addMarineLayer(createKhoaTideStationsLayerConfig(data.geoJson, tideStationsVisibleRef.current));
        onTideStationsStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onTideStationsStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KHOA_TIDE_STATIONS_LAYER_ID);
    };
  }, [onTideStationsStateChange]);

  useEffect(() => {
    onMarineWeatherStateChange("loading");
    try {
      providerRef.current?.addMarineLayer(createKmaMarineWeatherLayerConfig(undefined, marineWeatherVisibleRef.current));
      onMarineWeatherStateChange("ready");
    } catch {
      onMarineWeatherStateChange("failed");
    }
    return () => providerRef.current?.removeMarineLayer(KMA_MARINE_WEATHER_LAYER_ID);
  }, [onMarineWeatherStateChange]);

  useEffect(() => {
    const controller = new AbortController();
    onMarineObservationsStateChange("loading");
    fetch(KMA_MARINE_OBSERVATIONS_STATIONS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`KMA observation stations request failed: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const data = parseKmaMarineStationsResponse(value);
        providerRef.current?.addMarineLayer(createKmaMarineObservationsLayerConfig(data.geoJson, marineObservationsVisibleRef.current));
        onMarineObservationsStateChange("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onMarineObservationsStateChange("failed");
      });
    return () => {
      controller.abort();
      providerRef.current?.removeMarineLayer(KMA_MARINE_OBSERVATIONS_LAYER_ID);
    };
  }, [onMarineObservationsStateChange]);

  useEffect(() => {
    providerRef.current?.addMarineLayer(createKhoaRomsLayerConfig(undefined, false));
    onOceanCurrentModelStateChange("ready");
    return () => providerRef.current?.removeMarineLayer(KHOA_OCEAN_CURRENT_MODEL_LAYER_ID);
  }, [onOceanCurrentModelStateChange]);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.setMarineLayerVisibility(KHOA_OCEAN_CURRENT_MODEL_LAYER_ID, oceanCurrentModelVisible);
    if (!oceanCurrentModelVisible) {
      onOceanCurrentModelStateChange("ready");
      return;
    }
    let controller: AbortController | null = null;
    let lastCell = "";
    let lastRequestAt = 0;
    const load = ({ longitude, latitude, zoom }: { longitude: number; latitude: number; zoom: number }) => {
      if (zoom < KHOA_OCEAN_CURRENT_MODEL_MIN_ZOOM) {
        onOceanCurrentModelStateChange("ready");
        provider.setMarineLayerData(KHOA_OCEAN_CURRENT_MODEL_LAYER_ID, { type: "FeatureCollection", features: [] });
        return;
      }
      const bbox = buildViewportSampleBbox(longitude, latitude);
      const cell = `${bbox.ymin}:${bbox.ymax}:${bbox.xmin}:${bbox.xmax}`;
      if (cell === lastCell || Date.now() - lastRequestAt < 15_000) return;
      lastCell = cell;
      lastRequestAt = Date.now();
      controller?.abort();
      controller = new AbortController();
      onOceanCurrentModelStateChange("loading");
      const params = new URLSearchParams(Object.entries(bbox).map(([key, value]) => [key, String(value)]));
      if (requestedRomsValidAtRef.current) params.set("validAt", requestedRomsValidAtRef.current);
      fetch(`/api/sea-info/ocean-current?${params}`, { signal: controller.signal, headers: { accept: "application/json" } })
        .then((response) => {
          if (!response.ok) throw new Error(`KHOA ROMS request failed: ${response.status}`);
          return response.json() as Promise<unknown>;
        })
        .then((value) => {
          const data = parseKhoaRomsApiResponse(value);
          provider.setMarineLayerData(KHOA_OCEAN_CURRENT_MODEL_LAYER_ID, data.data);
          setRomsValidTimes(data.validTimes);
          setRomsSelectedValidAt(data.selectedValidAt);
          onOceanCurrentModelStateChange("ready");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          provider.setMarineLayerData(KHOA_OCEAN_CURRENT_MODEL_LAYER_ID, { type: "FeatureCollection", features: [] });
          onOceanCurrentModelStateChange("failed");
        });
    };
    const unsubscribe = provider.onViewportChange(load);
    return () => { controller?.abort(); unsubscribe(); };
  }, [oceanCurrentModelVisible, onOceanCurrentModelStateChange, romsTimeRevision]);

  useEffect(() => {
    pointSelectRef.current = onPointSelect;
    providerRef.current?.setPointSelectHandler(onPointSelect);
  }, [onPointSelect]);

  useEffect(() => {
    deepWaterRouteSelectRef.current = onDeepWaterRouteSelect;
  }, [onDeepWaterRouteSelect]);

  useEffect(() => {
    harborZoneSelectRef.current = onHarborZoneSelect;
  }, [onHarborZoneSelect]);

  useEffect(() => {
    navigationAidSelectRef.current = onNavigationAidSelect;
  }, [onNavigationAidSelect]);

  useEffect(() => {
    trainingFiringZoneSelectRef.current = onTrainingFiringZoneSelect;
  }, [onTrainingFiringZoneSelect]);

  useEffect(() => {
    navigationWarningSelectRef.current = onNavigationWarningSelect;
  }, [onNavigationWarningSelect]);

  useEffect(() => {
    tideStationSelectRef.current = onTideStationSelect;
  }, [onTideStationSelect]);

  useEffect(() => {
    marineWeatherSelectRef.current = onMarineWeatherSelect;
  }, [onMarineWeatherSelect]);

  useEffect(() => {
    marineObservationSelectRef.current = onMarineObservationSelect;
  }, [onMarineObservationSelect]);

  useEffect(() => {
    oceanCurrentModelSelectRef.current = onOceanCurrentModelSelect;
  }, [onOceanCurrentModelSelect]);

  useEffect(() => {
    deepWaterRouteVisibleRef.current = deepWaterRouteVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_DEEP_WATER_ROUTE_LAYER_ID, deepWaterRouteVisible);
  }, [deepWaterRouteVisible]);

  useEffect(() => {
    harborZoneVisibleRef.current = harborZoneVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_HARBOR_ZONE_LAYER_ID, harborZoneVisible);
  }, [harborZoneVisible]);

  useEffect(() => {
    navigationAidsVisibleRef.current = navigationAidsVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_NAVIGATION_AIDS_LAYER_ID, navigationAidsVisible);
  }, [navigationAidsVisible]);

  useEffect(() => {
    trainingFiringZoneVisibleRef.current = trainingFiringZoneVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_TRAINING_FIRING_ZONE_LAYER_ID, trainingFiringZoneVisible);
  }, [trainingFiringZoneVisible]);

  useEffect(() => {
    navigationWarningsVisibleRef.current = navigationWarningsVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_NAVIGATION_WARNINGS_LAYER_ID, navigationWarningsVisible);
  }, [navigationWarningsVisible]);

  useEffect(() => {
    tideStationsVisibleRef.current = tideStationsVisible;
    providerRef.current?.setMarineLayerVisibility(KHOA_TIDE_STATIONS_LAYER_ID, tideStationsVisible);
  }, [tideStationsVisible]);

  useEffect(() => {
    marineWeatherVisibleRef.current = marineWeatherVisible;
    providerRef.current?.setMarineLayerVisibility(KMA_MARINE_WEATHER_LAYER_ID, marineWeatherVisible);
  }, [marineWeatherVisible]);

  useEffect(() => {
    marineObservationsVisibleRef.current = marineObservationsVisible;
    providerRef.current?.setMarineLayerVisibility(KMA_MARINE_OBSERVATIONS_LAYER_ID, marineObservationsVisible);
  }, [marineObservationsVisible]);

  useEffect(() => {
    if (navigationWarningFocus) providerRef.current?.focus(warningGeometryPoints(navigationWarningFocus.geometry));
  }, [navigationWarningFocus]);

  useEffect(() => {
    providerRef.current?.setPresentation(presentation);
  }, [presentation]);

  return <div className="relative h-full w-full"><div ref={elementRef} className="bm-navigation-map h-full w-full" aria-label="MapLibre marine navigation map" />{oceanCurrentModelVisible && romsValidTimes.length > 0 ? <label className="absolute left-3 top-20 z-[450] border border-white/20 bg-[#06131a]/92 px-2.5 py-2 text-[9px] text-[#d9d3c5] shadow-lg backdrop-blur-md"><span className="mb-1 block text-[#d2b178]">KHOA ROMS MODEL · 유효 시각 원문</span><select value={romsSelectedValidAt} onChange={(event) => { requestedRomsValidAtRef.current = event.target.value; setRomsSelectedValidAt(event.target.value); setRomsTimeRevision((value) => value + 1); }} className="h-8 max-w-[220px] border border-white/15 bg-[#07161b] px-2 text-[10px] text-[#f2eee3] outline-none"><option value={romsSelectedValidAt}>{romsSelectedValidAt}</option>{romsValidTimes.filter((value) => value !== romsSelectedValidAt).map((value) => <option key={value} value={value}>{value}</option>)}</select><span className="mt-1 block text-[#899793]">시간대·모델 lead 미명시</span></label> : null}</div>;
}
