"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { KMA_MARINE_OBSERVATIONS_DETAIL_URL, KMA_MARINE_OBSERVATION_SAFETY_NOTICE, type KmaMarineObservationDetailResponse } from "@/lib/marine-navigation/adapters/kma-marine-observations";
import type { KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";

type DetailState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; data: KmaMarineObservationDetailResponse };

function value(input: number | null | undefined, unit: string) {
  return input == null ? "자료 없음" : `${input} ${unit}`;
}

function direction(input: number | null | undefined) {
  return input == null ? "자료 없음" : `${input}°`;
}

function time(input: string | null | undefined) {
  if (!input) return "자료 없음";
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? input : date.toLocaleString("ko-KR");
}

export function MarineObservationDetails({ station, onClose }: { station: KmaMarineStation; onClose: () => void }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`${KMA_MARINE_OBSERVATIONS_DETAIL_URL}/${encodeURIComponent(station.id)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Observation detail unavailable");
        return response.json() as Promise<KmaMarineObservationDetailResponse>;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [station.id]);

  const observation = state.status === "ready" ? state.data.observation : null;
  const buoy = state.status === "ready" ? state.data.buoyDetail : null;
  const freshness = state.status === "ready" ? state.data.freshness : null;

  return (
    <section className="mt-2 border border-[#d4b575]/45 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label="KMA 해양기상 관측 정보">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] tracking-[0.12em] text-[#d4b575]">KMA OBSERVATION</p>
          <h2 className="mt-1 truncate font-serif text-base">{station.koreanName}</h2>
          <p className="mt-0.5 truncate text-[9px] text-[#899793]">{station.id}{station.englishName ? ` · ${station.englishName}` : ""}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center border border-white/15" aria-label="해양기상 관측 정보 닫기"><X size={13} /></button>
      </div>

      {state.status === "loading" ? <p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-[#899793]">최근 관측을 불러오는 중...</p> : null}
      {state.status === "failed" ? <p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-[#d58a7a]">관측 상세를 불러오지 못했습니다. 관측소 위치는 계속 표시됩니다.</p> : null}
      {state.status === "ready" ? <>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-[9px] tracking-[0.08em] text-[#b7c8c3]">최신 종합관측</p>
          <span className={`text-[9px] ${freshness === "fresh" ? "text-[#8bbca9]" : freshness === "stale" ? "text-[#d6a878]" : "text-[#d58a7a]"}`}>{freshness === "fresh" ? "최신" : freshness === "stale" ? "갱신 지연" : "사용 불가"}</span>
        </div>
        {observation ? <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
          <div className="col-span-2"><dt className="text-[#82928e]">관측시각</dt><dd className="mt-0.5">{time(observation.observedAt)}</dd></div>
          <div><dt className="text-[#82928e]">유의파고</dt><dd className="mt-0.5">{value(observation.significantWaveHeightM, "m")}</dd></div>
          <div><dt className="text-[#82928e]">풍속 / 돌풍</dt><dd className="mt-0.5">{value(observation.windSpeedMs, "m/s")} / {value(observation.gustSpeedMs, "m/s")}</dd></div>
          <div><dt className="text-[#82928e]">풍향</dt><dd className="mt-0.5">{direction(observation.windDirectionDeg)}</dd></div>
          <div><dt className="text-[#82928e]">해수면온도</dt><dd className="mt-0.5">{value(observation.seaTemperatureC, "°C")}</dd></div>
          <div><dt className="text-[#82928e]">기온</dt><dd className="mt-0.5">{value(observation.airTemperatureC, "°C")}</dd></div>
          <div><dt className="text-[#82928e]">해면기압</dt><dd className="mt-0.5">{value(observation.seaLevelPressureHpa, "hPa")}</dd></div>
          <div><dt className="text-[#82928e]">습도</dt><dd className="mt-0.5">{value(observation.humidityPct, "%")}</dd></div>
        </dl> : <p className="mt-2 text-[10px] text-[#d6a878]">이 관측소의 종합관측 자료가 없습니다.</p>}

        <p className="mt-3 border-t border-white/10 pt-3 text-[9px] tracking-[0.08em] text-[#b7c8c3]">부이 상세</p>
        {buoy ? <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
          <div><dt className="text-[#82928e]">최대 / 유의 / 평균파고</dt><dd className="mt-0.5">{value(buoy.maximumWaveHeightM, "m")} / {value(buoy.significantWaveHeightM, "m")} / {value(buoy.averageWaveHeightM, "m")}</dd></div>
          <div><dt className="text-[#82928e]">파주기 / 파향</dt><dd className="mt-0.5">{value(buoy.wavePeriodSec, "sec")} / {direction(buoy.waveDirectionDeg)}</dd></div>
          <div><dt className="text-[#82928e]">센서 1</dt><dd className="mt-0.5">{direction(buoy.windDirectionSensor1Deg)} · {value(buoy.windSpeedSensor1Ms, "m/s")} · {value(buoy.gustSensor1Ms, "m/s")}</dd></div>
          <div><dt className="text-[#82928e]">센서 2</dt><dd className="mt-0.5">{direction(buoy.windDirectionSensor2Deg)} · {value(buoy.windSpeedSensor2Ms, "m/s")} · {value(buoy.gustSensor2Ms, "m/s")}</dd></div>
        </dl> : <p className="mt-2 text-[10px] text-[#899793]">이 관측소의 부이 상세 자료가 없습니다.</p>}
        <p className="mt-2 text-[8px] text-[#899793]">마지막 조회 {time(state.data.fetchedAt)}</p>
      </> : null}

      <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">{KMA_MARINE_OBSERVATION_SAFETY_NOTICE}</p>
      <p className="mt-3 border-t border-white/10 pt-2 text-[9px] text-[#899793]">출처: 기상청(KMA) · 실측 관측<br />예보 모델과 독립된 자료입니다.</p>
    </section>
  );
}
