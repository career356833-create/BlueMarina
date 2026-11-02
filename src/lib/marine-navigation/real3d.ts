import type { MapPresentation } from "./adapters/navigation-map-adapter";
import { isValidMapPoint, toNavigationPointGeoJson, toTrackGeoJson } from "./adapters/navigation-map-geojson";
import { reliableMovementCourse } from "./vessel-instruments";

export type Real3dCameraMode = "TOP_DOWN" | "FORWARD" | "FREE";
export type Real3dSource = { url: string; attribution: string };
export type RendererView = { longitude: number; latitude: number; height: number; heading: number; pitch: number };
export const REAL3D_LIMITS = { cacheBytes: 96 * 1024 * 1024, maximumScreenSpaceError: 24, loadTimeoutMs: 30_000, minimumMemoryGB: 4 };

// Preview-only, same-origin, licensed dataset contract. No default ion token, paid API,
// arbitrary URL/query parameter, or implicit third-party imagery provider.
export function real3dSource(url: string | undefined, attribution: string | undefined): Real3dSource | null {
  if (!url || !/^\/navigation-3d-data\/[a-z0-9_-]+\/tileset\.json$/.test(url) || !attribution?.trim() || attribution.length > 400) return null;
  return { url, attribution: attribution.trim() };
}
export function real3dGate(source: Real3dSource | null, memoryGB?: number, online = true, runtimeAllowed = true): string | null {
  if (!source) return "사용 권한과 한국 coverage가 확인된 실사 3D 데이터가 아직 연결되지 않았습니다.";
  if (!runtimeAllowed) return "실사 3D는 보안 정책 검토 전인 개발용 미리보기입니다. 현재 배포 환경에서는 기존 지도를 사용합니다.";
  if (!online) return "오프라인에서는 실사 3D를 열 수 없습니다. 기존 지도를 사용합니다.";
  if (memoryGB !== undefined && memoryGB < REAL3D_LIMITS.minimumMemoryGB) return "메모리가 제한된 기기에서는 기존 지도를 사용합니다.";
  return null;
}
export function real3dPresentation(p: MapPresentation) {
  // Reuse V5 identity, stale-fix labels and explicit track segment boundaries.
  const points = toNavigationPointGeoJson(p).features;
  const track = toTrackGeoJson(p.track).features;
  const vessel = isValidMapPoint(p.vessel) ? p.vessel : null;
  return { points, track, vessel, course: reliableMovementCourse(vessel),
    accuracy: vessel && Number.isFinite(vessel.accuracyMeters) && vessel.accuracyMeters! > 0 ? vessel.accuracyMeters! : null };
}
export function validRendererView(v: RendererView): boolean {
  return isValidMapPoint(v) && [v.height, v.heading, v.pitch].every(Number.isFinite) && v.height >= 20 && v.height <= 20_000_000;
}

// An epoch owns one GPU renderer. Late async loads must not mount after a switch.
export class RendererLease {
  private epoch = 0;
  private release: (() => void) | undefined;
  begin() { this.clear(); return this.epoch; }
  current(epoch: number) { return epoch === this.epoch; }
  attach(epoch: number, release: () => void) {
    if (!this.current(epoch)) { release(); return false; }
    this.release = release; return true;
  }
  clear() { this.epoch++; const release = this.release; this.release = undefined; release?.(); }
}
