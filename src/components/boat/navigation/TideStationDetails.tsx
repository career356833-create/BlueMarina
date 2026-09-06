"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchTideInfo, type TideInfoResult } from "@/lib/sea-info/api";
import { KHOA_TIDE_STATION_DATUM_STATUS, KHOA_TIDE_STATION_SAFETY_NOTICE, type KhoaTideStation } from "@/lib/marine-navigation/adapters/khoa-tide-stations";

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function TideStationDetails({ station, onClose }: { station: KhoaTideStation; onClose: () => void }) {
  const [result, setResult] = useState<TideInfoResult | null>(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    void fetchTideInfo(station.stationId, todayInKorea()).then((next) => {
      if (active) setResult(next);
    });
    return () => { active = false; };
  }, [station.stationId]);

  return (
    <section className="mt-2 border border-[#6f9e9d]/50 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label="조석 관측소 정보">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] tracking-[0.12em] text-[#7fb0ad]">TIDE STATION</p><h2 className="mt-1 font-serif text-base">{station.name}</h2><p className="mt-0.5 text-[9px] text-[#899793]">{station.stationId} · {station.region}</p></div>
        <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center border border-white/15" aria-label="조석 관측소 정보 닫기"><X size={13} /></button>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3 text-[10px]">
        <p className="text-[#82928e]">최근 실측 조위</p><p className="mt-1 text-[#d6a878]">현재 연결된 공식 계약에서 제공하지 않음</p>
        {!result ? <p className="mt-3 text-[#899793]">오늘의 예측을 불러오는 중...</p> : result.ok ? <>
          <div className="mt-3 flex items-center justify-between"><p className="text-[#82928e]">공식 고·저조 예측</p><span className={result.freshness === "fresh" ? "text-[#8bbca9]" : "text-[#d6a878]"}>{result.freshness === "fresh" ? "최신" : "갱신 지연"}</span></div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {result.data.events.map((event) => <div key={`${event.occurredAt}:${event.type}`} className="border border-white/10 px-2 py-1.5"><span className="text-[#899793]">{event.type === "high" ? "고조" : event.type === "low" ? "저조" : "예측"}</span><span className="ml-2">{formatTime(event.occurredAt)}</span>{event.predictedLevel != null ? <span className="block pt-0.5 text-[#c9d8d3]">원문값 {event.predictedLevel}</span> : null}</div>)}
          </div>
          <p className="mt-2 text-[8px] text-[#899793]">마지막 성공 조회 {new Date(result.lastSuccessfulFetchAt).toLocaleString("ko-KR")}</p>
        </> : <p className="mt-3 text-[#d58a7a]">예측 정보를 불러오지 못했습니다. 관측소 위치는 계속 표시됩니다.</p>}
      </div>
      <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">예측값의 공식 단위·기준면: {KHOA_TIDE_STATION_DATUM_STATUS}<br />{KHOA_TIDE_STATION_SAFETY_NOTICE}</p>
      <p className="mt-3 border-t border-white/10 pt-2 text-[9px] text-[#899793]">출처: 국립해양조사원(KHOA)</p>
    </section>
  );
}
