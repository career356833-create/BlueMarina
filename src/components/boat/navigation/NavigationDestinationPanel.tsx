"use client";

import { useState, type FormEvent } from "react";
import { Crosshair, MapPin, Navigation } from "lucide-react";
import type { NavigationDestination } from "@/lib/marine-navigation/types";

export function NavigationDestinationPanel({ destination, options, onSelect }: { destination: NavigationDestination | null; options: NavigationDestination[]; onSelect: (value: NavigationDestination) => void }) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(latitude); const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError("유효한 위도와 경도를 입력하세요."); return; }
    setError(null);
    onSelect({ id: `manual:${lat},${lng}`, name: "입력 좌표", latitude: lat, longitude: lng, sourceType: "manual" });
  }
  return (
    <section className="border-b border-white/10 px-5 py-5" aria-labelledby="destination-title">
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold text-[#d2b178]">DESTINATION</p><h2 id="destination-title" className="mt-1 font-serif text-xl">목적지 선택</h2></div><Crosshair size={19} className="text-[#7da8a5]" /></div>
      <div className="mt-4 border-l-2 border-[#d2b178] bg-white/[0.035] px-3 py-2.5"><p className="text-xs text-[#9faaa6]">현재 선택</p><p className="mt-1 truncate text-sm font-medium">{destination?.name ?? "지도 또는 목록에서 선택"}</p>{destination ? <p className="mt-1 font-mono text-[10px] text-[#9faaa6]">{destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</p> : null}</div>
      <div className="mt-3 space-y-1">{options.map((option) => <button key={option.id} type="button" onClick={() => onSelect(option)} className="flex min-h-11 w-full items-center gap-3 border-b border-white/10 text-left text-sm hover:text-[#e1c28e]"><MapPin size={15} className="text-[#7da8a5]" /><span className="flex-1">{option.name}</span><span className="text-[9px] text-[#7f8d89]">SAMPLE</span></button>)}</div>
      <form className="mt-4" onSubmit={submit}><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-[#9faaa6]">위도<input value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" className="mt-1 h-10 w-full border border-white/15 bg-[#071b20] px-2.5 text-sm outline-none" /></label><label className="text-[10px] text-[#9faaa6]">경도<input value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" className="mt-1 h-10 w-full border border-white/15 bg-[#071b20] px-2.5 text-sm outline-none" /></label></div>{error ? <p className="mt-2 text-xs text-[#efbd70]">{error}</p> : null}<button type="submit" className="mt-2 flex h-10 w-full items-center justify-center gap-2 border border-[#d2b178]/50 text-xs text-[#e8d4ae]"><Navigation size={14} /> 좌표 선택</button></form>
    </section>
  );
}
