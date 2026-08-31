"use client";

import { BookmarkPlus, Flag, Trash2 } from "lucide-react";
import type { NavigationDestination, SavedWaypoint, VesselPosition } from "@/lib/marine-navigation/types";

export function WaypointPanel({ waypoints, vessel, destination, onSave, onDelete, onSelect }: {
  waypoints: SavedWaypoint[]; vessel: VesselPosition | null; destination: NavigationDestination | null;
  onSave: (point: NavigationDestination) => void; onDelete: (id: string) => void; onSelect: (point: SavedWaypoint) => void;
}) {
  return (
    <section className="border-b border-white/10 px-5 py-4" aria-labelledby="waypoint-title">
      <div className="flex items-center justify-between"><h2 id="waypoint-title" className="text-sm font-semibold">WAYPOINT</h2><span className="text-[10px] text-[#87948f]">LOCAL · {waypoints.length}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={!destination} onClick={() => destination && onSave(destination)} className="flex h-10 items-center justify-center gap-2 border border-white/15 text-xs disabled:opacity-35"><BookmarkPlus size={14} /> 목적지 저장</button>
        <button type="button" disabled={!vessel} onClick={() => vessel && onSave({ id: `position-${vessel.timestamp}`, name: "현재 위치", latitude: vessel.latitude, longitude: vessel.longitude, sourceType: "manual" })} className="flex h-10 items-center justify-center gap-2 border border-white/15 text-xs disabled:opacity-35"><Flag size={14} /> 현재 위치</button>
      </div>
      {waypoints.length ? <div className="bm-navigation-scrollbar mt-3 max-h-32 overflow-y-auto">{waypoints.map((waypoint) => <div key={waypoint.id} className="flex min-h-10 items-center border-t border-white/10"><button type="button" onClick={() => onSelect(waypoint)} className="min-w-0 flex-1 truncate text-left text-xs hover:text-[#d2b178]">{waypoint.name}</button><button type="button" onClick={() => onDelete(waypoint.id)} title="Waypoint 삭제" className="grid size-9 place-items-center text-[#87948f]"><Trash2 size={14} /></button></div>)}</div> : null}
    </section>
  );
}
