"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { khoaTideStationSnapshots } from "@/data/khoa-tide-stations";
import type { FishingConditionRealtimeEnvironment } from "@/lib/fishing-condition/nifs-realtime-fishing";
import type { NifsRealtimeEnvironmentResponse } from "@/lib/fishing-condition/nifs-realtime-fishing-server";
import type { KmaMarineObservation, KmaMarineStation } from "@/lib/sea-info/kma-marine-observation";
import type { KmaMarineForecast } from "@/lib/sea-info/kma-marine-forecast";
import type { KmaMarineWeatherWarningsResponse } from "@/lib/marine-navigation/adapters/kma-marine-weather-warnings";
import type { KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import type { TideForecastResponse } from "@/lib/sea-info/types";
import { classifyTodaySeaSource, formatSeoulCalendarDate, selectExplicitStation, type TodaySeaSourceResult, type TodaySeaSourceStatus } from "@/lib/today-sea/source-state";

type Source<T> = TodaySeaSourceResult<T> & { loading: boolean };
type KmaObservationResponse = { observations: KmaMarineObservation[]; fetchedAt: string; lastSuccessfulFetchAt: string };
type KmaStationResponse = { stations: KmaMarineStation[]; fetchedAt: string };
type KmaForecastResponse = { data: KmaMarineForecast; fetchedAt: string; lastSuccessfulFetchAt: string };
type TideResponse = { data: TideForecastResponse; lastSuccessfulFetchAt: string };

function useSource<T>(url: string | null): Source<T> {
  const [result, setResult] = useState<Source<T>>({ status: "UNKNOWN", data: null, code: null, loading: Boolean(url) });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let active = true;
    fetch(url, { signal: controller.signal })
      .then(async (response) => classifyTodaySeaSource<T>(response.ok, await response.json()))
      .then((next) => { if (active) setResult({ ...next, loading: false }); })
      .catch(() => { if (active) setResult({ status: "ERROR", data: null, code: "NETWORK_ERROR", loading: false }); });
    return () => { active = false; controller.abort(); };
  }, [url]);
  // The URL is a user-selected source context; old data must never be presented under a new selection.
  const [previousUrl, setPreviousUrl] = useState(url);
  if (previousUrl !== url) {
    setPreviousUrl(url);
    setResult({ status: "UNKNOWN", data: null, code: null, loading: Boolean(url) });
  }
  return result;
}

function Status({ status, loading }: { status: TodaySeaSourceStatus; loading: boolean }) {
  const label = loading ? "LOADING" : status;
  return <span className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#e8c98f]">{label}</span>;
}

function sourceTime(value: string | null | undefined) {
  return value ? <time dateTime={value}>{value}</time> : "제공되지 않음";
}

function numberOrUnknown(value: number | null | undefined, unit: string) {
  return typeof value === "number" && Number.isFinite(value) ? `${value} ${unit}` : "자료 없음";
}

