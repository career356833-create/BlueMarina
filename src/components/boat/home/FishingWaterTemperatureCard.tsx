"use client";

import Link from "next/link";
import { Thermometer } from "lucide-react";
import { useEffect, useState } from "react";
import type { NifsRealtimeEnvironmentResponse } from "@/lib/fishing-condition/nifs-realtime-fishing-server";

export function FishingWaterTemperatureCard() {
  const [source, setSource] = useState<NifsRealtimeEnvironmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stationId, setStationId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fishing-condition/environment/realtime", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        const body: unknown = await response.json();
        if (!body || typeof body !== "object") return null;
        const result = body as Partial<NifsRealtimeEnvironmentResponse>;
        return result.ok === true && result.source?.sourceId === "nifs-risa" && Array.isArray(result.stations)
          ? result as NifsRealtimeEnvironmentResponse
          : null;
      })
      .then((result) => { if (!controller.signal.aborted) setSource(result); })
      .catch(() => { if (!controller.signal.aborted) setSource(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  // A fishing spot is not an observation station. Show a number only after an explicit choice.
  const station = stationId ? source?.stations.find((item) => item.stationId === stationId) : null;
  const temperature = station?.waterTemperature.surfaceC;
  const canShowTemperature = source?.freshness !== "unavailable"
    && station?.freshness !== "unavailable"
    && typeof temperature === "number"
    && Number.isFinite(temperature);
  const stale = source?.freshness === "stale" || source?.cacheStatus === "stale_fallback" || station?.freshness === "stale";

  return (
    <article className="col-span-2 border border-white/18 bg-[#06111d]/82 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5 lg:col-span-1">
      <div className="flex items-start gap-3">
        <Thermometer className="mt-0.5 shrink-0 text-[#e2bd7d]" size={20} strokeWidth={1.45} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold tracking-[0.18em] text-[#d5b477]">관측 수온 · NIFS RISA</p>
          <p className="mt-2 font-serif text-lg text-[#f4f0e8]" aria-live="polite">
            {canShowTemperature ? `${temperature}°C` : loading ? "불러오는 중" : !source?.stations.length || stationId ? "수온 자료 없음" : "관측소 선택"}
          </p>
          <label htmlFor="fishing-hero-risa-station" className="sr-only">수온 관측소 선택</label>
          <select
            id="fishing-hero-risa-station"
            value={stationId}
            onChange={(event) => setStationId(event.target.value)}
            disabled={!source?.stations.length}
            className="mt-2 min-h-11 w-full min-w-0 border border-white/30 bg-[#071522] px-2 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e2bd7d] disabled:opacity-60"
          >
            <option value="">관측소를 선택하세요</option>
            {source?.stations.map((item) => <option key={item.stationId} value={item.stationId}>{item.stationName} ({item.stationId})</option>)}
          </select>
          {canShowTemperature && station ? (
            <p className="mt-2 break-words text-[10px] leading-4 text-white/65">
              {stale ? "오래된 관측" : "표층 관측"} · 원본 시각 {station.rawObservedAt} · 시간대 미기재
            </p>
          ) : <p className="mt-2 text-[10px] leading-4 text-white/55">{!loading && !source?.stations.length ? "현재 관측 자료를 불러올 수 없습니다." : "포인트 수온으로 추정하지 않습니다."}</p>}
          <Link href="/today-sea#today-sea-data" className="mt-2 inline-flex min-h-11 items-center text-[11px] text-[#e8c98f] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e2bd7d]">관측 자료 자세히 보기</Link>
        </div>
      </div>
    </article>
  );
}
