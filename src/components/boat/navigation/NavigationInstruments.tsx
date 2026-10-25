import { speedInUnit } from "@/lib/marine-navigation/vessel-instruments";
import type { NavigationState, VesselPosition } from "@/lib/marine-navigation/types";

export function NavigationInstruments({ navigation, vessel, unit, onUnitChange, following }: { navigation: NavigationState; vessel: VesselPosition | null; unit: "kn" | "km/h"; onUnitChange: () => void; following: boolean }) {
  const speed = speedInUnit(vessel?.speedKnots, unit);
  const bearing = navigation.bearingDegrees;
  return <section aria-label="항법 계기판" className="z-[530] shrink-0 border-b border-white/15 bg-[#071a23] px-3 py-1.5 text-[#e7f8f2]">
    <div className="mx-auto grid max-w-xl grid-cols-3 divide-x divide-white/15 text-center tabular-nums">
      <button type="button" onClick={onUnitChange} aria-label={`속도 단위 전환, 현재 ${unit}`} className="min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]"><span className="block text-[9px] text-[#9fbab6]">{vessel?.source === "SIMULATION" ? "모의 대지속도 SOG" : "GPS 대지속도 SOG"}</span><strong className="text-2xl">{speed == null ? "—" : speed.toFixed(1)}</strong><span className="ml-1 text-xs">{unit}</span></button>
      <div><span className="block text-[9px] text-[#9fbab6]">목적지 직선거리</span><strong className="text-2xl">{navigation.distanceMeters == null ? "—" : (navigation.distanceMeters / 1852).toFixed(2)}</strong><span className="ml-1 text-xs">nm</span></div>
      <div><span className="block text-[9px] text-[#9fbab6]">목적지 방위</span><strong className="text-2xl">{bearing == null ? "—" : `${(Math.round(bearing) % 360).toString().padStart(3, "0")}°`}</strong></div>
    </div>
    <p className="mt-1 text-center text-[10px] text-[#9fbab6]">{following ? "보트 추적 ON" : "자유 탐색 · 추적 OFF"} · 정확도 {vessel?.accuracyMeters == null ? "미확인" : `±${Math.round(vessel.accuracyMeters)}m`} · {vessel?.headingSource === "DEVICE_ORIENTATION" ? "기기 나침반" : "GPS 이동방향 COG"} {vessel?.heading == null ? "미확인" : `${Math.round(vessel.heading) % 360}°`}</p>
  </section>;
}
