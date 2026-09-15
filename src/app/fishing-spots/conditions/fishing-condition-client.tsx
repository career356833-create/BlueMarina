"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Info, LoaderCircle, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import {
  fetchFishingConditionLocations,
  fetchFishingConditionReadModel,
  type FishingConditionDepth,
  type FishingConditionReadModelResponse,
  type FishingConditionSourceId,
} from "@/lib/fishing-condition/read-model-client";

const SPECIES = [
  ["BM-SPECIES-000755", "참돔"], ["BM-SPECIES-000751", "감성돔"], ["BM-SPECIES-000188", "농어"],
  ["BM-SPECIES-000012", "조피볼락"], ["BM-SPECIES-000465", "넙치"], ["BM-SPECIES-000444", "갈치"],
  ["BM-SPECIES-000417", "고등어"], ["BM-SPECIES-000501", "방어"], ["BM-SPECIES-003107", "주꾸미"],
  ["BM-SPECIES-003111", "문어"],
] as const;

const DEPTHS: Array<{ value: FishingConditionDepth; label: string; sources: FishingConditionSourceId[] }> = [
  { value: "SURFACE", label: "표층", sources: ["nifs-risa", "nifs-femo-sea"] },
  { value: "MIDDLE", label: "중층", sources: ["nifs-risa"] },
  { value: "BOTTOM", label: "저층", sources: ["nifs-risa", "nifs-femo-sea"] },
];

const limitationLabels: Record<string, string> = {
  EFFORT_UNKNOWN: "어획 노력은 반영되지 않습니다.", QUOTA_AFFECTED: "규제·쿼터의 영향을 받을 수 있습니다.",
  REGULATION_AFFECTED: "규제의 영향을 받을 수 있습니다.", GEAR_SPECIFIC: "특정 어구·어업 방식에 한정된 근거입니다.",
  LANDING_PORT_BIAS: "양륙항 자료의 편중 가능성이 있습니다.", CLOSED_SEASON_AFFECTED: "금어기 영향을 받을 수 있습니다.",
  RECREATIONAL_CATCH_NOT_INCLUDED: "레저 낚시 기록은 포함되지 않습니다.", LIFE_STAGE_ADULT: "성어 단계 근거입니다.",
  MONTH_UNRESOLVED: "월 단위 해석이 제한됩니다.", REGIONAL_SCOPE_LIMITED: "근거 지역 범위가 제한됩니다.",
};

function humanizeLimitation(value: string) {
  return limitationLabels[value] ?? (value.includes("단위") ? value : "원자료에 제한 사항이 있습니다.");
}

function humanizeError(error: unknown) {
  const code = error instanceof Error && "code" in error ? String((error as Error & { code?: string }).code) : "";
  if (code === "UNSUPPORTED_SOURCE") return "이 자료원은 현재 이용할 수 없습니다. 잠시 후 다시 확인해 주세요.";
  if (code === "MISSING_ENVIRONMENT") return "선택한 정점의 해당 수심 자료가 없습니다.";
  if (code === "UNKNOWN_SPECIES") return "선택한 어종의 공식 근거를 찾지 못했습니다.";
  if (code === "UPSTREAM_TIMEOUT") return "공식 자료 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.";
  return error instanceof Error ? error.message : "자료를 불러오지 못했습니다.";
}

function formatObservedAt(value: string | null) {
  if (!value) return "시각 미확인";
  return value.replace("T", " ").slice(0, 16);
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#2E8BFF]">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{title}</h2></div>
    {children}
  </div>;
}

