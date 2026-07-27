"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, MapPin, Sunrise, Waves } from "lucide-react";
import { marineObservatories } from "@/data/marine-observatories";
import { fetchTideInfo, type TideInfoResult } from "@/lib/sea-info/api";

const STORAGE_KEY = "blue-marina:sea-info:favorite-observatory";

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value.slice(11, 16) || value;
}

function formatKoreanDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getFallbackMessage(code?: string) {
  switch (code) {
    case "API_KEY_MISSING":
      return "해양정보 API 키 설정이 필요합니다.";
    case "MISSING_STATION":
      return "관측소 코드가 필요합니다.";
    case "INVALID_DATE":
      return "조회 기준일 형식이 올바르지 않습니다.";
    default:
      return "조석 정보를 불러오지 못했습니다.";
  }
}

function selectedStationStatusLabel(sourceId?: string, needsVerification?: boolean) {
  if (needsVerification) return "검증 필요";
  if (sourceId) return "obsCode 연결";
  return "미설정";
}

function TideRail() {
  const bars = [42, 56, 36, 68, 49, 60, 44];

  return (
    <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-[#9FB3C8]">
        <span>조위 흐름</span>
        <span>현재 기준</span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        {bars.map((height, index) => (
          <div
            key={`${height}-${index}`}
            className={`flex-1 rounded-t-full ${index === 3 ? "bg-[#2E8BFF]" : index === 4 ? "bg-[#00D3C7]" : "bg-[#1B4160]"}`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SeaInterestCard() {
  const selectableObservatories = useMemo(
    () => marineObservatories.filter((observatory) => !observatory.needsVerification && Boolean(observatory.sourceId)),
    []
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [region, setRegion] = useState("전체");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TideInfoResult | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const today = useMemo(getTodayDate, []);

  const selectedStation = useMemo(
    () => selectableObservatories.find((observatory) => observatory.id === selectedStationId) ?? null,
    [selectedStationId, selectableObservatories]
  );

  const regionOptions = useMemo(
    () => Array.from(new Set(selectableObservatories.map((observatory) => observatory.region))).sort((a, b) => a.localeCompare(b, "ko")),
    [selectableObservatories]
  );

  const regionStations = useMemo(() => {
    if (region === "전체") {
      return selectableObservatories;
    }

    return selectableObservatories.filter((observatory) => observatory.region === region);
  }, [region, selectableObservatories]);

  useEffect(() => {
    setIsHydrated(true);

    if (typeof window === "undefined") return;

    const savedId = window.localStorage.getItem(STORAGE_KEY);
    if (savedId && selectableObservatories.some((observatory) => observatory.id === savedId)) {
      setSelectedStationId(savedId);
    }
  }, [selectableObservatories]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!selectedStationId) {
      setIsLoading(false);
      setResult(null);
      setFallbackMessage("관심 해역을 설정하면 오늘의 만조·간조를 바로 보여드립니다.");
      return;
    }

    const station = selectableObservatories.find((observatory) => observatory.id === selectedStationId);
    if (!station || !station.sourceId) {
      setIsLoading(false);
      setResult(null);
      setFallbackMessage("관심 해역을 다시 선택해 주세요.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, selectedStationId);
    }

    let cancelled = false;

    setIsLoading(true);
    setResult(null);
    setFallbackMessage("");

    void fetchTideInfo(station.sourceId, today)
      .then((next) => {
        if (cancelled) return;

        if (next.ok) {
          setResult(next);
          setFallbackMessage("");
          return;
        }

        setResult(null);
        setFallbackMessage(getFallbackMessage(next.code));
      })
      .catch(() => {
        if (cancelled) return;
        setResult(null);
        setFallbackMessage("조석 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, selectableObservatories, selectedStationId, today]);

  const readyData = result?.ok ? result.data : null;
  const nextHigh = readyData?.nextHighTideAt ?? readyData?.tideSummary.nextHighTideAt;
  const nextLow = readyData?.nextLowTideAt ?? readyData?.tideSummary.nextLowTideAt;
  const updatedAt = readyData?.metadata.updatedAt ? formatUpdatedAt(readyData.metadata.updatedAt) : "";
  const metaLine = readyData ? `국립해양조사원 · ${formatKoreanDate(today)} · ${updatedAt}` : "";
  const stationName = readyData?.station.name || selectedStation?.name || "관심 해역";

  return (
    <section className="rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(180deg,#0F3355_0%,#0A1E30_100%)] p-2.5 text-white sm:p-3 lg:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9FB3C8]">Today&apos;s Sea</p>
          <h2 className="mt-1 text-[24px] font-black tracking-tight text-white sm:text-[26px]">오늘의 바다</h2>
          <p className="mt-1.5 max-w-xl text-xs font-semibold leading-5 text-[#D7E4F6] sm:text-sm sm:leading-6">
            관심 해역을 지정하면 오늘의 만조·간조를 바로 보여드립니다.
          </p>
        </div>

        <Link
          href="/sea-info"
          className="hidden min-h-11 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 sm:inline-flex"
        >
          상세 보기
        </Link>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-12 items-center justify-between gap-3 rounded-[20px] border border-[#1F3A50] bg-[#071827] px-4 py-3 text-left transition hover:border-[#2E8BFF]/40"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#9FB3C8]">관심 해역</p>
            <p className="mt-0.5 break-words text-sm font-black text-white">
              {selectedStation ? `${selectedStation.region} · ${selectedStation.name}` : "관심 해역 설정"}
            </p>
          </div>
          <ChevronDown size={18} className="shrink-0 text-[#9FB3C8]" />
        </button>

        <Link
          href="/sea-info"
          className="inline-flex min-h-12 items-center justify-center rounded-[20px] bg-[#2E8BFF] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(46,139,255,0.24)] transition hover:bg-[#5aa4ff] sm:min-w-[120px]"
        >
          상세 보기
        </Link>
      </div>

      <div className="mt-3 space-y-2 rounded-[24px] border border-[#1F3A50] bg-[#071827] p-2.5 sm:p-3">
        {!selectedStation ? (
          <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-4">
            <p className="text-sm font-black text-white">관심 해역 미설정</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">
              자주 보는 출조 해역을 저장하면 홈에서 바로 조석을 확인할 수 있습니다.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-4">
            <p className="text-sm font-black text-white">조석 정보를 불러오는 중입니다.</p>
          </div>
        ) : readyData ? (
          readyData.status === "unavailable" ? (
            <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-4">
              <p className="text-sm font-black text-[#00D3C7]">선택한 해역의 조석정보가 아직 없습니다.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">다른 관측소를 선택해 주세요.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#2E8BFF]">다음 만조</p>
                    <Waves size={15} className="text-[#2E8BFF]" />
                  </div>
                  <p className="mt-1 text-[30px] font-black tracking-tight text-white sm:text-[32px]">{formatTime(nextHigh)}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#9FB3C8]">
                    예측조위 {readyData.events.find((event) => event.type === "high")?.predictedLevel ?? "-"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#00D3C7]">다음 간조</p>
                    <Sunrise size={15} className="text-[#00D3C7]" />
                  </div>
                  <p className="mt-1 text-[30px] font-black tracking-tight text-white sm:text-[32px]">{formatTime(nextLow)}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#9FB3C8]">
                    예측조위 {readyData.events.find((event) => event.type === "low")?.predictedLevel ?? "-"}
                  </p>
                </div>
              </div>

              <div className="hidden sm:block">
                <TideRail />
              </div>

              <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-black text-white">{stationName}</p>
                  <span className="rounded-full bg-[#2E8BFF]/15 px-2 py-0.5 text-[10px] font-black text-[#2E8BFF]">
                    {readyData.status === "ready" ? "실데이터" : "부분 제공"}
                  </span>
                </div>
                <p className="mt-1 hidden text-xs font-semibold leading-5 text-[#9FB3C8] sm:block">{metaLine}</p>
              </div>
            </div>
          )
        ) : fallbackMessage ? (
          <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-4">
            <p className="text-sm font-black text-white">{fallbackMessage}</p>
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-4">
            <p className="text-sm font-black text-white">관심 해역을 설정해 주세요.</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#9FB3C8]">
              자주 보는 해역을 저장하면 홈에서 만조·간조를 바로 보여줍니다.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#9FB3C8]">
        {selectedStation ? <span className="rounded-full border border-[#1F3A50] bg-[#0E2233] px-2.5 py-1 text-[#2E8BFF]">관심 해역</span> : null}
        {selectedStation ? <span>{selectedStationStatusLabel(selectedStation.sourceId, selectedStation.needsVerification)}</span> : null}
        {readyData ? <span className="hidden sm:inline">{metaLine}</span> : null}
        {!selectedStation ? <span>첫 방문 시 자동 지정하지 않습니다.</span> : null}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6" onClick={() => setDrawerOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-3 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-4 shadow-2xl sm:inset-x-6 sm:bottom-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-[#9FB3C8]">관심 해역 설정</p>
                <h3 className="text-lg font-black text-white">관측소 선택</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1F3A50] bg-[#0E2233] px-3 text-sm font-black text-white"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="block">
                <span className="text-xs font-black text-[#9FB3C8]">지역</span>
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[18px] border border-[#1F3A50] bg-[#0E2233] px-4 text-sm font-black text-white outline-none"
                >
                  <option value="전체">전체</option>
                  {regionOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
                <p className="text-xs font-bold leading-5 text-[#9FB3C8]">
                  obsCode가 연결된 관측소만 선택할 수 있습니다. 검증이 필요한 관측소는 목록에서 제외했습니다.
                </p>
              </div>
            </div>

            <div className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {regionStations.map((observatory) => {
                const active = observatory.id === selectedStationId;

                return (
                  <button
                    key={observatory.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationId(observatory.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition ${
                      active ? "border-[#2E8BFF] bg-[#2E8BFF]/12 text-white" : "border-[#1F3A50] bg-[#0E2233] text-white"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-black uppercase tracking-wide ${active ? "text-[#00D3C7]" : "text-[#9FB3C8]"}`}>
                        {observatory.region}
                      </span>
                      <span className="block break-words text-sm font-black">{observatory.name}</span>
                    </span>
                    {active ? <CheckCircle2 size={18} className="shrink-0 text-[#2E8BFF]" /> : <MapPin size={18} className="shrink-0 text-[#2E8BFF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
