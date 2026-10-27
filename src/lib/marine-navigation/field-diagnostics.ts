// Local, bounded and allowlisted. Never accept raw errors, positions, URLs or account data.
export const FIELD_EVENT_LIMIT = 300;
export const MANUAL_RESULTS = ['NOT_TESTED', 'PASS', 'FAIL', 'NOT_SUPPORTED'] as const;
export type ManualResult = typeof MANUAL_RESULTS[number];
export const FIELD_CHECKLIST = [
  ['NAV-R01', 'PWA 설치 및 실행', '홈 화면에 설치한 앱으로 실행했는지 확인하세요. 브라우저 탭 실행과 구분합니다.'],
  ['NAV-R02', 'GPS 권한 허용', '상단 GPS 버튼을 누르고 직접 허용하세요. 첫 위치·정확도·신선도를 확인합니다.'],
  ['NAV-R03', 'GPS 권한 거절', '사이트 위치 권한을 거절하고 오류 안내를 확인한 뒤, 권한을 다시 허용하고 GPS를 재시작하세요.'],
  ['NAV-R04', '위치 서비스 OFF', '기기 위치 서비스를 끄고 수신 중단 안내를 확인하세요. OS 설정은 브라우저가 직접 판별할 수 없습니다. 다시 켜고 재시도하세요.'],
  ['NAV-R05', '실제 이동·속도', '안전한 장소에서 이동하며 위치 갱신 간격·정확도·SOG를 확인하세요. speed 미제공은 속도계 실패와 다릅니다. 정지 시 흔들림도 확인합니다.'],
  ['NAV-R06', 'COG / 나침반', '이동 COG와 기기 방향을 구분하세요. 나침반 사용은 별도 버튼으로 허용합니다.'],
  ['NAV-R07', '실제 손가락 조작', '핀치 확대·축소, 드래그, 내 위치 복귀, drawer, 하단 패널 및 세로/가로 화면을 확인하세요. 마우스 시험은 해당하지 않습니다.'],
  ['NAV-R08', '다른 앱 후 복귀', '다른 앱으로 이동했다 돌아와 지도·GPS·세션 상태를 확인하세요.'],
  ['NAV-R09', '화면 잠금 후 복귀', 'Wake Lock을 OFF로 하고 30초 이상 잠근 뒤 복귀하세요. stale→재획득, 지도·세션 상태를 확인합니다.'],
  ['NAV-R10', '네트워크 끊김·복구', '네트워크를 끄고 다시 켜세요. 온라인 표시만으로 타일/API 연결 성공을 판정하지 않습니다.'],
  ['NAV-R11', '외부 지도 앱', '사용 중인 외부 지도 앱으로 이동한 후 Navigation으로 돌아오세요. 앱이 없으면 NOT_SUPPORTED를 선택합니다.'],
  ['NAV-R12', 'Navigation 재진입 3회', '결과를 먼저 내려받고 나갔다가 재진입을 3회 반복하세요. 각 진입에서 GPS를 시작·중지해 중복 갱신이 없는지 확인합니다. 메모리 진단은 새 진입마다 초기화됩니다.'],
  ['NAV-R13', 'Fishing Spot → Conditions → Navigation', '포인트 상세에서 조건 분석, 항법으로 이동해 목적지 이름을 확인하세요.'],
  ['NAV-R14', '이전 상세페이지 복귀', '항법 상단 뒤로 버튼으로 원래 포인트 상세에 돌아가는지 확인하세요.'],
  ['NAV-R15', '지도 오류', '빈 지도·검은 화면·WebGL 오류·마커 소실 여부를 확인하세요.'],
  ['NAV-F01', '실제 3D DEM', '2D/3D를 반복하고 실제 육상 지형 상태와 섬 고도·보트·확대/축소를 확인하세요. 기울기만으로 PASS하지 않습니다. GPS 장소와 지형 시험 장소가 다르면 별도로 판단하세요.'],
  ['NAV-F02', '항해 기록', '시작→위치 갱신→일시정지→재개→종료→저장→재열기를 확인하세요. 시간·거리를 확인하되 불량 GPS에서 거리를 기대하지 마세요.'],
  ['NAV-F03', '웨이포인트 / GPX', '현재 위치·지도 선택·좌표 입력, 저장·목적지 전환·거리 변화와 기록 GPX 다운로드를 확인하세요.'],
  ['NAV-F04', 'Wake Lock', 'ON 시 실제 획득, OFF 시 해제와 앱 복귀 후 상태를 확인하세요. 절전 정책으로 거절될 수 있습니다.'],
] as const;

