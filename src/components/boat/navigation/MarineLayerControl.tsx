import { Anchor, Layers3, Navigation, ShieldAlert, X } from "lucide-react";
import type { KhoaDeepWaterRouteProperties } from "@/lib/marine-navigation/adapters/khoa-deep-water-route";
import type { KhoaHarborZoneProperties } from "@/lib/marine-navigation/adapters/khoa-harbor-zone";
import type { KhoaNavigationAid } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import { KHOA_TRAINING_FIRING_ZONE_WARNING, type KhoaTrainingFiringZoneProperties } from "@/lib/marine-navigation/adapters/khoa-training-firing-zone";

export type MarineLayerState = "loading" | "ready" | "failed";
export type SelectedMarineFeature =
  | { kind: "deep-water-route"; properties: KhoaDeepWaterRouteProperties }
  | { kind: "harbor-zone"; properties: KhoaHarborZoneProperties }
  | { kind: "navigation-aid"; properties: KhoaNavigationAid }
  | { kind: "training-firing-zone"; properties: KhoaTrainingFiringZoneProperties };

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
    <label className="flex cursor-pointer items-start gap-2.5 border-b border-white/10 py-2.5 last:border-b-0">
      <input type="checkbox" checked={visible} disabled={state === "failed"} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-[#c8a66c]" />
      <Icon size={15} className="mt-0.5 text-[#d2b178]" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs">{label}</span>
        <span className="mt-0.5 block text-[9px] text-[#899793]">{description}</span>
      </span>
      <span className={`pt-0.5 text-[9px] ${state === "failed" ? "text-[#d58a7a]" : "text-[#879b96]"}`}>{stateLabel(state)}</span>
    </label>
  );
}

function FeatureDetails({ selected, onClose }: { selected: SelectedMarineFeature; onClose: () => void }) {
  const isHarbor = selected.kind === "harbor-zone";
  const isNavigationAid = selected.kind === "navigation-aid";
  const isTrainingFiringZone = selected.kind === "training-firing-zone";
  const title = isNavigationAid
    ? selected.properties.koreanName ?? selected.properties.englishName ?? selected.properties.sourceRecordId
    : selected.properties.name ?? selected.properties.id;
  return (
    <section className="mt-2 border border-[#d2b178]/35 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label={isNavigationAid ? "항행표지 정보" : isHarbor ? "항만구역 정보" : isTrainingFiringZone ? "훈련·사격구역 정보" : "깊은수심 항로 정보"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.12em] text-[#d2b178]">{isNavigationAid ? "NAVIGATION AID" : isHarbor ? "HARBOR ZONE" : isTrainingFiringZone ? "STATIC REFERENCE ZONE" : "DEEP-WATER ROUTE"}</p>
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
        </> : <>
          {selected.properties.locationName ? <div><dt className="text-[#82928e]">위치명</dt><dd className="mt-0.5">{selected.properties.locationName}</dd></div> : null}
          {selected.properties.referenceChartNumber ? <div><dt className="text-[#82928e]">참조 해도</dt><dd className="mt-0.5">{selected.properties.referenceChartNumber}</dd></div> : null}
          {selected.properties.referenceChartScale ? <div><dt className="text-[#82928e]">해도 축척</dt><dd className="mt-0.5">{selected.properties.referenceChartScale}</dd></div> : null}
          {selected.properties.organization ? <div><dt className="text-[#82928e]">관련 기관</dt><dd className="mt-0.5">{selected.properties.organization}</dd></div> : null}
          {selected.properties.revisionYear ? <div><dt className="text-[#82928e]">개정 연도</dt><dd className="mt-0.5">{selected.properties.revisionYear}</dd></div> : null}
          {selected.properties.effectiveDateText ? <div><dt className="text-[#82928e]">발효 정보</dt><dd className="mt-0.5">{selected.properties.effectiveDateText}</dd></div> : null}
        </>}
      </dl>
      {isTrainingFiringZone ? <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">현재 활성 상태를 나타내지 않습니다.<br />{KHOA_TRAINING_FIRING_ZONE_WARNING}</p> : null}
      <p className="mt-3 border-t border-white/10 pt-2 text-[9px] leading-4 text-[#899793]">출처: 국립해양조사원(KHOA)<br />참고용 해양공간정보이며 공식 항법장비를 대체하지 않습니다.</p>
    </section>
  );
}

export function MarineLayerControl({ deepWaterRouteVisible, deepWaterRouteState, harborZoneVisible, harborZoneState, navigationAidsVisible, navigationAidsState, trainingFiringZoneVisible, trainingFiringZoneState, selected, onDeepWaterRouteVisibleChange, onHarborZoneVisibleChange, onNavigationAidsVisibleChange, onTrainingFiringZoneVisibleChange, onCloseFeature }: {
  deepWaterRouteVisible: boolean;
  deepWaterRouteState: MarineLayerState;
  harborZoneVisible: boolean;
  harborZoneState: MarineLayerState;
  navigationAidsVisible: boolean;
  navigationAidsState: MarineLayerState;
  trainingFiringZoneVisible: boolean;
  trainingFiringZoneState: MarineLayerState;
  selected: SelectedMarineFeature | null;
  onDeepWaterRouteVisibleChange: (visible: boolean) => void;
  onHarborZoneVisibleChange: (visible: boolean) => void;
  onNavigationAidsVisibleChange: (visible: boolean) => void;
  onTrainingFiringZoneVisibleChange: (visible: boolean) => void;
  onCloseFeature: () => void;
}) {
  return (
    <div className="absolute right-3 top-14 z-[500] w-[min(292px,calc(100vw-24px))] text-[#f2eee3]">
      <div className="border border-white/15 bg-[#06131a]/94 px-3 shadow-xl backdrop-blur-md" aria-label="해양 레이어">
        <LayerToggle label="깊은수심 항로" description="국립해양조사원 공개 공간정보" visible={deepWaterRouteVisible} state={deepWaterRouteState} onChange={onDeepWaterRouteVisibleChange} icon="layers" />
        <LayerToggle label="항만구역" description="전자해도 기반 항만 면형정보" visible={harborZoneVisible} state={harborZoneState} onChange={onHarborZoneVisibleChange} icon="anchor" />
        <LayerToggle label="항행표지" description="전국 항로표지 · 기본 OFF" visible={navigationAidsVisible} state={navigationAidsState} onChange={onNavigationAidsVisibleChange} icon="navigation" />
        <LayerToggle label="훈련·사격구역" description="공개 경계 · 활성 상태 아님" visible={trainingFiringZoneVisible} state={trainingFiringZoneState} onChange={onTrainingFiringZoneVisibleChange} icon="warning" />
      </div>
      {selected ? <FeatureDetails selected={selected} onClose={onCloseFeature} /> : null}
    </div>
  );
}
