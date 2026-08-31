"use client";

import { CircleStop, Pause, Play, Radio, Trash2 } from "lucide-react";
import type { TrackSession } from "@/lib/marine-navigation/types";

export function TrackRecorder({ activeTrack, savedTrackCount, onStart, onPause, onResume, onStop, onClear }: {
  activeTrack: TrackSession | null; savedTrackCount: number; onStart: () => void; onPause: () => void; onResume: () => void; onStop: () => void; onClear: () => void;
}) {
  const status = activeTrack?.status ?? "idle";
  return (
    <section className="px-5 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Radio size={14} className={status === "recording" ? "text-[#e5b45e]" : "text-[#7da8a5]"} /><h2 className="text-sm font-semibold">항적 기록</h2></div><span className="text-[10px] text-[#87948f]">{activeTrack?.points.length ?? 0} POINTS</span></div>
      <div className="mt-3 flex gap-2">
        {!activeTrack || status === "completed" ? <button type="button" onClick={onStart} title="항적 기록 시작" className="grid size-10 place-items-center border border-[#d2b178]/55"><Play size={16} /></button> : status === "recording" ? <button type="button" onClick={onPause} title="항적 기록 일시정지" className="grid size-10 place-items-center border border-white/15"><Pause size={16} /></button> : <button type="button" onClick={onResume} title="항적 기록 계속" className="grid size-10 place-items-center border border-[#d2b178]/55"><Play size={16} /></button>}
        <button type="button" onClick={onStop} disabled={!activeTrack || status === "completed"} title="항적 기록 종료" className="grid size-10 place-items-center border border-white/15 disabled:opacity-30"><CircleStop size={16} /></button>
        <button type="button" onClick={onClear} disabled={!savedTrackCount} title="모든 항적 삭제" className="grid size-10 place-items-center border border-white/15 disabled:opacity-30"><Trash2 size={15} /></button>
        <p className="ml-auto text-right text-[10px] leading-4 text-[#87948f]">10초 또는<br />10m 기준 저장</p>
      </div>
    </section>
  );
}
