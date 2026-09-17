"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, Info, LoaderCircle, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import {
  fetchFishingConditionLocations,
  fetchFishingConditionReadModel,
  type FishingConditionDepth,
  type FishingConditionQuery,
  type FishingConditionReadModelResponse,
  type FishingConditionSourceId,
} from "@/lib/fishing-condition/read-model-client";
import { FISHING_CONDITION_SPECIES } from "@/lib/fishing-condition/fishing-spot-integration";

const SOURCE_LABELS: Record<FishingConditionSourceId, string> = {
  "nifs-risa": "NIFS 연안정지관측",
  "nifs-femo-sea": "NIFS 어장환경관측",
};

const DEPTHS: Array<{ value: FishingConditionDepth; label: string; sources: FishingConditionSourceId[] }> = [
  { value: "SURFACE", label: "표층", sources: ["nifs-risa", "nifs-femo-sea"] },
  { value: "MIDDLE", label: "중층", sources: ["nifs-risa"] },
  { value: "BOTTOM", label: "저층", sources: ["nifs-risa", "nifs-femo-sea"] },
];

const limitationLabels: Record<string, string> = {
  EFFORT_UNKNOWN: "어획 노력은 반영되지 않습니다.",
  EFFORT_NOT_CONTROLLED: "어획 노력 차이는 통제되지 않았습니다.",
  CATCH_EFFORT_NOT_CONTROLLED: "어획 노력 차이는 통제되지 않았습니다.",
  QUOTA_AFFECTED: "규제·쿼터의 영향을 받을 수 있습니다.",
  REGULATION_AFFECTED: "규제의 영향을 받을 수 있습니다.",
  GEAR_SPECIFIC: "특정 어구·어업 방식에 한정된 근거입니다.",
  FLEET_COMPOSITION_CHANGED: "조업 선단 구성 변화의 영향을 받을 수 있습니다.",
  LANDING_PORT_BIAS: "양륙항 자료의 편중 가능성이 있습니다.",
  CLOSED_SEASON_AFFECTED: "금어기 영향을 받을 수 있습니다.",
  RECREATIONAL_CATCH_NOT_INCLUDED: "레저 낚시 기록은 포함되지 않습니다.",
  LIFE_STAGE_ADULT: "성어 단계 근거입니다.",
  MONTH_UNRESOLVED: "월 단위 시기가 확인되지 않았습니다.",
  REGIONAL_SCOPE_LIMITED: "근거 지역 범위가 제한됩니다.",
  UNIT_UNVERIFIED: "단위 확인이 필요합니다.",
  NO_CONTEXT_EVIDENCE: "현재 연결된 근거가 없습니다.",
};

type ReadModel = FishingConditionReadModelResponse["readModel"];
type EnvironmentField = ReadModel["environment"][string];
type SeasonalitySection = ReadModel["seasonality"]["migration"];
type UiError = { title: string; message: string };

function humanizeLimitation(value: string) {
  if (limitationLabels[value]) return limitationLabels[value];
  if (/TAC|QUOTA/.test(value)) return "총허용어획량과 관리 정책의 영향을 받을 수 있습니다.";
  if (/FLEET/.test(value)) return "조업 선단 구성에 한정된 근거입니다.";
  if (/GEAR/.test(value)) return "특정 어구·어업 방식에 한정된 근거입니다.";
  if (/EFFORT|CPUE/.test(value)) return "어획 노력 차이가 반영되지 않았습니다.";
  if (/REGION|GEOGRAPH/.test(value)) return "근거 지역 범위가 제한됩니다.";
  if (/LIFE_STAGE|JUVENILE|ADULT|IMMATURE/.test(value)) return "특정 생애 단계에 한정된 근거입니다.";
  if (/UNIT/.test(value)) return "단위 확인이 필요합니다.";
  if (/MONTH|ANNUAL/.test(value)) return "월 단위 해석이 제한됩니다.";
  if (/LANDING|PRODUCTION/.test(value)) return "위판·생산 기록은 자연 개체수를 의미하지 않습니다.";
  return "근거의 적용 범위가 제한됩니다.";
}

