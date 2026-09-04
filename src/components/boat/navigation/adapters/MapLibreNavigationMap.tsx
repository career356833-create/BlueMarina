"use client";

import { useEffect, useRef } from "react";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import { createKhoaDeepWaterRouteLayerConfig, KHOA_DEEP_WATER_ROUTE_DATA_URL, KHOA_DEEP_WATER_ROUTE_LAYER_ID, parseKhoaDeepWaterRouteFeatureProperties, parseKhoaDeepWaterRouteGeoJson, type KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import { createKhoaHarborZoneLayerConfig, KHOA_HARBOR_ZONE_DATA_URL, KHOA_HARBOR_ZONE_LAYER_ID, parseKhoaHarborZoneFeatureProperties, parseKhoaHarborZoneGeoJson, type KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import { createKhoaNavigationAidsLayerConfig, KHOA_NAVIGATION_AIDS_DATA_URL, KHOA_NAVIGATION_AIDS_LAYER_ID, parseKhoaNavigationAidFeatureProperties, parseKhoaNavigationAidsGeoJson, type KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import type { GeoPoint } from "@/lib/marine-navigation/types";
import { MapLibreNavigationProvider } from "./MapLibreNavigationProvider";

export default function MapLibreNavigationMap({ presentation, deepWaterRouteVisible, harborZoneVisible, navigationAidsVisible, onPointSelect, onDeepWaterRouteSelect, onHarborZoneSelect, onNavigationAidSelect, onDeepWaterRouteStateChange, onHarborZoneStateChange, onNavigationAidsStateChange }: {
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
  const elementRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<MapLibreNavigationProvider | null>(null);
  const pointSelectRef = useRef(onPointSelect);
  const deepWaterRouteSelectRef = useRef(onDeepWaterRouteSelect);
  const harborZoneSelectRef = useRef(onHarborZoneSelect);
  const navigationAidSelectRef = useRef(onNavigationAidSelect);
  const deepWaterRouteVisibleRef = useRef(deepWaterRouteVisible);
  const harborZoneVisibleRef = useRef(harborZoneVisible);
  const navigationAidsVisibleRef = useRef(navigationAidsVisible);

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
    providerRef.current?.setPresentation(presentation);
  }, [presentation]);

  return <div ref={elementRef} className="bm-navigation-map h-full w-full" aria-label="MapLibre marine navigation map" />;
}
