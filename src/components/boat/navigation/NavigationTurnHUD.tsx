import { normalizeDegrees } from "@/lib/marine-navigation/bearing";
import { getTurnGuidance } from "@/lib/marine-navigation/turn-guidance";
import type { NavigationState, VesselPosition } from "@/lib/marine-navigation/types";

const headingOffsets = [-30, -20, -10, 0, 10, 20, 30] as const;

function headingLabel(value: number) {
  return Math.round(normalizeDegrees(value)).toString().padStart(3, "0");
}

function distanceLabel(distanceMeters: number | null) {
  if (distanceMeters == null) return "DIST ---";
  if (distanceMeters < 1_000) return `DIST ${Math.round(distanceMeters)} M`;
  return `DIST ${(distanceMeters / 1_000).toFixed(distanceMeters < 10_000 ? 1 : 0)} KM`;
}

export function NavigationTurnHUD({ navigation, vessel }: { navigation: NavigationState; vessel: VesselPosition | null }) {
  const heading = vessel?.heading ?? null;
  const guidance = navigation.relativeBearingDegrees == null ? null : getTurnGuidance(navigation.relativeBearingDegrees);
  const status = !navigation.destination
    ? "목적지 선택"
    : !vessel
      ? "GPS 위치 확인 중"
      : heading == null
        ? "나침반을 켜세요"
        : guidance?.direction === "port"
          ? `◀ 좌현 ${guidance.angleDegrees}°`
          : guidance?.direction === "starboard"
            ? `우현 ${guidance.angleDegrees}° ▶`
            : "◇ 침로 유지 ◇";

  return (
    <div className="pointer-events-none absolute inset-x-4 top-[18%] z-[510] mx-auto h-[46%] max-h-[230px] min-h-[170px] max-w-[430px] text-[#8fffe9] drop-shadow-[0_1px_2px_rgba(0,18,16,0.95)]" role="status" aria-label={`방향 HUD: ${status}`}>
      <svg viewBox="0 0 360 200" className="h-full w-full" role="img" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M26 72v-22h28 M306 50h28v22" strokeWidth="1.4" opacity=".78" />
          <path d="M26 148v22h28 M306 170h28v-22" strokeWidth="1.4" opacity=".78" />
          <path d="M58 58h244" strokeWidth="1.2" opacity=".8" />
          {headingOffsets.map((offset, index) => {
            const x = 58 + index * (244 / (headingOffsets.length - 1));
            return <path key={offset} d={`M${x} 58v${offset === 0 ? 13 : 7}`} strokeWidth={offset === 0 ? 2 : 1.1} />;
          })}
          <path d="M174 45l6 8 6-8" strokeWidth="1.8" />
          <path d="M72 111h74l10-7 M204 104l10 7h74" strokeWidth="1.8" />
          <circle cx="180" cy="108" r="13" strokeWidth="1.8" />
          <path d="M180 94v-12 M167 108h-12 M193 108h12" strokeWidth="1.4" />
          {guidance?.direction === "port" ? <path d="M145 136H95m0 0 10-7m-10 7 10 7" strokeWidth="2.4" /> : null}
          {guidance?.direction === "starboard" ? <path d="M215 136h50m0 0-10-7m10 7-10 7" strokeWidth="2.4" /> : null}
          {guidance?.direction === "aligned" ? <path d="M166 136h28m-14-7v14" strokeWidth="2" /> : null}
        </g>
        {headingOffsets.map((offset, index) => {
          const x = 58 + index * (244 / (headingOffsets.length - 1));
          const label = heading == null ? "---" : headingLabel(heading + offset);
          return <text key={offset} x={x} y="78" textAnchor="middle" fill="currentColor" fontSize={offset === 0 ? "11" : "8"} fontWeight={offset === 0 ? "700" : "500"} opacity={offset === 0 ? "1" : ".72"}>{label}</text>;
        })}
        <text x="180" y="28" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700" letterSpacing="1.4">{status}</text>
        <text x="180" y="163" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="600" letterSpacing="1">
          {navigation.bearingDegrees == null ? "BRG ---" : `BRG ${headingLabel(navigation.bearingDegrees)}`} · {distanceLabel(navigation.distanceMeters)}
        </text>
        <text x="180" y="181" textAnchor="middle" fill="currentColor" fontSize="7.5" letterSpacing=".8" opacity=".7">DIRECT BEARING AID</text>
      </svg>
    </div>
  );
}