function SourceCard({ title, organization, kind, state, children }: {
  title: string;
  organization: string;
  kind: string;
  state: Source<unknown>;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 border border-white/15 bg-[#0a1b2a]/80 p-5 shadow-lg backdrop-blur-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] text-[#d5b477]">{organization} · {kind}</p><h3 className="mt-1 font-serif text-xl text-white">{title}</h3></div>
        <Status status={state.status} loading={state.loading} />
      </div>
      <div className="mt-4 text-sm leading-6 text-white/80">{children}</div>
      {state.status === "DISABLED" ? <p className="mt-3 text-xs text-white/55">현재 데이터 소스가 활성화되지 않았습니다.</p> : null}
      {state.status === "ERROR" ? <p className="mt-3 text-xs text-white/55">자료를 불러오지 못했습니다. ({state.code})</p> : null}
    </article>
  );
}

const selectClass = "mt-3 min-h-11 w-full min-w-0 rounded-sm border border-white/25 bg-[#071522] px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d5b477]";
const detailClass = "min-w-0 border-t border-white/15 py-5";

export function TodaySeaOperationalHub() {
  const [tideStationId, setTideStationId] = useState("");
  const [tideDate, setTideDate] = useState("");
  const [risaStationId, setRisaStationId] = useState("");
  const [kmaStationId, setKmaStationId] = useState("");
  const [lzone, setLzone] = useState("");
  const [szone, setSzone] = useState("");
  const [requestedZone, setRequestedZone] = useState("");
  useEffect(() => setTideDate(formatSeoulCalendarDate(new Date())), []);
  const risa = useSource<NifsRealtimeEnvironmentResponse>("/api/fishing-condition/environment/realtime");
  const kmaStations = useSource<KmaStationResponse>("/api/sea-info/marine-observations/stations");
  const observation = useSource<KmaObservationResponse>(kmaStationId ? `/api/sea-info/marine-observations?stationId=${encodeURIComponent(kmaStationId)}` : null);
  const forecast = useSource<KmaForecastResponse>(requestedZone ? `/api/sea-info/marine-forecast?${requestedZone}` : null);
  const tide = useSource<TideResponse>(tideStationId && tideDate ? `/api/sea-info/tide?obsCode=${encodeURIComponent(tideStationId)}&date=${encodeURIComponent(tideDate)}` : null);
  const weatherWarnings = useSource<KmaMarineWeatherWarningsResponse>("/api/sea-info/weather-warnings");
  const navigationWarnings = useSource<KhoaNavigationWarningsResponse>("/api/sea-info/navigation-warnings");
  const selectedRisa = selectExplicitStation<FishingConditionRealtimeEnvironment>(risa.data?.stations ?? [], risaStationId);
  const selectedObservation = selectExplicitStation<KmaMarineObservation>(observation.data?.observations ?? [], kmaStationId);
  const selectedTideStation = khoaTideStationSnapshots.find((station) => station.stationId === tideStationId);

  return (
    <section id="today-sea-data" className="bg-[#06111f] px-5 pb-28 pt-14 text-white sm:px-8 lg:px-12 lg:pb-20" aria-labelledby="today-sea-data-title">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-[#d5b477]">PUBLIC MARINE DATA</p>
        <h2 id="today-sea-data-title" className="mt-3 font-serif text-3xl sm:text-4xl">현재 바다</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">공공기관의 관측·예보·예측·공지 자료를 각각 표시합니다. 관측소와 예보 구역은 직접 선택하세요. 자료가 없거나 지연되어도 다른 소스는 계속 확인할 수 있습니다.</p>
        <p className="mt-3 text-xs text-white/45">소스별 갱신 시각과 상태를 확인하세요.</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <SourceCard title="실측 수온" organization="국립수산과학원" kind="관측 · RISA" state={risa}>
            <label htmlFor="today-risa-station">관측 정점 직접 선택</label>
            <select id="today-risa-station" className={selectClass} value={risaStationId} onChange={(event) => setRisaStationId(event.target.value)} disabled={!risa.data}>
              <option value="">정점을 선택하세요</option>
              {risa.data?.stations.map((station) => <option key={station.stationId} value={station.stationId}>{station.stationName} ({station.stationId})</option>)}
            </select>
            {selectedRisa ? <div className="mt-4 space-y-1">
              {selectedRisa.freshness === "unavailable" ? <p>관측 시각이 기존 소스의 표시 가능 범위를 벗어났습니다. 수온 값은 표시하지 않습니다.</p> : <p>표층 {numberOrUnknown(selectedRisa.waterTemperature.surfaceC, "°C")} · 중층 {numberOrUnknown(selectedRisa.waterTemperature.middleC, "°C")} · 저층 {numberOrUnknown(selectedRisa.waterTemperature.bottomC, "°C")}</p>}
              <p className="text-xs text-white/55">정점 상태 {selectedRisa.freshness.toUpperCase()} · 원본 관측시각 {selectedRisa.rawObservedAt} · TIMEZONE_NOT_DOCUMENTED</p>
              <p className="text-xs text-white/55">수집 {sourceTime(risa.data?.fetchedAt)} · 보수 상태 {selectedRisa.repairStatus}</p>
            </div> : <p className="mt-3 text-xs text-white/55">선택 전에는 다른 정점의 값을 대신 표시하지 않습니다.</p>}
            {risa.data && risa.data.stations.length === 0 ? <p className="mt-3 text-xs text-white/55">현재 제공된 RISA 관측 정점이 없습니다.</p> : null}
            <Link href="/fishing-spots/conditions" className="mt-4 inline-block min-h-11 py-2.5 text-[#e8c98f] underline underline-offset-4">Fishing Conditions 보기</Link>
          </SourceCard>

          <SourceCard title="조석 고·저조" organization="국립해양조사원" kind="예측 · PREDICTION" state={tide}>
            <label htmlFor="today-tide-station">조석 정점 직접 선택</label>
            <select id="today-tide-station" className={selectClass} value={tideStationId} onChange={(event) => setTideStationId(event.target.value)}>
              <option value="">정점을 선택하세요</option>
              {khoaTideStationSnapshots.map((station) => <option key={station.stationId} value={station.stationId}>{station.region} · {station.name}</option>)}
            </select>
            <label htmlFor="today-tide-date" className="mt-3 block">예측 날짜</label>
            <input id="today-tide-date" type="date" className={selectClass} value={tideDate} onChange={(event) => setTideDate(event.target.value)} />
            {tide.data ? <div className="mt-4">
              <p>{selectedTideStation?.name} · {tide.data.data.date} 예측 · {tide.data.data.events.length}건</p>
              {tide.data.data.events.length === 0 ? <p>선택한 정점의 조석 예측 이벤트가 제공되지 않았습니다.</p> : null}
              <ul className="mt-2 space-y-1">{tide.data.data.events.slice(0, 4).map((event, index) => <li key={`${event.occurredAt}-${index}`}>{event.type === "high" ? "고조" : event.type === "low" ? "저조" : "유형 미확인"} {event.occurredAt} · {numberOrUnknown(event.predictedLevel, "cm")}</li>)}</ul>
              <p className="mt-2 text-xs text-white/55">기준면 DATUM_NOT_DOCUMENTED · 수집 {sourceTime(tide.data.lastSuccessfulFetchAt)}</p>
            </div> : null}
            <p className="mt-3 text-xs text-white/55">조석 예측을 실제 관측이나 안전 수심으로 해석하지 않습니다.</p>
          </SourceCard>
        </div>

        <div className="mt-8 border-y border-white/15">
          <details className={detailClass}>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">해양기상 · 기상청 예보와 관측</summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SourceCard title="해상 예보" organization="기상청" kind="예보 · MODEL/FORECAST" state={forecast}>
                <p>소해구 번호를 직접 입력해 조회합니다. 관측값이 아닙니다.</p>
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); if (/^\d+$/.test(lzone) && /^[1-9]$/.test(szone)) setRequestedZone(new URLSearchParams({ Lzone: lzone, Szone: szone }).toString()); }}>
                  <input aria-label="대해구 번호 Lzone" value={lzone} onChange={(event) => setLzone(event.target.value)} inputMode="numeric" pattern="[0-9]+" placeholder="Lzone" className="min-h-11 w-24 border border-white/25 bg-[#071522] px-2 text-white" required />
                  <input aria-label="소해구 번호 Szone" value={szone} onChange={(event) => setSzone(event.target.value)} inputMode="numeric" pattern="[1-9]" placeholder="Szone" className="min-h-11 w-24 border border-white/25 bg-[#071522] px-2 text-white" required />
                  <button className="min-h-11 border border-[#d5b477] px-4 text-[#e8c98f]">조회</button>
                </form>
                {forecast.data?.data.forecast ? <p className="mt-3">유효 {sourceTime(forecast.data.data.forecast.validAt)} · 발행 {sourceTime(forecast.data.data.forecast.issuedAt)}<br />유의파고 {numberOrUnknown(forecast.data.data.forecast.significantWaveHeightM, "m")} · 풍속 {numberOrUnknown(forecast.data.data.forecast.windSpeedMps, "m/s")}<br />수집 {sourceTime(forecast.data.fetchedAt)}</p> : null}
                {forecast.data && !forecast.data.data.forecast ? <p className="mt-3">요청한 소해구의 예보 행이 제공되지 않았습니다.</p> : null}
              </SourceCard>
              <SourceCard title="해양 관측" organization="기상청" kind="실측 · OBSERVED" state={kmaStationId ? observation : kmaStations}>
                <label htmlFor="today-kma-station">관측소 직접 선택</label>
                <select id="today-kma-station" className={selectClass} value={kmaStationId} onChange={(event) => setKmaStationId(event.target.value)} disabled={!kmaStations.data}>
                  <option value="">관측소를 선택하세요</option>
                  {kmaStations.data?.stations.map((station) => <option key={station.id} value={station.id}>{station.koreanName} ({station.id})</option>)}
                </select>
                {selectedObservation ? <p className="mt-3">관측 {sourceTime(selectedObservation.observedAt)} · 유의파고 {numberOrUnknown(selectedObservation.significantWaveHeightM, "m")} · 풍속 {numberOrUnknown(selectedObservation.windSpeedMs, "m/s")} · 수온 {numberOrUnknown(selectedObservation.seaTemperatureC, "°C")}<br />수집 {sourceTime(observation.data?.fetchedAt)}</p> : null}
                {kmaStationId && observation.data && !selectedObservation ? <p className="mt-3">선택한 정점의 관측값이 제공되지 않았습니다.</p> : null}
              </SourceCard>
            </div>
          </details>

          <details className={detailClass}>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">특보·항행 공지 · 기관별 참고정보</summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SourceCard title="해상 기상특보" organization="기상청" kind="특보 · 참고정보" state={weatherWarnings}>
                {weatherWarnings.data ? <><p>제공된 해상특보 {weatherWarnings.data.warnings.length}건 · 수집 {sourceTime(weatherWarnings.data.fetchedAt)}</p><ul className="mt-2 space-y-1">{weatherWarnings.data.warnings.slice(0, 3).map((warning) => <li key={warning.id}>{warning.areaName ?? warning.regionId} · {warning.warningType} {warning.warningLevel} · {warning.status}</li>)}</ul></> : null}
                <p className="mt-3 text-xs text-white/55">표시 건수 0도 안전 판정이 아닙니다. 최신 공식 특보를 확인하세요.</p>
              </SourceCard>
              <SourceCard title="항행경보" organization="국립해양조사원" kind="공지 · 참고정보" state={navigationWarnings}>
                {navigationWarnings.data ? <><p>제공된 공지 {navigationWarnings.data.warnings.length}건 · 수집 {sourceTime(navigationWarnings.data.fetchedAt)}</p><ul className="mt-2 space-y-1">{navigationWarnings.data.warnings.slice(0, 3).map((warning) => <li key={warning.id}>{warning.title ?? warning.documentNumber} · {warning.status}</li>)}</ul></> : null}
                <p className="mt-3 text-xs text-white/55">UNKNOWN lifecycle은 확정된 현재 위험구역으로 해석하지 않습니다.</p>
              </SourceCard>
            </div>
          </details>
        </div>

        <nav aria-label="바다 도구" className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/sea" className="flex min-h-12 items-center justify-center border border-[#d5b477] px-5 text-center font-semibold text-[#e8c98f]">바다 지도에서 보기</Link>
          <Link href="/sea/navigation" className="flex min-h-12 items-center justify-center border border-white/25 px-5 text-center font-semibold text-white">항법 화면으로 이동</Link>
        </nav>
        <p className="mt-4 text-xs leading-5 text-white/50">항법 목적지는 여기서 자동 생성하지 않습니다. 예보·관측·조석·특보는 참고자료이며 출항 가능 여부나 안전 경로를 판정하지 않습니다.</p>
      </div>
    </section>
  );
}
