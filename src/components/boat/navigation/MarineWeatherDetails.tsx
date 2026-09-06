"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudSun, X } from "lucide-react";
import {
  deriveKmaMarineWeatherFreshness,
  KMA_MARINE_WEATHER_FORECAST_URL,
  KMA_MARINE_WEATHER_SAFETY_NOTICE,
  windDirectionToCompass16,
  type KmaMarineWeatherForecastZone,
  type KmaMarineWeatherFreshness,
} from "@/lib/marine-navigation/adapters/kma-marine-weather";
import type { KmaMarineForecast } from "@/lib/sea-info/kma-marine-forecast";

type ForecastResponse = {
  ok: true;
  data: KmaMarineForecast;
  freshness: "fresh" | "stale";
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
};

type PanelState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; response: ForecastResponse; freshness: KmaMarineWeatherFreshness };

function value(value: number | null | undefined, suffix: string) {
  return value == null ? "자료 없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} ${suffix}`;
}

function time(value: string | null | undefined) {
  if (!value) return "자료 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function MarineWeatherDetails({ zone, onClose }: { zone: KmaMarineWeatherForecastZone; onClose: () => void }) {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    const params = new URLSearchParams({ Lzone: String(zone.lzone), Szone: String(zone.szone) });
    fetch(`${KMA_MARINE_WEATHER_FORECAST_URL}?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as unknown;
        if (!response.ok || !payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true) throw new Error("KMA_FORECAST_UNAVAILABLE");
        return payload as ForecastResponse;
      })
      .then((response) => {
        const issuedAt = response.data.forecast?.issuedAt;
        setState({ status: "ready", response, freshness: response.freshness === "stale" ? "stale" : deriveKmaMarineWeatherFreshness(issuedAt) });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [zone.lzone, zone.szone]);

  const forecast = state.status === "ready" ? state.response.data.forecast : undefined;
  const direction = useMemo(() => windDirectionToCompass16(forecast?.windDirectionDeg), [forecast?.windDirectionDeg]);
  const freshnessLabel = state.status === "loading" ? "LOADING" : state.status === "failed" || state.freshness === "unavailable" ? "UNAVAILABLE" : state.freshness === "stale" ? "STALE" : "FORECAST";

  return (
    <section className="mt-2 border border-[#d2b178]/35 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label="해양기상 예측 정보">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] text-[#d2b178]"><CloudSun size={12} aria-hidden="true" /> KMA FORECAST MODEL</p>
          <h2 className="mt-1 font-serif text-base">해구 {zone.lzone} · 소해구 {zone.szone}</h2>
          <p className="mt-0.5 text-[9px] text-[#899793]">대표 중심 {zone.latitude.toFixed(3)}, {zone.longitude.toFixed(3)}</p>
        </div>
        <div className="flex items-center gap-2"><span className={`text-[9px] ${freshnessLabel === "FORECAST" ? "text-[#8bbca9]" : "text-[#d6a878]"}`}>{freshnessLabel}</span><button type="button" onClick={onClose} className="grid size-7 place-items-center border border-white/15" aria-label="해양기상 정보 닫기"><X size={13} /></button></div>
      </div>

      {state.status === "loading" ? <p className="mt-4 text-[10px] text-[#899793]">기상청 예측을 불러오는 중입니다.</p> : null}
      {state.status === "failed" || (state.status === "ready" && (!forecast || state.freshness === "unavailable")) ? <p className="mt-4 border-l-2 border-[#d0a064] px-2.5 text-[10px] leading-5 text-[#dbc8a9]">현재 이 해구의 예측을 표시할 수 없습니다.</p> : null}
      {state.status === "ready" && forecast && state.freshness !== "unavailable" ? <>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-[10px]">
          <div><dt className="text-[#82928e]">유의파고</dt><dd className="mt-0.5">{value(forecast.significantWaveHeightM, "m")}</dd></div>
          <div><dt className="text-[#82928e]">최대파주기</dt><dd className="mt-0.5">{value(forecast.maxWavePeriodSec, "s")}</dd></div>
          <div><dt className="text-[#82928e]">풍속</dt><dd className="mt-0.5">{value(forecast.windSpeedMps, "m/s")}</dd></div>
          <div><dt className="text-[#82928e]">풍향</dt><dd className="mt-0.5">{forecast.windDirectionDeg == null ? "자료 없음" : `${forecast.windDirectionDeg}°${direction ? ` (${direction})` : ""}`}</dd></div>
          <div><dt className="text-[#82928e]">수온</dt><dd className="mt-0.5">{value(forecast.waterTemperatureC, "°C")}</dd></div>
          <div><dt className="text-[#82928e]">시정</dt><dd className="mt-0.5">{value(forecast.visibilityM, "m")}</dd></div>
          <div className="col-span-2"><dt className="text-[#82928e]">발표 / 발효 시각</dt><dd className="mt-0.5">{time(forecast.issuedAt)}<br />{time(forecast.validAt)}</dd></div>
          <div className="col-span-2"><dt className="text-[#82928e]">마지막 조회</dt><dd className="mt-0.5">{time(state.response.fetchedAt)}</dd></div>
        </dl>
      </> : null}

      <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">{KMA_MARINE_WEATHER_SAFETY_NOTICE}</p>
      <p className="mt-3 border-t border-white/10 pt-2 text-[9px] leading-4 text-[#899793]">출처: 기상청(KMA) 소해구별 예측데이터<br />관측값이 아닌 수치모델 예측입니다.</p>
    </section>
  );
}
