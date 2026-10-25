import { speedInUnit } from "@/lib/marine-navigation/vessel-instruments";
import type { NavigationState, VesselPosition } from "@/lib/marine-navigation/types";

export function NavigationInstruments({ navigation, vessel, unit, onUnitChange, following, gpsState = "UNAVAILABLE", accuracy, compass }: { navigation: NavigationState; vessel: VesselPosition | null; unit: "kn" | "km/h"; onUnitChange: () => void; following: boolean; gpsState?: string; accuracy?: number; compass?: number | null }) {
  const speed = speedInUnit(vessel?.speedKnots, unit);
  const bearing = navigation.bearingDegrees;
  const course = vessel?.headingSource !== "DEVICE_ORIENTATION" ? vessel?.heading : null;
  return <section aria-label="항법 계기판" className="z-[530] shrink-0 border-b border-white/20 bg-[#071a23] px-3 py-2 text-white">
    <div className="mx-auto grid max-w-2xl grid-cols-3 items-center gap-2 tabular-nums">
      <button type="button" onClick={onUnitChange} aria-label={`속도 단위 전환, 현재 ${unit}`} className="col-span-2 flex min-h-11 items-baseline gap-2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9] sm:col-span-1">
        <span className="sr-only">{vessel?.source === "SIMULATION" ? "모의 대지속도 SOG" : "GPS 대지속도 SOG"}</span><strong data-testid="sog-value" className="text-[clamp(3rem,11vw,4rem)] font-bold leading-none tracking-tight">{speed == null ? "—" : speed.toFixed(1)}</strong><span className="text-base font-semibold text-[#b5eee1]">{unit}</span>
      </button>
      <div className="space-y-1 text-right sm:col-span-2 sm:flex sm:justify-end sm:gap-8 sm:space-y-0">
        <div><span className="block text-[11px] text-[#c3d9d3]">목적지 직선거리</span><strong className="text-xl">{navigation.distanceMeters == null ? "—" : (navigation.distanceMeters / 1852).toFixed(2)}</strong><span className="ml-1 text-xs">nm</span></div>
        <div><span className="block text-[11px] text-[#c3d9d3]">목적지 방위</span><strong className="text-xl">{bearing == null ? "—" : `${(Math.round(bearing) % 360).toString().padStart(3, "0")}°`}</strong></div>
      </div>
    </div>
    <div className="mx-auto mt-2 flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-1.5 text-[11px] text-[#d5e8e1]">
      <span data-testid="gps-quality" className={gpsState === "LIVE" ? "font-semibold text-[#8fffe9]" : "font-semibold text-amber-200"}>{vessel?.source === "SIMULATION" ? "모의 GPS · " : ""}{gpsState}</span>
      <span>{following ? "FOLLOW ON" : "자유 탐색"}</span><span>오차 {accuracy == null ? "—" : `±${Math.round(accuracy)}m`}</span>
      <span>COG {course == null ? "—" : `${Math.round(course) % 360}°`}</span>{compass != null ? <span>나침반 {Math.round(compass) % 360}°</span> : null}
    </div>
  </section>;
}
