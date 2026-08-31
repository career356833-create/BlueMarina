"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { leafletPrototypeAdapter, type MapPresentation } from "@/lib/marine-navigation/adapters/navigation-map-adapter";
import type { GeoPoint } from "@/lib/marine-navigation/types";

const markerIcon = (kind: "vessel" | "destination" | "waypoint") => L.divIcon({ className: "", html: `<span class="bm-navigation-marker bm-navigation-marker--${kind}" aria-hidden="true"></span>`, iconSize: kind === "waypoint" ? [18, 18] : [30, 30], iconAnchor: kind === "waypoint" ? [9, 9] : [15, 15] });

export default function LeafletPrototypeNavigationMap({ presentation, onPointSelect }: { presentation: MapPresentation; onPointSelect: (point: GeoPoint) => void }) {
  const elementRef = useRef<HTMLDivElement>(null); const mapRef = useRef<L.Map | null>(null); const layerRef = useRef<L.LayerGroup | null>(null); const callbackRef = useRef(onPointSelect); const lastDestinationRef = useRef<string | null>(null);
  useEffect(() => { callbackRef.current = onPointSelect; }, [onPointSelect]);
  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: false }).setView([leafletPrototypeAdapter.defaultCenter.latitude, leafletPrototypeAdapter.defaultCenter.longitude], leafletPrototypeAdapter.defaultZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map); const layer = L.layerGroup().addTo(map);
    map.on("click", (event) => callbackRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng })); mapRef.current = map; layerRef.current = layer; window.setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);
  useEffect(() => {
    const map = mapRef.current; const layer = layerRef.current; if (!map || !layer) return; layer.clearLayers();
    if (presentation.track.length > 1) L.polyline(presentation.track.map((p) => [p.latitude, p.longitude] as L.LatLngTuple), { color: "#1c6c72", weight: 4, opacity: 0.9 }).addTo(layer);
    presentation.waypoints.forEach((p) => L.marker([p.latitude, p.longitude], { icon: markerIcon("waypoint") }).bindTooltip(p.name).addTo(layer));
    if (presentation.destination) L.marker([presentation.destination.latitude, presentation.destination.longitude], { icon: markerIcon("destination") }).bindTooltip(presentation.destination.name).addTo(layer);
    if (presentation.vessel) { L.marker([presentation.vessel.latitude, presentation.vessel.longitude], { icon: markerIcon("vessel") }).bindTooltip("현재 위치").addTo(layer); if (presentation.vessel.accuracyMeters) L.circle([presentation.vessel.latitude, presentation.vessel.longitude], { radius: presentation.vessel.accuracyMeters, color: "#6f9e9d", fillOpacity: 0.08, weight: 1 }).addTo(layer); }
    if (presentation.vessel && presentation.destination) L.polyline([[presentation.vessel.latitude, presentation.vessel.longitude], [presentation.destination.latitude, presentation.destination.longitude]], { color: "#caa66c", weight: 2, opacity: 0.78, dashArray: "7 9" }).bindTooltip("직선 방위선 · 안전항로 아님").addTo(layer);
    if (presentation.destination && presentation.destination.id !== lastDestinationRef.current) { lastDestinationRef.current = presentation.destination.id; if (presentation.vessel) map.fitBounds([[presentation.vessel.latitude, presentation.vessel.longitude], [presentation.destination.latitude, presentation.destination.longitude]], { padding: [56, 56], maxZoom: 15 }); else map.setView([presentation.destination.latitude, presentation.destination.longitude], 14); }
  }, [presentation]);
  return <div ref={elementRef} className="bm-navigation-map h-full w-full" aria-label="Marine navigation prototype map" />;
}
