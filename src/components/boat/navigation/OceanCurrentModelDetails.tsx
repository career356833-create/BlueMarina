import { X } from "lucide-react";
import { KHOA_OCEAN_CURRENT_MODEL_SAFETY_NOTICE } from "@/lib/marine-navigation/adapters/khoa-ocean-current-model";
import type { KhoaRomsPoint } from "@/lib/sea-info/khoa-roms";

export function OceanCurrentModelDetails({ point, onClose }: { point: KhoaRomsPoint; onClose: () => void }) {
  return (
    <section className="mt-2 border border-[#d2b178]/35 bg-[#06131a]/96 p-3 shadow-xl backdrop-blur-md" aria-label="KHOA ROMS 모델 정보">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[9px] tracking-[0.12em] text-[#d2b178]">KHOA ROMS MODEL</p><h2 className="mt-1 font-serif text-base">해양 수치모델 격자</h2></div>
        <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center border border-white/15" aria-label="모델 정보 닫기"><X size={13} /></button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-[10px]">
        <div className="col-span-2"><dt className="text-[#82928e]">유효 시각 원문</dt><dd className="mt-0.5">{point.validAtRaw} <span className="text-[#82928e]">(시간대 미명시)</span></dd></div>
        <div><dt className="text-[#82928e]">유속</dt><dd className="mt-0.5">{point.currentSpeedMps.toFixed(2)} m/s</dd></div>
        <div><dt className="text-[#82928e]">유향 원시값</dt><dd className="mt-0.5">{point.currentDirectionDegreesRaw.toFixed(2)}°</dd></div>
        <div><dt className="text-[#82928e]">모델 수온</dt><dd className="mt-0.5">{point.modelWaterTemperatureCelsius.toFixed(2)} °C</dd></div>
        <div><dt className="text-[#82928e]">자료 상태</dt><dd className="mt-0.5">수치모델 예측</dd></div>
        <div className="col-span-2"><dt className="text-[#82928e]">위치</dt><dd className="mt-0.5">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</dd></div>
      </dl>
      <p className="mt-3 border-l-2 border-[#d0a064] bg-[#d0a064]/8 px-2.5 py-2 text-[9px] leading-4 text-[#dbc8a9]">방향 기준 정의 미확인으로 화살표 방향은 표시하지 않습니다.</p>
      <p className="mt-2 text-[9px] leading-4 text-[#899793]">{KHOA_OCEAN_CURRENT_MODEL_SAFETY_NOTICE}</p>
    </section>
  );
}
