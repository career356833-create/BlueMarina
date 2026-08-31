import { AlertTriangle, CheckCircle2, RadioTower } from "lucide-react";
import type { GeolocationFailure, NavigationState } from "@/lib/marine-navigation/types";

const errors: Record<GeolocationFailure, string> = {
  "permission-denied": "위치 권한이 거부되었습니다.", unavailable: "현재 위치를 확인할 수 없습니다.", timeout: "위치 확인 시간이 초과되었습니다.", unknown: "위치 센서 오류가 발생했습니다.",
};

export function NavigationStatus({ navigation, mode, gpsActive, failure, queryError }: {
  navigation: NavigationState; mode: "live" | "simulation"; gpsActive: boolean; failure: GeolocationFailure | null; queryError?: string;
}) {
  return (
    <div className="border-b border-white/10 px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {navigation.status === "arrived" ? <CheckCircle2 size={16} className="text-[#8cc3a7]" /> : <RadioTower size={16} className="text-[#d2b178]" />}
          <p className="truncate text-xs text-[#cbd2cd]">{navigation.status === "arrived" ? "도착 반경 진입" : navigation.status === "navigating" ? "목적지 추적 중" : "항해 대기"}</p>
        </div>
        <span className={`shrink-0 border px-2 py-1 text-[9px] font-bold ${mode === "simulation" ? "border-[#e5b45e]/60 text-[#f0c77e]" : "border-[#6f9e9d]/50 text-[#9bc1bb]"}`}>{mode === "simulation" ? "SIMULATION" : gpsActive ? "GPS LIVE" : "GPS OFF"}</span>
      </div>
      {(failure || queryError) ? <p className="mt-2 flex items-start gap-2 text-[11px] text-[#efbd70]"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{queryError ?? (failure ? errors[failure] : "")}</p> : null}
    </div>
  );
}
