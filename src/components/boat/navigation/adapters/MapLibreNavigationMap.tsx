"use client";

import { useEffect, useRef } from "react";
import type { MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { GeoPoint } from "@/lib/marine-navigation/types";
import { MapLibreNavigationProvider } from "./MapLibreNavigationProvider";

export default function MapLibreNavigationMap({ presentation, onPointSelect }: { presentation: MapPresentation; onPointSelect: (point: GeoPoint) => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<MapLibreNavigationProvider | null>(null);
  const pointSelectRef = useRef(onPointSelect);

  useEffect(() => {
    if (!elementRef.current || providerRef.current) return;
    const provider = new MapLibreNavigationProvider(elementRef.current, (point) => pointSelectRef.current(point));
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
    pointSelectRef.current = onPointSelect;
    providerRef.current?.setPointSelectHandler(onPointSelect);
  }, [onPointSelect]);

  useEffect(() => {
    providerRef.current?.setPresentation(presentation);
  }, [presentation]);

  return <div ref={elementRef} className="bm-navigation-map h-full w-full" aria-label="MapLibre marine navigation map" />;
}
