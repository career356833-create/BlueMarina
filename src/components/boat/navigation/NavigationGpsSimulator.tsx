"use client";

import { useEffect, useRef, useState } from "react";
import { GPS_TEST_SCENARIOS, testGpsFrame } from "@/lib/marine-navigation/gps-test-scenarios";
import { initialBearingDegrees } from "@/lib/marine-navigation/bearing";
import { destinationPoint } from "@/lib/marine-navigation/geo";
import type { GeoPoint } from "@/lib/marine-navigation/types";

// Only mounted in development. No endpoint, persistence, or production query flag.
export function NavigationGpsSimulator({ destination, active, onStart, onFix, onUnavailable }: { destination: GeoPoint | null; active: boolean; onStart: () => void; onFix: (fix: GeolocationPosition) => void; onUnavailable: () => void }) {
  const [scenario, setScenario] = useState<number | null>(null);
  const callbacks = useRef({ onFix, onUnavailable });
  callbacks.current = { onFix, onUnavailable };
  const anchor = useRef(destinationPoint(destination ?? { latitude: 35.1543, longitude: 129.1267 }, 255, 750));
  useEffect(() => {
    if (scenario == null || !active) return;
    let tick = 0;
    const emit = () => {
      const course = destination ? initialBearingDegrees(anchor.current,destination) : 75;
      const fix = scenario === 12 ? testGpsFrame(2,tick++,anchor.current,Date.now(),(course+90)%360) : testGpsFrame(scenario, tick++, anchor.current, Date.now(),course);
      if (!fix) { callbacks.current.onUnavailable(); return; }
      if (scenario !== 9 && scenario !== 8 && scenario !== 6) anchor.current = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
      callbacks.current.onFix(fix);
    };
    emit(); const timer = window.setInterval(emit, 1000);
    return () => window.clearInterval(timer);
  }, [scenario, active, destination]);
  return <section aria-label="개발 전용 GPS 테스트" className="border-y border-amber-300/40 bg-amber-950/40 p-4">
    <p className="mb-2 text-xs font-semibold text-amber-200">TEST GPS · 모의 데이터 / 실제 측정 아님</p>
    <div className="grid grid-cols-2 gap-2">{[...GPS_TEST_SCENARIOS, "목적지 횡방향 이동"].map((name, index) => <button key={name} type="button" aria-pressed={scenario === index} onClick={() => { onStart(); setScenario(index); }} className="min-h-11 rounded-lg border border-white/30 px-2 text-xs aria-pressed:bg-amber-300 aria-pressed:text-black">{name}</button>)}</div>
    <button type="button" onClick={() => { setScenario(null); onUnavailable(); }} className="mt-2 min-h-11 rounded-lg border border-white/30 px-3 text-xs">모의 GPS 중지</button>
  </section>;
}
