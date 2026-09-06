import { Anchor, Layers3, LocateFixed, Navigation, ShieldAlert, X } from "lucide-react";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import { KHOA_TRAINING_FIRING_ZONE_WARNING, type KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";
import { KHOA_NAVIGATION_WARNING_SAFETY_NOTICE, type KhoaNavigationWarning, type KhoaNavigationWarningsResponse } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";

export type MarineLayerState = "loading" | "ready" | "failed";
export type SelectedMarineFeature =
  | { kind: "deep-water-route"; properties: KhoaDeepWaterRouteProperties }
  | { kind: "harbor-zone"; properties: KhoaHarborZoneProperties }
  | { kind: "navigation-aid"; properties: KhoaNavigationAid }
  | { kind: "training-firing-zone"; properties: KhoaTrainingFiringZoneProperties }
  | { kind: "navigation-warning"; properties: KhoaNavigationWarning };

function stateLabel(state: MarineLayerState) {
  return state === "loading" ? "LOADING" : state === "failed" ? "UNAVAILABLE" : "KHOA";
}

function LayerToggle({ label, description, visible, state, onChange, icon }: {
  label: string;
  description: string;
  visible: boolean;
  state: MarineLayerState;
  onChange: (visible: boolean) => void;
  icon: "layers" | "anchor" | "navigation" | "warning";
}) {
  const Icon = icon === "anchor" ? Anchor : icon === "navigation" ? Navigation : icon === "warning" ? ShieldAlert : Layers3;
  return (
    <label className="flex cursor-pointer items-start gap-2.5 border-b border-white/10 py-1.5 last:border-b-0 sm:py-2.5">
      <input type="checkbox" checked={visible} disabled={state === "failed"} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-[#c8a66c]" />
      <Icon size={15} className="mt-0.5 text-[#d2b178]" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs">{label}</span>
        <span className="mt-0.5 hidden text-[9px] text-[#899793] sm:block">{description}</span>
      </span>
      <span className={`pt-0.5 text-[9px] ${state === "failed" ? "text-[#d58a7a]" : "text-[#879b96]"}`}>{stateLabel(state)}</span>
    </label>
  );
}

function FeatureDetails({ selected, onClose }: { selected: SelectedMarineFeature; onClose: () => void }) {
  const isHarbor = selected.kind === "harbor-zone";
  const isNavigationAid = selected.kind === "navigation-aid";
  const isTrainingFiringZone = selected.kind === "training-firing-zone";
  const isNavigationWarning = selected.kind === "navigation-warning";
  const title = isNavigationAid
    ? selected.properties.koreanName ?? selected.properties.englishName ?? selected.properties.sourceRecordId
    : isNavigationWarning
      ? selected.properties.title ?? selected.properties.documentNumber
      : selected.properties.name ?? selected.properties.id;
  return (
    <section className="mt-2 border border-[#d2b178]/35 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label={isNavigationAid ? "항행표지 정보" : isHarbor ? "항만구역 정보" : isTrainingFiringZone ? "훈련·사격구역 정보" : isNavigationWarning ? "항행경보 정보" : "깊은수심 항로 정보"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.12em] text-[#d2b178]">{isNavigationAid ? "NAVIGATION AID" : isHarbor ? "HARBOR ZONE" : isTrainingFiringZone ? "STATIC REFERENCE ZONE" : isNavigationWarning ? "NAVIGATION WARNING" : "DEEP-WATER ROUTE"}</p>
          <h2 className="mt-1 font-serif text-base">{title}</h2>
          {selected.kind === "harbor-zone" && selected.properties.englishName && selected.properties.englishName !== selected.properties.name ? <p className="mt-0.5 text-[9px] text-[#899793]">{selected.properties.englishName}</p> : null}
          {selected.kind === "navigation-aid" && selected.properties.englishName ? <p className="mt-0.5 text-[9px] text-[#899793]">{selected.properties.englishName}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center border border-white/15" aria-label="해양공간 정보 닫기"><X size={13} /></button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-[10px]">
        {selected.kind === "deep-water-route" ? <>
          {selected.properties.minDepth != null ? <div><dt className="text-[#82928e]">최소수심</dt><dd className="mt-0.5">{selected.properties.minDepth} m</dd></div> : null}
          {selected.properties.maxDepth != null ? <div><dt className="text-[#82928e]">최대수심</dt><dd className="mt-0.5">{selected.properties.maxDepth} m</dd></div> : null}
          {selected.properties.bearing != null ? <div><dt className="text-[#82928e]">방위</dt><dd className="mt-0.5">{selected.properties.bearing}°</dd></div> : null}
          {selected.properties.trafficFlow ? <div><dt className="text-[#82928e]">교통흐름</dt><dd className="mt-0.5">{selected.properties.trafficFlow}</dd></div> : null}
        </> : selected.kind === "harbor-zone" ? <>
          {selected.properties.harborTypeCode ? <div><dt className="text-[#82928e]">구역 분류</dt><dd className="mt-0.5">{selected.properties.harborTypeCode}</dd></div> : null}
          {selected.properties.relatedInstitutionCode ? <div><dt className="text-[#82928e]">관련기관 코드</dt><dd className="mt-0.5">{selected.properties.relatedInstitutionCode}</dd></div> : null}
          {selected.properties.statusCode ? <div><dt className="text-[#82928e]">상태 코드</dt><dd className="mt-0.5">{selected.properties.statusCode}</dd></div> : null}
        </> : selected.kind === "navigation-aid" ? <>
          {selected.properties.aidTypeLabelRaw ? <div><dt className="text-[#82928e]">공식 유형</dt><dd className="mt-0.5">{selected.properties.aidTypeLabelRaw}</dd></div> : null}
          {selected.properties.detailedTypeLabelRaw ? <div><dt className="text-[#82928e]">표지 성격</dt><dd className="mt-0.5">{selected.properties.detailedTypeLabelRaw}</dd></div> : null}
          {selected.properties.lightCharacteristicRaw ? <div><dt className="text-[#82928e]">등질 원문</dt><dd className="mt-0.5">{selected.properties.lightCharacteristicRaw}</dd></div> : null}
          {selected.properties.coastlineTypeRaw ? <div><dt className="text-[#82928e]">해역</dt><dd className="mt-0.5">{selected.properties.coastlineTypeRaw}</dd></div> : null}
          <div className="col-span-2"><dt className="text-[#82928e]">위치</dt><dd className="mt-0.5">{selected.properties.latitude.toFixed(6)}, {selected.properties.longitude.toFixed(6)}</dd></div>
          {selected.properties.remarks ? <div className="col-span-2"><dt className="text-[#82928e]">비고</dt><dd className="mt-0.5">{selected.properties.remarks}</dd></div> : null}
        </> : selected.kind === "training-firing-zone" ? <>
          {selected.properties.locationName ? <div><dt className="text-[#82928e]">위치명</dt><dd className="mt-0.5">{selected.properties.locationName}</dd></div> : null}
          {selected.properties.referenceChartNumber ? <div><dt className="text-[#82928e]">참조 해도</dt><dd className="mt-0.5">{selected.properties.referenceChartNumber}</dd></div> : null}
          {selected.properties.referenceChartScale ? <div><dt className="text-[#82928e]">해도 축척</dt><dd className="mt-0.5">{selected.properties.referenceChartScale}</dd></div> : null}
          {selected.properties.organization ? <div><dt className="text-[#82928e]">관련 기관</dt><dd className="mt-0.5">{selected.properties.organization}</dd></div> : null}
          {selected.properties.revisionYear ? <div><dt className="text-[#82928e]">개정 연도</dt><dd className="mt-0.5">{selected.properties.revisionYear}</dd></div> : null}
          {selected.properties.effectiveDateText ? <div><dt className="text-[#82928e]">발효 정보</dt><dd className="mt-0.5">{selected.properties.effectiveDateText}</dd></div> : null}
        </> : <>
          <div><dt className="text-[#82928e]">문서번호</dt><dd className="mt-0.5">{selected.properties.documentNumber}</dd></div>
          <div><dt className="text-[#82928e]">상태</dt><dd className="mt-0.5">UNKNOWN</dd></div>
          {selected.properties.noticeCategory ? <div><dt className="text-[#82928e]">경보 분류</dt><dd className="mt-0.5">{selected.properties.noticeCategory}</dd></div> : null}
          {selected.properties.positionName ? <div><dt className="text-[#82928e]">해역</dt><dd className="mt-0.5">{selected.properties.positionName}</dd></div> : null}
          {selected.properties.alarmDate ? <div><dt className="text-[#82928e]">일자 원문</dt><dd className="mt-0.5">{selected.properties.alarmDate}</dd></div> : null}
          {selected.properties.alarmTime ? <div><dt className="text-[#82928e]">시간 원문</dt><dd className="mt-0.5">{selected.properties.alarmTime}</dd></div> : null}
          {selected.properties.content ? <div className="col-span-2"><dt className="text-[#82928e]">내용</dt><dd className="mt-0.5 line-clamp-5 whitespace-pre-line">{selected.properties.content}</dd></div> : null}
          {selected.properties.geometry === null ? <div className="col-span-2 text-[#d6a878]">지도 형상을 보수적으로 확정할 수 없어 목록에만 표시됩니다.</div> : null}
        </>}
      </dl>
      {isTrainingFiringZone ? <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">현재 활성 상태를 나타내지 않습니다.<br />{KHOA_TRAINING_FIRING_ZONE_WARNING}</p> : null}
      {isNavigationWarning ? <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">{KHOA_NAVIGATION_WARNING_SAFETY_NOTICE}</p> : null}
      <p className="mt-3 border-t border-white/10 pt-2 text-[9px] leading-4 text-[#899793]">출처: 국립해양조사원(KHOA)<br />참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.</p>
    </section>
  );
}

function NavigationWarningList({ data, onFocus }: { data: KhoaNavigationWarningsResponse; onFocus: (warning: KhoaNavigationWarning) => void }) {
  const freshnessLabel = data.freshness === "fresh" ? "최신" : data.freshness === "stale" ? "갱신 지연" : "사용 불가";
  return (
    <section className="mt-2 border border-white/15 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label="항행경보 목록">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div><p className="text-[9px] tracking-[0.12em] text-[#d2b178]">DYNAMIC SAFETY</p><p className="mt-0.5 text-xs">항행경보 {data.warnings.length}건</p></div>
        <span className={`text-[9px] ${data.freshness === "fresh" ? "text-[#8bbca9]" : "text-[#d6a878]"}`}>{freshnessLabel}</span>
      </div>
      <div className="bm-navigation-scrollbar max-h-44 overflow-y-auto">
        {data.warnings.map((warning) => (
          <button key={warning.id} type="button" onClick={() => onFocus(warning)} className="flex w-full items-start gap-2 border-b border-white/8 py-2 text-left last:border-0">
            <ShieldAlert size={13} className="mt-0.5 shrink-0 text-[#d2b178]" aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className="block truncate text-[10px]">{warning.title ?? warning.documentNumber}</span><span className="mt-0.5 block truncate text-[9px] text-[#899793]">{warning.positionName ?? warning.area ?? "위치 정보 없음"} · 상태 UNKNOWN</span></span>
            {warning.geometry ? <LocateFixed size={12} className="mt-0.5 shrink-0 text-[#8fa8a0]" aria-label="지도 위치 있음" /> : null}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[8px] leading-3 text-[#899793]">마지막 성공 수신 {new Date(data.lastSuccessfulFetchAt).toLocaleString("ko-KR")}</p>
    </section>
  );
}

export function MarineLayerControl({ deepWaterRouteVisible, deepWaterRouteState, harborZoneVisible, harborZoneState, navigationAidsVisible, navigationAidsState, trainingFiringZoneVisible, trainingFiringZoneState, navigationWarningsVisible, navigationWarningsState, navigationWarningsData, selected, onDeepWaterRouteVisibleChange, onHarborZoneVisibleChange, onNavigationAidsVisibleChange, onTrainingFiringZoneVisibleChange, onNavigationWarningsVisibleChange, onNavigationWarningFocus, onCloseFeature }: {
  deepWaterRouteVisible: boolean;
  deepWaterRouteState: MarineLayerState;
  harborZoneVisible: boolean;
  harborZoneState: MarineLayerState;
  navigationAidsVisible: boolean;
  navigationAidsState: MarineLayerState;
  trainingFiringZoneVisible: boolean;
  trainingFiringZoneState: MarineLayerState;
  navigationWarningsVisible: boolean;
  navigationWarningsState: MarineLayerState;
  navigationWarningsData: KhoaNavigationWarningsResponse | null;
  selected: SelectedMarineFeature | null;
  onDeepWaterRouteVisibleChange: (visible: boolean) => void;
  onHarborZoneVisibleChange: (visible: boolean) => void;
  onNavigationAidsVisibleChange: (visible: boolean) => void;
  onTrainingFiringZoneVisibleChange: (visible: boolean) => void;
  onNavigationWarningsVisibleChange: (visible: boolean) => void;
  onNavigationWarningFocus: (warning: KhoaNavigationWarning) => void;
  onCloseFeature: () => void;
}) {
  return (
    <div className="bm-navigation-scrollbar absolute right-3 top-14 z-[500] max-h-[calc(100%-8rem)] w-[min(292px,calc(100vw-24px))] overflow-y-auto text-[#f2eee3]">
      <div className="border border-white/15 bg-[#06131a]/94 px-3 shadow-xl backdrop-blur-md" aria-label="해양 레이어">
        <LayerToggle label="깊은수심 항로" description="국립해양조사원 공개 공간정보" visible={deepWaterRouteVisible} state={deepWaterRouteState} onChange={onDeepWaterRouteVisibleChange} icon="layers" />
        <LayerToggle label="항만구역" description="전자해도 기반 항만 면형정보" visible={harborZoneVisible} state={harborZoneState} onChange={onHarborZoneVisibleChange} icon="anchor" />
        <LayerToggle label="항행표지" description="전국 항로표지 · 기본 OFF" visible={navigationAidsVisible} state={navigationAidsState} onChange={onNavigationAidsVisibleChange} icon="navigation" />
        <LayerToggle label="훈련·사격구역" description="공개 경계 · 활성 상태 아님" visible={trainingFiringZoneVisible} state={trainingFiringZoneState} onChange={onTrainingFiringZoneVisibleChange} icon="warning" />
        <LayerToggle label="항행경보" description="동적 안전정보 · 기본 OFF" visible={navigationWarningsVisible} state={navigationWarningsState} onChange={onNavigationWarningsVisibleChange} icon="warning" />
      </div>
      {navigationWarningsVisible && navigationWarningsData && !selected ? <NavigationWarningList data={navigationWarningsData} onFocus={onNavigationWarningFocus} /> : null}
      {selected ? <FeatureDetails selected={selected} onClose={onCloseFeature} /> : null}
    </div>
  );
}