export function FishingConditionClient() {
  const [speciesId, setSpeciesId] = useState("");
  const [month, setMonth] = useState("");
  const [sourceId, setSourceId] = useState<FishingConditionSourceId | "">("");
  const [locationId, setLocationId] = useState("");
  const [depth, setDepth] = useState<FishingConditionDepth | "">("");
  const [locations, setLocations] = useState<Array<{ id: string; label: string; freshness: string }>>([]);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<FishingConditionReadModelResponse["readModel"] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sourceId) { setLocations([]); setLocationId(""); setDepth(""); return; }
    const controller = new AbortController();
    setLocationState("loading"); setLocations([]); setLocationId(""); setDepth("");
    fetchFishingConditionLocations(sourceId, controller.signal)
      .then((items) => { setLocations(items); setLocationState("idle"); })
      .catch((error) => { if (!controller.signal.aborted) { setLocationState("error"); setErrorMessage(humanizeError(error)); } });
    return () => controller.abort();
  }, [sourceId]);

  const availableDepths = useMemo(() => DEPTHS.filter((item) => !sourceId || item.sources.includes(sourceId)), [sourceId]);
  const canSubmit = Boolean(speciesId && month && sourceId && locationId && depth);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !sourceId || !depth) return;
    setState("loading"); setErrorMessage(""); setResult(null);
    try {
      const response = await fetchFishingConditionReadModel({ speciesId, month: Number(month), sourceId, stationOrSiteId: locationId, depthContext: depth });
      setResult(response.readModel); setState("idle");
    } catch (error) { setState("error"); setErrorMessage(humanizeError(error)); }
  }

  return <AppFrame>
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-24 lg:space-y-7 lg:pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/fishing-spots" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#1F3A50] px-4 text-sm font-black text-[#D7E4F6] transition hover:bg-white/8"><ArrowLeft size={16} /> 출조거점</Link>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6E8299]">Evidence-led view</span>
      </div>

      <header className="rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(135deg,#102C46_0%,#071827_72%)] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#79C9D6]"><Waves size={15} /> Fishing Condition</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">오늘 바다의 근거를 읽다</h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#B8CBDD] sm:text-base">어종, 관측 자료원, 정점과 수심을 직접 선택해 환경·계절성·원자료의 한계를 함께 확인합니다.</p>
      </header>

      <section className="rounded-[28px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
        <div className="mb-5"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#2E8BFF]">Select context</p><h2 className="mt-1 text-xl font-black text-white">조건을 선택하세요</h2></div>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm font-black text-white"><span>어종</span><select aria-label="어종 선택" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} className="control"><option value="">어종 선택</option>{SPECIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>기준 월</span><select aria-label="기준 월 선택" value={month} onChange={(e) => setMonth(e.target.value)} className="control"><option value="">월 선택</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}월</option>)}</select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>자료원</span><select aria-label="환경 자료원 선택" value={sourceId} onChange={(e) => setSourceId(e.target.value as FishingConditionSourceId | "")} className="control"><option value="">자료원 선택</option><option value="nifs-risa">NIFS 연안정지관측</option><option value="nifs-femo-sea">NIFS 어장환경관측</option></select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>{sourceId === "nifs-femo-sea" ? "사이트" : "관측 정점"}</span><select aria-label="관측 정점 또는 사이트 선택" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!sourceId || locationState === "loading"} className="control disabled:cursor-not-allowed disabled:opacity-50"><option value="">{locationState === "loading" ? "자료 불러오는 중..." : "정점·사이트 선택"}</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>수심</span><select aria-label="수심 선택" value={depth} onChange={(e) => setDepth(e.target.value as FishingConditionDepth | "")} disabled={!sourceId} className="control disabled:cursor-not-allowed disabled:opacity-50"><option value="">수심 선택</option>{availableDepths.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="flex items-end"><button type="submit" disabled={!canSubmit || state === "loading"} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#EBC27D] px-5 text-sm font-black text-[#071827] transition hover:bg-[#F3D69D] disabled:cursor-not-allowed disabled:opacity-45">{state === "loading" && <LoaderCircle size={18} className="animate-spin" />} 조건 보기</button></div>
        </form>
        <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-[#8FA7BC]"><Info size={15} className="mt-0.5 shrink-0 text-[#79C9D6]" /> 선택을 마친 뒤 버튼을 눌러 공식 자료를 조회합니다. 자동 추천이나 점수는 제공하지 않습니다.</p>
        {locationState === "error" && <p role="alert" className="mt-3 text-sm font-bold text-[#EBC27D]">{errorMessage}</p>}
      </section>

      {state === "loading" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="자료를 불러오는 중"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div>}
      {state === "error" && <section role="alert" className="rounded-[24px] border border-[#6A5735] bg-[#201B13] p-5 text-sm font-bold text-[#F1D9A8]">{errorMessage}<button type="button" onClick={() => setState("idle")} className="ml-3 underline underline-offset-4">조건 다시 선택</button></section>}
      {!result && state === "idle" && <section className="rounded-[24px] border border-dashed border-[#29465D] bg-[#081C2B] p-8 text-center"><BookOpen className="mx-auto text-[#79C9D6]" size={26} /><p className="mt-3 text-sm font-black text-[#D7E4F6]">선택한 조건의 근거가 여기에 표시됩니다.</p><p className="mt-1 text-xs font-semibold text-[#7890A6]">어종·월·자료원·정점·수심을 선택해 주세요.</p></section>}
      {result && <ResultView result={result} />}
    </div>
  </AppFrame>;
}

