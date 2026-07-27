"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  Info,
  KeyRound,
  LocateFixed,
  MapPin,
  Sunrise,
  Waves,
  Wind
} from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { marineObservatories, type MarineObservatoryData } from "@/data/marine-observatories";
import { fetchTideInfo, type TideInfoResult } from "@/lib/sea-info/api";
import { findNearestObservatory } from "@/lib/sea-info/distance";

const previewLocation = {
  lat: 35.1796,
  lng: 129.0756
};

const INITIAL_OBSERVATORY_VISIBLE_COUNT = 8;

const dataLabels: Record<MarineObservatoryData, string> = {
  tide: "조석",
  wave: "파고",
  waterTemperature: "수온",
  wind: "풍속·풍향",
  sunrise: "일출·일몰"
};

const futureCards = [
  {
    title: "만조·간조",
    description: "다음 고조와 저조 시각을 바로 확인하는 핵심 정보입니다.",
    icon: Waves
  },
  {
    title: "풍속·풍향",
    description: "출항 전 바람 상태를 짧게 확인할 수 있도록 준비합니다.",
    icon: Wind
  },
  {
    title: "파고",
    description: "해역 상황을 빠르게 가늠할 수 있는 대표 지표입니다.",
    icon: Compass
  },
  {
    title: "수온",
    description: "조황 판단에 참고할 수 있는 보조 정보입니다.",
    icon: Sunrise
  }
];

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "확인 불가";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatTimeOnly(value?: string | null) {
  if (!value) {
    return "데이터 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16) || value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function TideBadge({ kind }: { kind: "high" | "low" | "unknown" }) {
  if (kind === "high") {
    return <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-800">만조</span>;
  }

  if (kind === "low") {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">간조</span>;
  }

  return <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">미확인</span>;
}

function TideIcon({ kind }: { kind: "high" | "low" | "unknown" }) {
  if (kind === "high") {
    return <Waves size={18} className="text-sky-700" />;
  }

  if (kind === "low") {
    return <Sunrise size={18} className="text-amber-600" />;
  }

  return <Compass size={18} className="text-slate-500" />;
}

function statusTone(result: TideInfoResult | null) {
  if (!result) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (result.ok) {
    if (result.data.status === "unavailable") {
      return "border-amber-100 bg-amber-50 text-amber-950";
    }

    return "border-emerald-100 bg-emerald-50 text-emerald-950";
  }

  if (result.status >= 500 || result.status === 0) {
    return "border-rose-100 bg-rose-50 text-rose-950";
  }

  return "border-amber-100 bg-amber-50 text-amber-950";
}

function getStatusTitle(result: TideInfoResult | null, isCheckingTide: boolean) {
  if (isCheckingTide) {
    return "고·저조 정보를 불러오는 중입니다.";
  }

  if (!result) {
    return "관측소와 날짜를 선택한 뒤 고·저조를 조회해 주세요.";
  }

  if (result.ok) {
    if (result.data.status === "unavailable") {
      return "선택한 날짜에는 고·저조 예보가 아직 없습니다.";
    }

    return "국립해양조사원 고·저조 예보를 불러왔습니다.";
  }

  if (result.code === "SOURCE_ID_NEEDS_VERIFICATION") {
    return "이 관측소는 공식 obsCode 검증이 필요합니다.";
  }

  if (result.code === "MISSING_STATION") {
    return "관측소를 먼저 선택해 주세요.";
  }

  if (result.code === "INVALID_DATE" || result.code === "MISSING_DATE") {
    return "조회 날짜를 다시 확인해 주세요.";
  }

  return result.message || "고·저조 정보를 불러오지 못했습니다.";
}

export default function SeaInfoPage() {
  const nearestPreview = useMemo(() => findNearestObservatory(previewLocation, marineObservatories), []);
  const regions = useMemo(
    () => Array.from(new Set(marineObservatories.map((observatory) => observatory.region))).sort((a, b) => a.localeCompare(b, "ko")),
    []
  );

  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [selectedStationId, setSelectedStationId] = useState(() => nearestPreview?.observatory.id ?? marineObservatories[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [userMessage, setUserMessage] = useState("");
  const [tideResult, setTideResult] = useState<TideInfoResult | null>(null);
  const [isCheckingTide, setIsCheckingTide] = useState(false);
  const [visibleObservatoryCount, setVisibleObservatoryCount] = useState(INITIAL_OBSERVATORY_VISIBLE_COUNT);

  const verifiedStations = useMemo(
    () => marineObservatories.filter((observatory) => !observatory.needsVerification && observatory.sourceId),
    []
  );
  const pendingStations = marineObservatories.length - verifiedStations.length;

  const filteredStations = useMemo(() => {
    if (selectedRegion === "전체") {
      return marineObservatories;
    }

    return marineObservatories.filter((observatory) => observatory.region === selectedRegion);
  }, [selectedRegion]);

  const visibleObservatories = filteredStations.slice(0, visibleObservatoryCount);
  const hasMoreObservatories = visibleObservatories.length < filteredStations.length;

  const selectedStation = useMemo(
    () => marineObservatories.find((observatory) => observatory.id === selectedStationId) ?? null,
    [selectedStationId]
  );

  const orderedEvents = useMemo(() => {
    if (!tideResult?.ok) {
      return [];
    }

    return [...tideResult.data.events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }, [tideResult]);

  const nextHighEvent = useMemo(
    () => orderedEvents.find((event) => event.type === "high") ?? orderedEvents[0] ?? null,
    [orderedEvents]
  );
  const nextLowEvent = useMemo(
    () => orderedEvents.find((event) => event.type === "low") ?? orderedEvents[0] ?? null,
    [orderedEvents]
  );

  async function handleTideCheck() {
    if (!selectedStationId) {
      setTideResult({
        ok: false,
        status: 400,
        code: "MISSING_STATION",
        message: "관측소를 먼저 선택해 주세요.",
        date: selectedDate
      });
      return;
    }

    if (!selectedDate) {
      setTideResult({
        ok: false,
        status: 400,
        code: "MISSING_DATE",
        message: "조회 날짜를 선택해 주세요.",
        stationId: selectedStationId
      });
      return;
    }

    if (!selectedStation?.sourceId) {
      setTideResult({
        ok: false,
        status: 400,
        code: "MISSING_STATION",
        message: "이 관측소는 공식 obsCode가 아직 없어 조회할 수 없습니다.",
        stationId: selectedStationId,
        date: selectedDate
      });
      return;
    }

    if (selectedStation.needsVerification) {
      setTideResult({
        ok: false,
        status: 400,
        code: "SOURCE_ID_NEEDS_VERIFICATION",
        message: "이 관측소는 공식 obsCode 검증이 필요합니다.",
        stationId: selectedStationId,
        date: selectedDate
      });
      return;
    }

    setIsCheckingTide(true);
    setTideResult(null);

    try {
      const result = await fetchTideInfo(selectedStation.sourceId, selectedDate);
      setTideResult(result);
    } finally {
      setIsCheckingTide(false);
    }
  }

  function handleRegionChange(region: string) {
    setSelectedRegion(region);
    setTideResult(null);
    setVisibleObservatoryCount(INITIAL_OBSERVATORY_VISIBLE_COUNT);

    const nextStation =
      region === "전체" ? marineObservatories[0] : marineObservatories.find((observatory) => observatory.region === region);
    setSelectedStationId(nextStation?.id ?? "");
  }

  function handleStationChange(stationId: string) {
    setSelectedStationId(stationId);
    setTideResult(null);
  }

  const tideSummary = tideResult?.ok ? tideResult.data : null;
  const selectedStationLabel = selectedStation ? `${selectedStation.region} · ${selectedStation.name}` : "관측소를 선택해 주세요.";
  const selectedStationStatus = selectedStation
    ? selectedStation.needsVerification
      ? "검증 필요"
      : selectedStation.sourceId
        ? "API 조회 가능"
        : "obsCode 없음"
    : "미선택";
  const queryDisabled =
    isCheckingTide || !selectedStationId || !selectedDate || selectedStation?.needsVerification || !selectedStation?.sourceId;
  const selectedSourceLabel = tideSummary?.metadata.sourceOrganization || "국립해양조사원";
  const summaryMetaLine = `${selectedSourceLabel} · 조회 ${tideSummary?.date || selectedDate} · ${formatDateTime(
    tideSummary?.metadata.updatedAt
  )}`;

  return (
    <AppFrame>
      <div className="space-y-4 pb-24 sm:space-y-5 sm:pb-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-4 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.30),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.42),transparent_56%)]" />
            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20 sm:h-12 sm:w-12">
                <Waves size={22} className="sm:hidden" />
                <Waves size={26} className="hidden sm:block" />
              </div>
              <p className="mt-3 text-xs font-black text-sky-100 sm:text-sm">Blue Marina Sea Info</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-4xl">해양정보센터</h1>
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-sky-50 sm:text-base sm:leading-7">
                관측소와 날짜를 고르면 고·저조를 바로 확인할 수 있습니다.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{marineObservatories.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">관측소</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{verifiedStations.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">obsCode 확인</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{pendingStations}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">추가 검증</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">실시간</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">API 연결</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
              <LocateFixed size={14} />
              현재 위치 기반 안내
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">가까운 관측소를 먼저 확인해 보세요</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              현재 위치로 바로 찾는 기능은 준비 중이며, 지금은 지역과 관측소를 직접 선택해 조회할 수 있습니다.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">현재 추천 관측소</p>
                <p className="mt-1 break-words text-lg font-black text-slate-950">{nearestPreview?.observatory.name ?? "추천 관측소 없음"}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {nearestPreview ? `${nearestPreview.observatory.region} · 약 ${nearestPreview.distanceKm.toFixed(1)}km` : "위치 계산 결과가 없습니다."}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">위치 원칙</p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                  정확한 개인 위치는 저장하지 않고, 조회 시점에만 가까운 관측소를 찾습니다.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p className="flex items-start gap-2 text-sm font-black leading-6 text-amber-900">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                관측소가 공식 obsCode 검증 대상이면 실제 API 요청 전에 안내를 먼저 표시합니다.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
              <KeyRound size={14} />
              조회 조건
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">관측소와 날짜를 선택하세요</h2>
            <div className="mt-4 rounded-3xl bg-slate-50 p-3 sm:p-4">
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                  <label className="block">
                    <span className="text-xs font-black text-slate-600">지역</span>
                    <select
                      value={selectedRegion}
                      onChange={(event) => handleRegionChange(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="전체">전체</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black text-slate-600">조회 날짜</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => {
                        setSelectedDate(event.target.value);
                        setTideResult(null);
                      }}
                      className="mt-2 min-h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-black text-slate-600">관측소</span>
                  <select
                    value={selectedStationId}
                    onChange={(event) => handleStationChange(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    {filteredStations.map((observatory) => (
                      <option key={observatory.id} value={observatory.id}>
                        {observatory.region} · {observatory.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-sky-700" />
                    <p className="text-sm font-black text-slate-950">선택된 관측소</p>
                  </div>
                  <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-600">{selectedStationLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">{selectedStationStatus}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700">
                      obsCode: {selectedStation?.sourceId ?? "없음"}
                    </span>
                    {selectedStation?.supportedData.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-700 shadow-sm">
                        {dataLabels[item]}
                      </span>
                    ))}
                  </div>
                  {selectedStation?.needsVerification ? (
                    <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                      {selectedStation.verificationNote ?? "공식 obsCode 검증이 필요합니다."}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleTideCheck}
                  disabled={queryDisabled}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F2D52] px-4 text-sm font-black text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isCheckingTide ? (
                    <>
                      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      조회 중
                    </>
                  ) : (
                    "고·저조 조회"
                  )}
                </button>

                <div className="rounded-2xl bg-white p-3 sm:p-4">
                  <p className="flex items-start gap-2 text-xs font-bold leading-6 text-slate-600 sm:text-sm">
                    <Info className="mt-0.5 shrink-0 text-sky-700" size={18} />
                    예측조위값은 공식 응답 원문 그대로 표시하고, 임의의 단위는 붙이지 않습니다.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className={`rounded-[2rem] border p-5 shadow-sm sm:p-6 ${statusTone(tideResult)}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-800 shadow-sm">조회 결과</span>
            {tideResult?.ok ? (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                상태: {tideResult.data.status}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">{getStatusTitle(tideResult, isCheckingTide)}</h2>

          {isCheckingTide ? (
            <div className="mt-4 rounded-2xl bg-white/80 p-3 sm:p-4">
              <p className="text-sm font-bold text-slate-700">국립해양조사원 데이터를 확인하고 있습니다.</p>
            </div>
          ) : tideResult ? (
            tideResult.ok ? (
              tideResult.data.status === "unavailable" ? (
                <div className="mt-4 rounded-2xl bg-white/80 p-3 sm:p-4">
                  <p className="text-sm font-bold leading-6 text-amber-950">
                    선택한 날짜에는 고·저조 예보가 확인되지 않았습니다. 날짜를 바꾸거나 다른 관측소를 선택해 보세요.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                      <div className="flex items-center gap-2">
                        <Waves size={18} className="text-sky-700" />
                        <p className="text-xs font-black uppercase tracking-wide text-sky-700">다음 만조</p>
                      </div>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        {formatTimeOnly(tideSummary?.nextHighTideAt ?? tideSummary?.tideSummary.nextHighTideAt)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        예측조위 {nextHighEvent?.predictedLevel ?? "확인 불가"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-100">
                      <div className="flex items-center gap-2">
                        <Sunrise size={18} className="text-amber-600" />
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">다음 간조</p>
                      </div>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        {formatTimeOnly(tideSummary?.nextLowTideAt ?? tideSummary?.tideSummary.nextLowTideAt)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        예측조위 {nextLowEvent?.predictedLevel ?? "확인 불가"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">관측소</p>
                        <p className="mt-2 break-words text-lg font-black text-slate-950">
                          {tideSummary?.station.name || selectedStation?.name || "관측소명 없음"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          obsCode {tideSummary?.station.obsCode || selectedStation?.sourceId || "확인 필요"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">조회 기준일</p>
                        <p className="mt-2 text-lg font-black text-slate-950">{tideSummary?.date || selectedDate}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">KHOA 조석예보</p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">갱신시각</p>
                        <p className="mt-2 text-lg font-black text-slate-950">{formatDateTime(tideSummary?.metadata.updatedAt)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{tideSummary?.metadata.sourceOrganization}</p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">상태</p>
                        <p className="mt-2 text-lg font-black text-slate-950">{tideSummary?.status ?? "ready"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{tideSummary?.metadata.isMock ? "예시 데이터" : "실제 데이터"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden">
                    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-black text-slate-950">
                        <span>전체 고·저조 이벤트</span>
                        <ChevronDown size={18} className="text-slate-400" />
                      </summary>
                      <div className="mt-4 space-y-2">
                        {orderedEvents.length > 0 ? (
                          orderedEvents.map((event, index) => (
                            <div
                              key={`${event.occurredAt}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <TideIcon kind={event.type} />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <TideBadge kind={event.type} />
                                    <span className="text-sm font-black text-slate-950">{formatDateTime(event.occurredAt).slice(0, 16)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">예측조위</p>
                                <p className="text-base font-black text-slate-950">{event.predictedLevel ?? "확인 불가"}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-600">이벤트 정보가 아직 없습니다.</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>

                  <div className="hidden lg:block">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <p className="text-sm font-black text-slate-950">전체 고·저조 이벤트</p>
                      <div className="mt-4 space-y-2">
                        {orderedEvents.length > 0 ? (
                          orderedEvents.map((event, index) => (
                            <div
                              key={`${event.occurredAt}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <TideIcon kind={event.type} />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <TideBadge kind={event.type} />
                                    <span className="text-sm font-black text-slate-950">{formatDateTime(event.occurredAt).slice(0, 16)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">예측조위</p>
                                <p className="text-base font-black text-slate-950">{event.predictedLevel ?? "확인 불가"}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-600">이벤트 정보가 아직 없습니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-semibold leading-5 text-slate-500">{summaryMetaLine}</p>
                </div>
              )
            ) : (
              <div className="mt-4 rounded-2xl bg-white/80 p-3 sm:p-4">
                <p className="text-sm font-black leading-6 text-slate-950">{getStatusTitle(tideResult, false)}</p>
                <p className="mt-2 text-xs text-slate-500">
                  상태: {tideResult.status} · 코드: {tideResult.code}
                </p>
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl bg-white/80 p-3 sm:p-4">
              <p className="text-sm font-bold leading-6 text-slate-700">
                관측소와 날짜를 선택한 뒤 고·저조 예보를 조회해 주세요.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
            <Info size={14} />
            제공 예정 정보
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">다음에 함께 보여줄 정보</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {futureCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                  <span className="mt-4 inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-800">준비 중</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
            <MapPin size={14} />
            관측소 목록
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">지역별 관측소 미리보기</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">선택 지역 {selectedRegion}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              표시 {visibleObservatories.length}/{filteredStations.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleObservatories.map((observatory) => (
              <article key={observatory.id} className="min-w-0 rounded-2xl border border-sky-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-sky-800 shadow-sm">
                      {observatory.region}
                    </span>
                    <h3 className="mt-3 break-words text-base font-black text-slate-950">{observatory.name}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {observatory.needsVerification
                        ? "검증 필요"
                        : observatory.sourceId
                          ? "API 조회 가능"
                          : "obsCode 없음"}
                    </p>
                  </div>
                  {observatory.needsVerification ? (
                    <AlertTriangle className="shrink-0 text-amber-500" size={22} />
                  ) : (
                    <CheckCircle2 className="shrink-0 text-emerald-600" size={22} />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {observatory.supportedData.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                      {dataLabels[item]}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{observatory.note}</p>
              </article>
            ))}
          </div>
          {hasMoreObservatories ? (
            <button
              type="button"
              onClick={() => setVisibleObservatoryCount((count) => count + INITIAL_OBSERVATORY_VISIBLE_COUNT)}
              className="mt-4 min-h-12 w-full rounded-2xl border border-sky-200 bg-white px-4 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50"
            >
              관측소 더 보기 ({visibleObservatories.length}/{filteredStations.length})
            </button>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
            <LocateFixed size={14} />
            현재 위치 기반 안내
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">현재 위치 찾기는 준비 중입니다</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            사용자가 직접 버튼을 누를 때만 현재 위치를 확인하는 구조로 바꿀 수 있으며, 그 전에는 지역 선택만 사용합니다.
          </p>
          <button
            type="button"
            onClick={() => setUserMessage("현재 위치 찾기는 아직 준비 중입니다. 지역을 선택해 관측소를 확인해 주세요.")}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 sm:w-auto"
          >
            <LocateFixed size={18} />
            현재 위치로 가까운 관측소 찾기
          </button>
          {userMessage ? <p className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm font-black leading-6 text-sky-900">{userMessage}</p> : null}
        </section>
      </div>
    </AppFrame>
  );
}
