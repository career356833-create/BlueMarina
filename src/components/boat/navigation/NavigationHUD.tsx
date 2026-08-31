import { Compass, Gauge, LocateFixed, Navigation2, Timer } from "lucide-react";
import { compassDirection } from "@/lib/marine-navigation/bearing";
import { metersToNauticalMiles } from "@/lib/marine-navigation/geo";
import type { NavigationState, VesselPosition } from "@/lib/marine-navigation/types";

const degrees = (value: number | null | undefined) => value == null ? "--" : `${Math.round(value).toString().padStart(3, "0")}°`;

export function NavigationHUD({ navigation, vessel }: { navigation: NavigationState; vessel: VesselPosition | null }) {
  const bearing = navigation.bearingDegrees;
  const instruments = [
    { label: "방위", value: degrees(bearing), detail: bearing == null ? "목적지 없음" : `${compassDirection(bearing)} · HDG ${degrees(vessel?.heading)}`, icon: Compass },
    { label: "거리", value: navigation.distanceMeters == null ? "--" : metersToNauticalMiles(navigation.distanceMeters).toFixed(2), detail: "NM", icon: Navigation2 },
    { label: "속도", value: navigation.speedKnots == null ? "--" : navigation.speedKnots.toFixed(1), detail: "kn", icon: Gauge },
    { label: "ETA", value: navigation.etaMinutes == null ? "--" : `${Math.round(navigation.etaMinutes)}`, detail: "min", icon: Timer },
    { label: "정확도", value: vessel?.accuracyMeters == null ? "--" : `${Math.round(vessel.accuracyMeters)}`, detail: "m", icon: LocateFixed },
  ];
  return (
    <section className="border-y border-white/15 bg-[#06151a]/94 backdrop-blur-md" aria-label="항해 계기판">
      <div className="bm-navigation-scrollbar grid h-[88px] grid-cols-5 overflow-x-auto">
        {instruments.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="flex min-w-[112px] items-center gap-3 border-r border-white/10 px-4 last:border-r-0">
            <Icon size={17} strokeWidth={1.5} className="shrink-0 text-[#d2b178]" aria-hidden="true" />
            <div><p className="text-[10px] text-[#9eaaa5]">{label}</p><p className="mt-1 whitespace-nowrap font-serif text-xl text-[#f2eee3]">{value}</p><p className="text-[10px] text-[#9eaaa5]">{detail}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
