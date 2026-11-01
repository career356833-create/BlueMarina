"use client";

import { useState } from "react";
import { BASEMAP_OPTIONS, type BasemapId, type BasemapState } from "@/lib/marine-navigation/basemaps";

export function NavigationBasemapPicker({ state, available, onSelect }: { state: BasemapState; available: boolean; onSelect: (id: BasemapId) => void }) {
  const [open, setOpen] = useState(false);
  const displayed = BASEMAP_OPTIONS.find(option => option.id === state.displayed)!;
  return <div className="absolute left-16 right-16 top-16 z-[525] max-w-72" data-testid="navigation-basemap-picker">
    <button type="button" aria-expanded={open} aria-controls="navigation-basemap-options" onClick={() => setOpen(value => !value)} className="min-h-11 rounded-xl border border-white/25 bg-[#06131a]/95 px-3 text-xs text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]">지도 · {displayed.label}{state.status === "LOADING" ? " · 로딩" : state.status === "UNAVAILABLE" ? " · 연결 확인" : ""}</button>
    {open ? <section id="navigation-basemap-options" aria-label="배경 지도 선택" className="mt-2 max-h-[45dvh] overflow-y-auto rounded-xl border border-white/25 bg-[#061b23]/95 p-3 text-white shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">배경 지도</h2><button type="button" aria-label="배경 지도 선택 닫기" onClick={() => setOpen(false)} className="min-h-11 min-w-11 rounded border border-white/20 text-xs">닫기</button></div>
      <div className="grid grid-cols-2 gap-2">{BASEMAP_OPTIONS.map(option => <button key={option.id} type="button" disabled={option.id !== "standard" && !available} aria-pressed={state.displayed === option.id} onClick={() => onSelect(option.id)} className={`min-h-14 rounded-lg border px-2 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9] disabled:cursor-not-allowed disabled:opacity-45 ${state.displayed === option.id ? "border-[#8fffe9] bg-[#184b52]" : "border-white/20 bg-white/5"}`}><span className="block text-xs font-semibold">{option.label}</span><span className="mt-1 block text-[10px] leading-snug text-[#c5d5d7]">{option.description}</span></button>)}</div>
      <p role="status" className="mt-2 text-[11px] leading-relaxed text-[#d3e4e5]">{!available ? "해양·위성·야간 지도는 연결 준비 중입니다. 현재 기본 지도를 이용할 수 있습니다." : state.status === "LOADING" ? `새 지도 불러오는 중 · 현재 ${displayed.label} 지도 유지` : state.status === "UNAVAILABLE" ? `새 지도를 불러오지 못했습니다. ${displayed.label} 지도를 표시합니다. 다시 선택해 재시도할 수 있습니다.` : `${displayed.label} 지도 표시 중`}</p>
      <p className="mt-2 text-[10px] leading-relaxed text-[#d3e4e5]">한글 지명·섬 이름 · 파란 선: 여객선 노선 · 보라색 선: 경계. 작은 지명은 확대하면 표시됩니다. 기존 해양 레이어는 유지됩니다.</p>
      <p className="mt-2 text-[10px] leading-relaxed text-[#b0c6ca]">위성영상은 실시간이 아닙니다. 해저 음영·등심선은 참고용이며 공식 해도와 안전항로를 대신하지 않습니다.</p>
    </section> : null}
  </div>;
}