function ResultView({ result }: { result: FishingConditionReadModelResponse["readModel"] }) {
  const fields = Object.values(result.environment);
  return <div className="space-y-5" aria-live="polite">
    <section className="flex flex-col gap-3 rounded-[24px] border border-[#29465D] bg-[#0A2031] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-[#79C9D6]">{result.species.koreanName} · {result.species.scientificName}</p><h2 className="mt-1 text-xl font-black text-white">선택 조건의 확인 결과</h2></div><p className="text-xs font-bold text-[#A8BDCF]">{result.freshness.label} · {formatObservedAt(result.freshness.observedAt)}</p></section>
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Environment" title="환경 자료" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{fields.map((field) => <article key={field.label} className="rounded-[20px] border border-[#213D52] bg-[#0B2234] p-4"><p className="text-xs font-black text-[#93AFC2]">{field.label}</p><p className="mt-3 text-xl font-black text-white">{field.displayValue ?? "자료 없음"}</p><p className="mt-2 text-xs font-bold text-[#79C9D6]">{field.displayStatus ?? "비교 근거 없음"}</p>{field.limitations.length > 0 && <p className="mt-3 text-[11px] font-semibold leading-5 text-[#9FB3C8]">{field.limitations.map(humanizeLimitation).join(" · ")}</p>}</article>)}</div></section>
    <section className="grid gap-5 lg:grid-cols-2"><Seasonality title="산란 시기" section={result.seasonality.spawning} /><Seasonality title="회유" section={result.seasonality.migration} /></section>
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Official records" title="월별 어획 원기록" /><p className="mt-2 text-xs font-semibold text-[#8FA7BC]">선택한 {result.seasonality.requestedMonth}월의 연도별 원자료 상태입니다. 원자료 행 없음은 0으로 해석하지 않습니다.</p>{result.seasonality.fisheryOccurrence.cards.length === 0 ? <EmptyResult text="현재 공식 월별 어획기록 근거가 연결되어 있지 않습니다." /> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{result.seasonality.fisheryOccurrence.cards.flatMap((card) => card.yearlyRecords).map((record) => <div key={record.year} className="rounded-[18px] border border-[#213D52] bg-[#0B2234] p-4"><p className="text-xs font-black text-[#93AFC2]">{record.year}년</p><p className="mt-2 text-sm font-black text-white">{record.displayValue ?? record.displayStatus}</p></div>)}</div>}</section>
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Sources" title="근거와 최신성" /><div className="mt-4 space-y-3">{result.sources.map((source) => <div key={`${source.domain}-${source.sourceId}`} className="rounded-[18px] border border-[#213D52] bg-[#0B2234] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-black text-white">{source.sourceName ?? source.sourceId}</p><span className="text-[11px] font-bold text-[#79C9D6]">{source.domain === "environment" ? "환경" : "계절성"}</span></div><p className="mt-2 text-xs font-semibold text-[#9FB3C8]">{source.provider ?? "공식 자료"} · {formatObservedAt(source.observedAt)}</p>{source.urlOrReference && <a className="mt-2 block truncate text-xs font-bold text-[#79C9D6] underline" href={source.urlOrReference} target="_blank" rel="noreferrer">원자료 보기</a>}</div>)}</div></section><section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Boundaries" title="해석의 한계" /><div className="mt-4 space-y-3">{result.limitations.length === 0 ? <EmptyResult text="추가로 표시할 제한 사항이 없습니다." /> : result.limitations.map((item) => <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[#B8CBDD]"><Info size={16} className="mt-1 shrink-0 text-[#EBC27D]" />{humanizeLimitation(item)}</p>)}</div></section></section>
  </div>;
}

function Seasonality({ title, section }: { title: string; section: { status: string; description: string | null; cards: Array<{ title: string; description: string | null; relation: string | null; limitations: string[] }> } }) {
  return <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Seasonality" title={title} /><p className="mt-3 text-sm font-semibold leading-6 text-[#B8CBDD]">{section.cards[0]?.description ?? section.description ?? "현재 공식 근거가 연결되어 있지 않습니다."}</p>{section.cards.length > 0 && <div className="mt-4 space-y-2">{section.cards.map((card) => <div key={card.title} className="rounded-[18px] border border-[#213D52] bg-[#0B2234] p-4"><p className="text-sm font-black text-white">{card.title}</p>{card.relation && <p className="mt-2 text-xs font-bold text-[#79C9D6]">{card.relation}</p>}</div>)}</div>}</section>;
}

function EmptyResult({ text }: { text: string }) { return <p className="mt-4 rounded-[18px] border border-dashed border-[#29465D] p-4 text-sm font-semibold text-[#93AFC2]">{text}</p>; }