const enums = {
  deviceType: ['ANDROID','IOS','DESKTOP','UNKNOWN'], browser: ['CHROME','SAFARI','EDGE','FIREFOX','OTHER','UNKNOWN'],
  gpsSupported: ['SUPPORTED','UNSUPPORTED','UNKNOWN'], permission: ['GRANTED','DENIED','PROMPT','UNKNOWN'],
  gpsQuality: ['OFF','ACQUIRING','GOOD','LOW_ACCURACY','STALE','UNAVAILABLE','UNKNOWN'],
  fixSource: ['REAL_GPS','SIMULATION','UNKNOWN'], nativeSpeed: ['AVAILABLE','NOT_PROVIDED','UNKNOWN'],
  nativeCog: ['AVAILABLE','NOT_PROVIDED','UNKNOWN'], sogDisplay: ['AVAILABLE','UNAVAILABLE','UNKNOWN'],
  compassSupported: ['SUPPORTED','UNSUPPORTED','UNKNOWN'], compassReading: ['AVAILABLE','UNKNOWN'],
  terrain: ['FLAT','PITCH_ONLY','LOADING','ACTIVE','UNSUPPORTED','UNAVAILABLE','UNKNOWN'],
  map: ['LOADED','LOADING','UNKNOWN'], mapError: ['NONE_OBSERVED','DEM_SOURCE_ERROR','MAP_RESOURCE_ERROR','WEBGL_CONTEXT_LOST','WEBGL_CONTEXT_RESTORED','MAP_INIT_FAILED','UNKNOWN'],
  camera: ['2d','3d','UNKNOWN'], follow: ['ON','OFF','UNKNOWN'],
  wakeSupported: ['SUPPORTED','UNSUPPORTED','UNKNOWN'], wake: ['OFF','REQUESTING','ACTIVE','SUSPENDED','FAILED','UNSUPPORTED','UNKNOWN'],
  network: ['ONLINE','OFFLINE','UNKNOWN'], visibility: ['VISIBLE','HIDDEN','UNKNOWN'],
  voyage: ['IDLE','RECORDING','PAUSED','COMPLETED','UNKNOWN'], track: ['VISIBLE','HIDDEN','UNKNOWN'],
  pwaDisplay: ['STANDALONE','BROWSER','UNKNOWN'],
} as const;
export type FieldEnumKey = keyof typeof enums;
export type FieldValues = Partial<Record<FieldEnumKey, string>> & { accuracyMeters?: number | null; lastFixAt?: number | null; updateIntervalMs?: number | null; firstFixMs?: number | null; fixAgeMs?: number | null; validPoints?: number | null };
const numericKeys = ['accuracyMeters','lastFixAt','updateIntervalMs','firstFixMs','fixAgeMs','validPoints'] as const;
export const FIELD_ACTIONS = ['DIAGNOSTIC_STARTED','DIAGNOSTIC_STOPPED','GPS_REQUESTED','GPS_FIX_ACQUIRED','GPS_RECOVERED','VOYAGE_STARTED','VOYAGE_PAUSED','VOYAGE_RESUMED','VOYAGE_COMPLETED','VOYAGE_SAVED_LOCALLY','VOYAGE_REOPENED','WAYPOINT_SAVED','GPX_EXPORTED','STORAGE_FAILED','WAKE_REQUESTED','WAKE_RELEASE_REQUESTED'] as const;
export type FieldAction = typeof FIELD_ACTIONS[number];
export type FieldEvent = { elapsedMs: number; type: string; value?: string };

export function sanitizeFieldValues(input: FieldValues): FieldValues {
  const output: FieldValues = {};
  for (const key of Object.keys(enums) as FieldEnumKey[]) {
    const value = input[key];
    if (typeof value === 'string' && (enums[key] as readonly string[]).includes(value)) output[key] = value;
  }
  for (const key of numericKeys) {
    const value = input[key];
    if (value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 8.64e15) output[key] = value === null ? null : Math.round(value);
  }
  return output;
}

export function coarseDevice(agent: string) {
  return { deviceType: /Android/i.test(agent) ? 'ANDROID' : /iPhone|iPad|iPod/i.test(agent) ? 'IOS' : /Windows|Macintosh|Linux/i.test(agent) ? 'DESKTOP' : 'UNKNOWN', browser: /Edg/i.test(agent) ? 'EDGE' : /Firefox|FxiOS/i.test(agent) ? 'FIREFOX' : /Chrome|CriOS/i.test(agent) ? 'CHROME' : /Safari/i.test(agent) ? 'SAFARI' : 'OTHER' };
}