function classifyError(error: unknown): UiError {
  const code = error instanceof Error && "code" in error ? String((error as Error & { code?: string }).code) : "";
  if (code === "INVALID_REQUEST") return { title: "입력 내용을 확인해 주세요", message: "선택한 조건이 올바른지 확인한 뒤 다시 시도해 주세요." };
  if (code === "MISSING_ENVIRONMENT") return { title: "관측 자료가 없습니다", message: "선택한 정점과 수심에 사용할 수 있는 환경 관측값이 없습니다." };
  if (code === "UNSUPPORTED_SOURCE") return { title: "자료원을 이용할 수 없습니다", message: "현재 이 자료원에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  if (code === "UPSTREAM_TIMEOUT") return { title: "공식 자료 응답이 늦어지고 있습니다", message: "선택 조건은 유지됩니다. 잠시 후 다시 시도해 주세요." };
  if (error instanceof TypeError) return { title: "네트워크 연결을 확인해 주세요", message: "자료 요청을 완료하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." };
  return { title: "자료를 불러오지 못했습니다", message: "일시적인 오류가 발생했습니다. 선택 조건을 유지한 채 다시 시도할 수 있습니다." };
}

function formatObservedAt(value: string | null) {
  if (!value) return "시각 미확인";
  return value.replace("T", " ").slice(0, 16);
}

function displayUnit(unit: string | null) {
  return unit === "degC" ? "°C" : unit;
}

function rangeTypeLabel(rangeType: string | null) {
  if (rangeType === "PREFERRED") return "선호 수온 근거";
  if (rangeType === "OBSERVED") return "관찰 수온 범위";
  if (rangeType === "CANONICAL") return "어종 기준 범위";
  return "비교 근거 범위";
}

function formatReference(field: EnvironmentField) {
  const reference = field.profileReference;
  if (!reference || (reference.min === null && reference.max === null)) return null;
  const unit = displayUnit(reference.unit);
  const suffix = unit ? ` ${unit}` : "";
  if (reference.min !== null && reference.max !== null) return `${reference.min}–${reference.max}${suffix}`;
  if (reference.min !== null) return `${reference.min}${suffix} 이상`;
  return `${reference.max}${suffix} 이하`;
}

function environmentStatusLabel(field: EnvironmentField) {
  if (field.displayStatus) return field.displayStatus;
  if (field.status === "UNIT_UNVERIFIED" || field.status === "UNIT_MISMATCH") return "단위 확인 필요";
  if (field.status === "UNSUPPORTED_PROFILE" || field.status === "UNSUPPORTED_ENVIRONMENT") return "어종 비교 근거 없음";
  if (field.status === "MISSING_ENVIRONMENT") return "환경 관측값 없음";
  if (field.status === "MISSING_ENVIRONMENT_CONTEXT") return "비교 조건 미지정";
  if (field.status === "LIMITED") return "근거가 제한적";
  if (field.freshness === "unavailable") return "자료원 이용 불가";
  return "비교 기준 없음";
}

function migrationRelationLabel(relation: string | null, limitations: string[]) {
  if (relation === "MATCH") return "선택한 월이 이 이동 시기 범위에 포함됩니다.";
  if (relation === "MISMATCH") return "선택한 월이 이 이동 시기 범위 밖입니다.";
  if (limitations.includes("MONTH_UNRESOLVED")) return "월 단위 시기가 확인되지 않았습니다.";
  return null;
}

function seasonalityEmptyText(status: string) {
  if (status === "NOT_REQUESTED") return "월을 선택하면 시기 근거를 확인할 수 있습니다.";
  if (status === "NO_RECORD") return "해당 기간 기록이 없습니다.";
  if (status === "MISSING") return "원자료 행이 없습니다.";
  if (status === "UNAVAILABLE") return "현재 자료원을 이용할 수 없습니다.";
  return "현재 연결된 근거가 없습니다.";
}

function sourceTypeLabel(value: string | null) {
  if (!value) return "자료 유형 미확인";
  if (/FISHERY|CATCH|LANDING|STATISTIC/.test(value)) return "월별 어획 통계";
  if (/OBSERV/.test(value)) return "관측 자료";
  if (/REFERENCE|MBRIS|FISHBASE/.test(value)) return "생태 근거";
  return "근거 자료";
}

function lineageItems(value: string[] | Record<string, unknown>) {
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`);
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#2E8BFF]">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{title}</h2></div>
    {children}
  </div>;
}

type FishingConditionSpotContext = {
  id: string;
  name: string;
  region: string;
  detailHref: string;
  mapHref?: string;
  navigationHref?: string;
  coordinateNotice?: string;
  mapBlockedReason?: string;
  navigationBlockedReason?: string;
};

type FishingConditionClientProps = {
  initialSpeciesId?: string;
  spotContext?: FishingConditionSpotContext;
};

export function FishingConditionClient({ initialSpeciesId = "", spotContext }: FishingConditionClientProps) {
  const [speciesId, setSpeciesId] = useState(initialSpeciesId);
  const [month, setMonth] = useState("");
  const [sourceId, setSourceId] = useState<FishingConditionSourceId | "">("");
  const [locationId, setLocationId] = useState("");
  const [depth, setDepth] = useState<FishingConditionDepth | "">("");
  const [locations, setLocations] = useState<Array<{ id: string; label: string; freshness: string }>>([]);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");
  const [locationError, setLocationError] = useState<UiError | null>(null);
  const [locationReloadKey, setLocationReloadKey] = useState(0);
  const [result, setResult] = useState<ReadModel | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [readError, setReadError] = useState<UiError | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sourceId) {
      setLocations([]);
      setLocationId("");
      setDepth("");
      setLocationState("idle");
      setLocationError(null);
      return;
    }
    const controller = new AbortController();
    setLocationState("loading");
    setLocationError(null);
    setLocations([]);
    setLocationId("");
    setDepth("");
    fetchFishingConditionLocations(sourceId, controller.signal)
      .then((items) => {
        setLocations(items);
        setLocationState("idle");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLocationState("error");
          setLocationError(classifyError(error));
        }
      });
    return () => controller.abort();
  }, [locationReloadKey, sourceId]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  const availableDepths = useMemo(() => DEPTHS.filter((item) => !sourceId || item.sources.includes(sourceId)), [sourceId]);
  const selectedLocation = locations.find((item) => item.id === locationId) ?? null;
  const canSubmit = Boolean(speciesId && month && sourceId && locationId && depth);

  const runQuery = useCallback(async () => {
    if (!canSubmit || !sourceId || !depth || requestControllerRef.current) return;
    const query: FishingConditionQuery = { speciesId, month: Number(month), sourceId, stationOrSiteId: locationId, depthContext: depth };
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setState("loading");
    setReadError(null);
    setResult(null);
    try {
      const response = await fetchFishingConditionReadModel(query, controller.signal);
      if (!controller.signal.aborted) {
        setResult(response.readModel);
        setState("idle");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState("error");
        setReadError(classifyError(error));
      }
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  }, [canSubmit, depth, locationId, month, sourceId, speciesId]);

  function clearDisplayedResult() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setResult(null);
    setState("idle");
    setReadError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery();
  }

  const depthSummary = availableDepths.map((item) => item.label).join("/");

  return <AppFrame>
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-24 max-sm:pr-6 lg:space-y-7 lg:pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link href={spotContext?.detailHref ?? "/fishing-spots"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#1F3A50] px-4 text-sm font-black text-[#D7E4F6] transition hover:bg-white/8"><ArrowLeft size={16} /> {spotContext ? "포인트 상세" : "출조거점"}</Link>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6E8299]">Evidence-led view</span>
      </div>

      <header className="rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(135deg,#102C46_0%,#071827_72%)] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#79C9D6]"><Waves size={15} /> Fishing Condition</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">오늘 바다의 근거를 읽다</h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#B8CBDD] sm:text-base">어종, 관측 자료원, 정점과 수심을 직접 선택해 환경·계절성·원자료의 한계를 함께 확인합니다.</p>
      </header>

      {spotContext ? <aside className="rounded-[22px] border border-[#29465D] bg-[#0A2031] p-4" aria-label="선택한 출조 포인트">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#79C9D6]">Selected fishing spot</p>
            <p className="mt-1 text-sm font-black text-white">{spotContext.name}</p>
            <p className="mt-1 text-xs font-semibold text-[#8FA7BC]">{spotContext.region}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={spotContext.detailHref} className="inline-flex min-h-10 items-center rounded-full border border-[#29465D] px-4 text-xs font-black text-[#D7E4F6]">상세로 돌아가기</Link>
            {spotContext.mapHref
              ? <Link href={spotContext.mapHref} className="inline-flex min-h-10 items-center rounded-full border border-[#79C9D6]/45 px-4 text-xs font-black text-[#AEE8EF]">지도에서 보기</Link>
              : <button type="button" disabled aria-describedby="condition-map-hold-reason" className="inline-flex min-h-10 cursor-not-allowed items-center rounded-full border border-[#29465D] px-4 text-xs font-black text-[#7890A6]">지도에서 보기</button>}
            {spotContext.navigationHref
              ? <Link href={spotContext.navigationHref} className="inline-flex min-h-10 items-center rounded-full border border-[#EBC27D]/45 px-4 text-xs font-black text-[#F1D9A8]">항법에서 보기</Link>
              : <button type="button" disabled aria-describedby="condition-navigation-hold-reason" className="inline-flex min-h-10 cursor-not-allowed items-center rounded-full border border-[#6A5735] px-4 text-xs font-black text-[#D9C49A]">항법에서 보기</button>}
          </div>
        </div>
        {spotContext.coordinateNotice ? <p role="note" className="mt-3 rounded-[14px] border border-[#6A5735] bg-[#201B13] px-3 py-2 text-xs font-semibold leading-5 text-[#D9C49A]">좌표 검토 중 · {spotContext.coordinateNotice}</p> : null}
        {spotContext.mapBlockedReason ? <p id="condition-map-hold-reason" className="mt-2 text-xs font-semibold text-[#D9C49A]">{spotContext.mapBlockedReason}</p> : null}
        {spotContext.navigationBlockedReason ? <p id="condition-navigation-hold-reason" className="mt-1 text-xs font-semibold text-[#D9C49A]">{spotContext.navigationBlockedReason}</p> : null}
        <p className="mt-3 border-t border-[#29465D] pt-3 text-xs font-semibold leading-5 text-[#8FA7BC]">포인트 위치와 해양 관측 정점은 별도입니다. 월·자료원·정점·수심을 직접 선택해 주세요.</p>
      </aside> : null}

      <section className="rounded-[28px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
        <div className="mb-5"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#2E8BFF]">Select context</p><h2 className="mt-1 text-xl font-black text-white">조건을 선택하세요</h2></div>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm font-black text-white"><span>어종</span><select aria-label="어종 선택" value={speciesId} onChange={(event) => { clearDisplayedResult(); setSpeciesId(event.target.value); }} className="control"><option value="">어종 선택</option>{FISHING_CONDITION_SPECIES.map((species) => <option key={species.id} value={species.id}>{species.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>기준 월</span><select aria-label="기준 월 선택" value={month} onChange={(event) => { clearDisplayedResult(); setMonth(event.target.value); }} className="control"><option value="">월 선택</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}월</option>)}</select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>자료원</span><select aria-label="환경 자료원 선택" value={sourceId} onChange={(event) => { clearDisplayedResult(); setSourceId(event.target.value as FishingConditionSourceId | ""); }} className="control"><option value="">자료원 선택</option><option value="nifs-risa">NIFS 연안정지관측</option><option value="nifs-femo-sea">NIFS 어장환경관측</option></select></label>
          <label className="grid gap-2 text-sm font-black text-white"><span>{sourceId === "nifs-femo-sea" ? "사이트" : "관측 정점"}</span><select aria-label="관측 정점 또는 사이트 선택" value={locationId} onChange={(event) => { clearDisplayedResult(); setLocationId(event.target.value); }} disabled={!sourceId || locationState === "loading"} className="control disabled:cursor-not-allowed disabled:opacity-50"><option value="">{locationState === "loading" ? "자료 불러오는 중..." : "정점·사이트 선택"}</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{sourceId ? <span className="text-[11px] font-semibold leading-5 text-[#7890A6]">{SOURCE_LABELS[sourceId]} · 지원 수심 {depthSummary}{selectedLocation ? ` · ${selectedLocation.freshness}` : ""}</span> : <span className="text-[11px] font-semibold text-[#7890A6]">자료원을 선택하면 정점과 지원 수심을 확인할 수 있습니다.</span>}</label>
          <label className="grid gap-2 text-sm font-black text-white"><span>수심</span><select aria-label="수심 선택" value={depth} onChange={(event) => { clearDisplayedResult(); setDepth(event.target.value as FishingConditionDepth | ""); }} disabled={!sourceId} className="control disabled:cursor-not-allowed disabled:opacity-50"><option value="">수심 선택</option>{availableDepths.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="flex items-end"><button type="submit" disabled={!canSubmit || state === "loading"} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#EBC27D] px-5 text-sm font-black text-[#071827] transition hover:bg-[#F3D69D] disabled:cursor-not-allowed disabled:opacity-45">{state === "loading" ? <LoaderCircle size={18} className="animate-spin" /> : null} 조건 보기</button></div>
        </form>
        <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-[#8FA7BC]"><Info size={15} className="mt-0.5 shrink-0 text-[#79C9D6]" /> 선택을 마친 뒤 버튼을 눌러 공식 자료를 조회합니다. 자동 추천이나 점수는 제공하지 않습니다.</p>
        {locationState === "loading" ? <p role="status" aria-live="polite" className="mt-3 text-sm font-bold text-[#9FB3C8]">정점 목록을 불러오는 중입니다.</p> : null}
        {locationState === "error" && locationError ? <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-[#EBC27D]"><span>{locationError.message}</span><button type="button" onClick={() => setLocationReloadKey((value) => value + 1)} className="min-h-10 rounded-full border border-[#EBC27D]/45 px-4 underline-offset-4 hover:underline">다시 시도</button></div> : null}
      </section>

      {state === "loading" ? <div role="status" aria-live="polite" className="space-y-3"><p className="sr-only">선택한 조건의 공식 자료를 불러오는 중입니다.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-hidden="true"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div></div> : null}
      {state === "error" && readError ? <section role="alert" className="rounded-[24px] border border-[#6A5735] bg-[#201B13] p-5"><p className="text-sm font-black text-[#F1D9A8]">{readError.title}</p><p className="mt-1 text-sm font-semibold leading-6 text-[#D9C49A]">{readError.message}</p><button type="button" onClick={() => void runQuery()} className="mt-4 min-h-11 rounded-full border border-[#EBC27D]/55 px-5 text-sm font-black text-[#F1D9A8] transition hover:bg-[#EBC27D]/10">다시 시도</button></section> : null}
      {!result && state === "idle" ? <section className="rounded-[24px] border border-dashed border-[#29465D] bg-[#081C2B] p-8 text-center"><BookOpen className="mx-auto text-[#79C9D6]" size={26} /><p className="mt-3 text-sm font-black text-[#D7E4F6]">선택한 조건의 근거가 여기에 표시됩니다.</p><p className="mt-1 text-xs font-semibold text-[#7890A6]">어종·월·자료원·정점·수심을 선택해 주세요.</p></section> : null}
      {result ? <ResultView result={result} /> : null}
    </div>
  </AppFrame>;
}

function ResultView({ result }: { result: ReadModel }) {
  const fields = Object.values(result.environment);
  return <div className="space-y-5" aria-live="polite">
    <section className="flex flex-col gap-3 rounded-[24px] border border-[#29465D] bg-[#0A2031] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-[#79C9D6]">{result.species.koreanName} · {result.species.scientificName}</p><h2 className="mt-1 text-xl font-black text-white">선택 조건의 확인 결과</h2></div><p className="text-xs font-bold text-[#A8BDCF]">{result.freshness.label} · {formatObservedAt(result.freshness.observedAt)}</p></section>
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6"><SectionHeading eyebrow="Environment" title="환경 자료" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{fields.map((field) => <EnvironmentCard key={field.key} field={field} />)}</div></section>
    <section className="grid gap-5 lg:grid-cols-2"><Seasonality title="산란 시기" section={result.seasonality.spawning} /><Seasonality title="회유" section={result.seasonality.migration} /></section>
    <OccurrenceTable section={result.seasonality.fisheryOccurrence} requestedMonth={result.seasonality.requestedMonth} />
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><SourcePanel sources={result.sources} /><LimitationsPanel limitations={result.limitations} /></section>
  </div>;
}

function EnvironmentCard({ field }: { field: EnvironmentField }) {
  const reference = formatReference(field);
  const currentLabel = field.key === "temperature" ? "현재 수온" : "현재 값";
  return <article className="rounded-[20px] border border-[#213D52] bg-[#0B2234] p-4">
    <p className="text-xs font-black text-[#93AFC2]">{field.label}</p>
    <dl className="mt-3 space-y-3">
      <div><dt className="text-[10px] font-bold text-[#6E8299]">{currentLabel}</dt><dd className="mt-1 text-xl font-black text-white">{field.displayValue ?? "자료 없음"}</dd></div>
      <div><dt className="text-[10px] font-bold text-[#6E8299]">비교 기준</dt><dd className="mt-1 text-xs font-bold text-[#D7E4F6]">{reference ?? "비교 기준 없음"}</dd>{reference && field.profileReference ? <dd className="mt-1 text-[10px] font-semibold text-[#7890A6]">{rangeTypeLabel(field.profileReference.rangeType)}</dd> : null}</div>
      <div><dt className="text-[10px] font-bold text-[#6E8299]">상태</dt><dd className="mt-1 text-xs font-bold text-[#79C9D6]">{environmentStatusLabel(field)}</dd></div>
    </dl>
    {field.explanation ? <p className="mt-3 text-[11px] font-semibold leading-5 text-[#9FB3C8]">{field.explanation}</p> : null}
    {field.limitations.length > 0 ? <p className="mt-3 text-[11px] font-semibold leading-5 text-[#9FB3C8]">{[...new Set(field.limitations.map(humanizeLimitation))].join(" · ")}</p> : null}
  </article>;
}

function Seasonality({ title, section }: { title: string; section: SeasonalitySection }) {
  return <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
    <SectionHeading eyebrow="Seasonality" title={title} />
    <p className="mt-3 text-sm font-semibold leading-6 text-[#B8CBDD]">{section.cards[0]?.description ?? section.description ?? seasonalityEmptyText(section.status)}</p>
    {title === "회유" && section.cards.length > 0 ? <p className="mt-3 rounded-[14px] border border-[#29465D] bg-[#081C2B] p-3 text-xs font-semibold leading-5 text-[#93AFC2]">북상과 남하는 서로 다른 이동 근거입니다. 두 결과를 하나의 종합 상태로 합치지 않습니다.</p> : null}
    {section.cards.length > 0 ? <div className="mt-4 space-y-2">{section.cards.map((card) => {
      const relation = migrationRelationLabel(card.relation, card.limitations);
      return <article key={card.title} className="rounded-[18px] border border-[#213D52] bg-[#0B2234] p-4"><p className="text-sm font-black text-white">{card.title}</p>{relation ? <p className="mt-2 text-xs font-bold leading-5 text-[#79C9D6]">{relation}</p> : null}</article>;
    })}</div> : <EmptyResult text={seasonalityEmptyText(section.status)} />}
  </section>;
}

function OccurrenceTable({ section, requestedMonth }: { section: ReadModel["seasonality"]["fisheryOccurrence"]; requestedMonth: number | null }) {
  const rows = section.cards.flatMap((card) => {
    const source = card.source.provider ?? card.source.sourceName ?? card.source.tableId ?? null;
    return card.yearlyRecords.map((record) => ({ ...record, source }));
  });
  return <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
    <SectionHeading eyebrow="Official records" title="월별 어획 원기록" />
    <p className="mt-2 text-xs font-semibold leading-5 text-[#8FA7BC]">선택한 {requestedMonth ?? "-"}월의 공식 월별 어획 통계 기록입니다. 자연 개체수나 조황 확률을 의미하지 않으며, 원자료 행 없음은 0으로 해석하지 않습니다.</p>
    {rows.length === 0 ? <EmptyResult text={seasonalityEmptyText(section.status)} /> : <div className="mt-4 overflow-x-auto rounded-[18px] border border-[#213D52]">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <caption className="sr-only">선택 월의 연도별 공식 어획 원자료</caption>
        <thead className="bg-[#0B2234] text-xs text-[#93AFC2]"><tr><th scope="col" className="px-4 py-3">연도</th><th scope="col" className="px-4 py-3">상태</th><th scope="col" className="px-4 py-3">기록값</th><th scope="col" className="px-4 py-3">단위</th><th scope="col" className="px-4 py-3">자료원</th></tr></thead>
        <tbody>{rows.map((record) => <tr key={`${record.year}-${record.source ?? "unknown"}`} className="border-t border-[#213D52] text-[#D7E4F6]"><th scope="row" className="px-4 py-3 font-black text-white">{record.year}년</th><td className="px-4 py-3">{record.displayStatus}</td><td className="px-4 py-3 font-bold">{record.value === null ? "—" : record.value.toLocaleString("ko-KR")}</td><td className="px-4 py-3">{record.unit ?? "—"}</td><td className="px-4 py-3">{record.source ?? "출처 정보 미확인"}</td></tr>)}</tbody>
      </table>
    </div>}
  </section>;
}

function SourcePanel({ sources }: { sources: ReadModel["sources"] }) {
  return <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
    <SectionHeading eyebrow="Sources" title="근거와 최신성" />
    <div className="mt-4 space-y-3">{sources.map((source) => <article key={`${source.domain}-${source.sourceId}`} className="rounded-[18px] border border-[#213D52] bg-[#0B2234] p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold text-[#6E8299]">데이터명</p><p className="mt-1 text-sm font-black text-white">{source.sourceName ?? source.sourceId}</p></div><span className="text-[11px] font-bold text-[#79C9D6]">{source.domain === "environment" ? "환경" : "계절성"}</span></div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div><dt className="text-[#6E8299]">기관</dt><dd className="mt-1 font-semibold text-[#B8CBDD]">{source.provider ?? "출처 정보 미확인"}</dd></div><div><dt className="text-[#6E8299]">자료 유형</dt><dd className="mt-1 font-semibold text-[#B8CBDD]">{sourceTypeLabel(source.sourceType)}</dd></div><div><dt className="text-[#6E8299]">관측·통계 시각</dt><dd className="mt-1 font-semibold text-[#B8CBDD]">{formatObservedAt(source.observedAt)}</dd></div><div><dt className="text-[#6E8299]">최신성</dt><dd className="mt-1 font-semibold text-[#B8CBDD]">{source.observedAt ? "시각 확인" : "시각 미확인"}</dd></div></dl>
      {source.urlOrReference ? <a className="mt-3 block truncate text-xs font-bold text-[#79C9D6] underline" href={source.urlOrReference} target="_blank" rel="noreferrer">원자료 보기</a> : null}
      <details className="mt-3 border-t border-[#213D52] pt-3 text-xs text-[#93AFC2]"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-bold text-[#B8CBDD]"><ChevronDown size={14} /> 데이터 계보 보기</summary><ul className="mt-2 space-y-1 pl-5">{lineageItems(source.lineage).map((item) => <li key={item} className="break-words">{item}</li>)}</ul></details>
    </article>)}</div>
  </section>;
}

function LimitationsPanel({ limitations }: { limitations: string[] }) {
  const items = [...new Set(limitations.map(humanizeLimitation))];
  const primary = items.slice(0, 4);
  const details = items.slice(4);
  return <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-4 sm:p-6">
    <SectionHeading eyebrow="Boundaries" title="해석의 한계" />
    {items.length === 0 ? <EmptyResult text="추가로 표시할 제한 사항이 없습니다." /> : <div className="mt-4 space-y-3">{primary.map((item) => <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[#B8CBDD]"><Info size={16} className="mt-1 shrink-0 text-[#EBC27D]" />{item}</p>)}{details.length > 0 ? <details className="border-t border-[#213D52] pt-3"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-black text-[#F1D9A8]"><ChevronDown size={15} /> 상세 제한사항 보기 ({details.length})</summary><div className="mt-2 space-y-3">{details.map((item) => <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[#B8CBDD]"><Info size={16} className="mt-1 shrink-0 text-[#EBC27D]" />{item}</p>)}</div></details> : null}</div>}
  </section>;
}

function EmptyResult({ text }: { text: string }) {
  return <p className="mt-4 rounded-[18px] border border-dashed border-[#29465D] p-4 text-sm font-semibold text-[#93AFC2]">{text}</p>;
}
