"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { CheckCircle2, ChevronDown, Droplets, MapPin, Thermometer, Waves, Wind } from "lucide-react";
import { marineObservatories } from "@/data/marine-observatories";
import { fetchTideInfo, type TideInfoResult } from "@/lib/sea-info/api";

const STORAGE_KEY = "blue-marina:sea-info:favorite-observatory";

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value.slice(11, 16) || value;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getFallbackMessage(code?: string) {
  if (code === "API_KEY_MISSING") return "해양정보 API 키 설정이 필요합니다.";
  if (code === "INVALID_DATE") return "조회 기준일 형식이 올바르지 않습니다.";
  return "조석 정보를 불러오지 못했습니다.";
}

type InstrumentMetricProps = {
  label: string;
  englishLabel: string;
  value: string;
  unit?: string;
  detail: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  muted?: boolean;
};

function InstrumentMetric({ label, englishLabel, value, unit, detail, icon: Icon, muted }: InstrumentMetricProps) {
  return (
    <div className="min-w-0 border-white/12 px-4 py-5 text-center sm:border-l sm:first:border-l-0 lg:px-5">
      <p className="text-xs font-semibold text-white/72">{label}</p>
      <p className="mt-1 text-[10px] tracking-[0.18em] text-white/38">{englishLabel}</p>
      <Icon size={25} strokeWidth={1.25} className={`mx-auto mt-5 ${muted ? "text-white/30" : "text-[#c7dddf]"}`} />
      <p className={`mt-5 font-serif text-4xl tracking-tight lg:text-[2.65rem] ${muted ? "text-white/38" : "text-[#f4f0e8]"}`}>
        {value}
        {unit ? <span className="ml-1 font-sans text-lg text-white/65">{unit}</span> : null}
      </p>
      <p className="mt-3 text-xs font-medium text-white/48">{detail}</p>
    </div>
  );
}

export function SeaInterestCard() {
  const selectableObservatories = useMemo(
    () => marineObservatories.filter((item) => !item.needsVerification && Boolean(item.sourceId)),
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
    () => selectableObservatories.find((item) => item.id === selectedStationId) ?? null,
    [selectedStationId, selectableObservatories]
  );
  const regionOptions = useMemo(
    () => Array.from(new Set(selectableObservatories.map((item) => item.region))).sort((a, b) => a.localeCompare(b, "ko")),
    [selectableObservatories]
  );
  const regionStations = useMemo(
    () => (region === "전체" ? selectableObservatories : selectableObservatories.filter((item) => item.region === region)),
    [region, selectableObservatories]
  );

  useEffect(() => {
    setIsHydrated(true);
    const savedId = window.localStorage.getItem(STORAGE_KEY);
    if (savedId && selectableObservatories.some((item) => item.id === savedId)) setSelectedStationId(savedId);
  }, [selectableObservatories]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!selectedStationId) {
      setResult(null);
      setFallbackMessage("관심 해역을 설정하면 오늘의 만조·간조를 보여드립니다.");
      return;
    }

    const station = selectableObservatories.find((item) => item.id === selectedStationId);
    if (!station?.sourceId) return;

    window.localStorage.setItem(STORAGE_KEY, selectedStationId);
    let cancelled = false;
    setIsLoading(true);
    setFallbackMessage("");

    void fetchTideInfo(station.sourceId, today)
      .then((next) => {
        if (cancelled) return;
        setResult(next.ok ? next : null);
        setFallbackMessage(next.ok ? "" : getFallbackMessage(next.code));
      })
      .catch(() => {
        if (!cancelled) setFallbackMessage("조석 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, selectableObservatories, selectedStationId, today]);

  const readyData = result?.ok ? result.data : null;
  const nextHigh = readyData?.nextHighTideAt ?? readyData?.tideSummary.nextHighTideAt;
  const nextLow = readyData?.nextLowTideAt ?? readyData?.tideSummary.nextLowTideAt;
  const updatedAt = formatUpdatedAt(readyData?.metadata.updatedAt);

  return (
    <section className="border-y border-l border-white/20 bg-[#071421]/68 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl xl:border-r-0">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/15 px-5 text-left transition hover:bg-white/5"
      >
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d5b477]">Marine station</span>
          <span className="mt-1 block text-sm font-medium text-white/85">
            {selectedStation ? `${selectedStation.region} · ${selectedStation.name}` : "관심 해역을 선택하세요"}
          </span>
        </span>
        <ChevronDown size={17} className="text-white/55" />
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        <InstrumentMetric
          label="조위"
          englishLabel="TIDE"
          value={isLoading ? "···" : formatTime(nextHigh)}
          detail={nextLow ? `간조 ${formatTime(nextLow)}` : fallbackMessage || "관심 해역 미설정"}
          icon={Waves}
          muted={!readyData}
        />
        <InstrumentMetric label="파고" englishLabel="WAVE" value="--" unit="m" detail="데이터 연결 준비" icon={Droplets} muted />
        <InstrumentMetric label="풍속" englishLabel="WIND" value="--" unit="m/s" detail="데이터 연결 준비" icon={Wind} muted />
        <InstrumentMetric label="수온" englishLabel="WATER TEMP" value="--" unit="°C" detail="데이터 연결 준비" icon={Thermometer} muted />
      </div>

      <p className="border-t border-white/12 px-5 py-4 text-center text-[11px] font-medium text-white/40">
        {readyData ? `국립해양조사원 조석 데이터 · 업데이트 ${updatedAt || "확인됨"}` : fallbackMessage || "공식 조석 데이터 연결 대기"}
      </p>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div
            className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl border border-white/20 bg-[#071421] p-5 shadow-2xl sm:bottom-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d5b477]">Marine station</p>
                <h3 className="mt-1 text-xl font-semibold">관심 해역 설정</h3>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="min-h-11 border border-white/20 px-4 text-sm text-white/80">
                닫기
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs text-white/55">지역</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="mt-2 min-h-12 w-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none"
              >
                <option value="전체">전체</option>
                {regionOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <div className="mt-4 max-h-[44vh] space-y-2 overflow-y-auto pr-1">
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
                    className={`flex min-h-14 w-full items-center justify-between gap-3 border px-4 py-3 text-left ${
                      active ? "border-[#d5b477] bg-[#d5b477]/10" : "border-white/12 bg-white/[0.03]"
                    }`}
                  >
                    <span>
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/45">{observatory.region}</span>
                      <span className="mt-1 block text-sm font-medium">{observatory.name}</span>
                    </span>
                    {active ? <CheckCircle2 size={18} className="text-[#d5b477]" /> : <MapPin size={18} className="text-white/45" />}
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