export class FieldRecorder {
  active = false;
  private startedAt = 0;
  private endedAt: number | null = null;
  private requestAt: number | null = null;
  private previousFix: number | null = null;
  private events: FieldEvent[] = [];
  private dropped = 0;
  private values: FieldValues = {};
  private manual: Record<string, ManualResult> = {};
  start(now = Date.now()) {
    this.active = true; this.startedAt = now; this.endedAt = null; this.requestAt = null; this.previousFix = null;
    this.events = []; this.dropped = 0;
    this.values = Object.fromEntries(Object.keys(enums).map(key => [key,'UNKNOWN']));
    this.manual = Object.fromEntries(FIELD_CHECKLIST.map(([id]) => [id,'NOT_TESTED']));
    this.action('DIAGNOSTIC_STARTED', now);
  }
  stop(now = Date.now()) { if (!this.active) return; this.tick(now); this.action('DIAGNOSTIC_STOPPED',now); this.active = false; this.endedAt = now; }
  private append(type: string, value: string | undefined, now: number) {
    this.events.push({elapsedMs: Math.max(0,now-this.startedAt),type,...(value ? {value} : {})});
    if (this.events.length > FIELD_EVENT_LIMIT) { this.events.shift(); this.dropped++; }
  }
  action = (type: FieldAction, now = Date.now()) => {
    if (!this.active || !(FIELD_ACTIONS as readonly string[]).includes(type)) return;
    this.append(type,undefined,now);
    if (type === 'GPS_REQUESTED') { this.requestAt = now; this.previousFix = null; this.values.firstFixMs = null; }
  };
  observe = (input: FieldValues, now = Date.now()) => {
    if (!this.active) return;
    const next = sanitizeFieldValues(input);
    if (this.values.lastFixAt != null && (next.lastFixAt == null || next.lastFixAt < this.values.lastFixAt)) delete next.lastFixAt;
    for (const key of Object.keys(enums) as FieldEnumKey[]) {
      if (next[key] != null && next[key] !== this.values[key]) this.append(key,next[key],now);
    }
    if (next.gpsQuality === 'GOOD' && ['STALE','UNAVAILABLE','LOW_ACCURACY'].includes(this.values.gpsQuality ?? '')) this.action('GPS_RECOVERED',now);
    this.values = {...this.values,...next};
    this.tick(now);
  };
  tick(now = Date.now()) {
    if (this.active && this.values.lastFixAt != null) this.values.fixAgeMs = Math.max(0,Math.round(now-this.values.lastFixAt));
  }
  fix(input: { timestamp: number; speedAvailable: boolean; cogAvailable: boolean; simulation: boolean }, now = Date.now()) {
    if (!this.active || !Number.isFinite(input.timestamp) || input.timestamp <= 0 || input.timestamp > now + 2000 || (this.previousFix != null && input.timestamp <= this.previousFix)) return;
    const first = this.previousFix == null;
    this.observe({lastFixAt: input.timestamp, updateIntervalMs: first ? null : input.timestamp-this.previousFix!, firstFixMs: first ? this.requestAt == null ? null : Math.max(0,now-this.requestAt) : this.values.firstFixMs, nativeSpeed: input.speedAvailable ? 'AVAILABLE' : 'NOT_PROVIDED', nativeCog: input.cogAvailable ? 'AVAILABLE' : 'NOT_PROVIDED', fixSource: input.simulation ? 'SIMULATION' : 'REAL_GPS'},now);
    if (first) this.action('GPS_FIX_ACQUIRED',now);
    this.previousFix = input.timestamp;
  }
  setManual(id: string, result: ManualResult) {
    if (FIELD_CHECKLIST.some(([key]) => key === id) && (MANUAL_RESULTS as readonly string[]).includes(result)) this.manual[id] = result;
  }
  report() {
    return {
      schemaVersion: 1, program: 'NAVIGATION_V5_FIELD_DIAGNOSTICS_V1', collection: this.active ? 'RECORDING' : 'STOPPED',
      decision: 'FIELD_DIAGNOSTICS_READY', realDeviceGate: 'MANUAL_TEST_REQUIRED',
      startedAt: this.startedAt, endedAt: this.endedAt, automatedObservations: sanitizeFieldValues(this.values),
      manualTests: {...this.manual}, events: this.events.map(e=>({...e})), droppedEvents: this.dropped,
      errors: this.events.filter(e=>e.type==='mapError' && !['UNKNOWN','NONE_OBSERVED','WEBGL_CONTEXT_RESTORED'].includes(e.value??'') || e.type==='wake' && e.value==='FAILED' || ['terrain','gpsQuality'].includes(e.type) && e.value==='UNAVAILABLE' || e.type==='STORAGE_FAILED').map(e=>({...e})),
      limitations: ['Support is not successful operation','OS location service and physical gestures require manual testing','No coordinates, tracks, account identifiers or raw errors collected','Memory only: export before leaving or refreshing','Online does not prove provider reachability','No safe-route or background GPS guarantee'],
    };
  }
}
export type FieldReport = ReturnType<FieldRecorder['report']>;
export type MapFieldObservation = Pick<FieldValues,'map'|'terrain'|'mapError'>;
