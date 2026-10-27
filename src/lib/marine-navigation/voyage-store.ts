import type { SavedWaypoint } from "./types";
import type { Voyage } from "./voyage";
import { MAX_VOYAGE_POINTS } from "./voyage";
import { isValidMapPoint } from "./adapters/navigation-map-geojson";

export const VOYAGE_STORE_LIMITS = { voyages: 20, waypoints: 100, bytes: 12 * 1024 * 1024 };
type Row = {key: string; value: Voyage | SavedWaypoint};
const finitePositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function validWaypoint(v: unknown): v is SavedWaypoint {
  if (!v || typeof v !== 'object') return false;
  const p = v as SavedWaypoint;
  return isValidMapPoint(p) && typeof p.id === 'string' && p.id.length <= 150 && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80 && finitePositive(p.createdAt) && ['manual','fishing_spot','marina','port','marine_place'].includes(p.sourceType) && (p.note == null || (typeof p.note === 'string' && p.note.length <= 500));
}
export function validVoyage(v: unknown): v is Voyage {
  if (!v || typeof v !== 'object') return false;
  const x = v as Voyage;
  return x.version === 1 && typeof x.id === 'string' && x.id.length <= 100 && ['PAUSED','COMPLETED'].includes(x.state) && x.activeSince === null && typeof x.simulation === 'boolean'
    && [x.startedAt,x.elapsedMs,x.distanceMeters,x.movingMs].every(finitePositive) && x.startedAt > 0 && (x.endedAt == null || finitePositive(x.endedAt))
    && (x.maxKnots == null || finitePositive(x.maxKnots)) && (x.destinationName == null || (typeof x.destinationName==='string' && x.destinationName.length<=120))
    && Array.isArray(x.points) && x.points.length <= MAX_VOYAGE_POINTS && x.points.every((p,i) => isValidMapPoint(p) && finitePositive(p.timestamp) && p.timestamp > 0 && p.timestamp < 8.64e15 && finitePositive(p.accuracyMeters) && p.accuracyMeters <= 50 && (i === 0 || p.timestamp > x.points[i-1].timestamp) && ['GPS_NATIVE','GPS_DERIVED','SIMULATION'].includes(p.source));
}
export function withinStorageLimits(rows: Row[],kind:'voyage'|'waypoint') {
  return rows.filter(r=>r.key.startsWith(`${kind}:`)).length <= (kind==='voyage'?VOYAGE_STORE_LIMITS.voyages:VOYAGE_STORE_LIMITS.waypoints) && new TextEncoder().encode(JSON.stringify(rows)).length <= VOYAGE_STORE_LIMITS.bytes;
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('이 브라우저는 로컬 기록 저장을 지원하지 않습니다.')); return; }
    const req = indexedDB.open('blue-marina-navigation-v5',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('records',{keyPath:'key'});};
    req.onsuccess=()=>{const db=req.result; db.onversionchange=()=>db.close();resolve(db);};
    req.onerror=()=>reject(Error('로컬 저장소를 열 수 없습니다. 브라우저 저장 권한을 확인하세요.'));
    req.onblocked=()=>reject(Error('다른 Navigation 탭을 닫은 뒤 다시 시도하세요.'));
  });
}
export async function readNavigationRecords() {
  const db=await openDb();
  try { return await new Promise<{voyages:Voyage[];waypoints:SavedWaypoint[]}>((resolve,reject)=>{
    const tx=db.transaction('records','readonly'); const req=tx.objectStore('records').getAll();
    tx.oncomplete=()=>{const rows=req.result as Row[];resolve({voyages:rows.filter(r=>r.key.startsWith('voyage:') && validVoyage(r.value)).map(r=>r.value as Voyage).sort((a,b)=>b.startedAt-a.startedAt),waypoints:rows.filter(r=>r.key.startsWith('waypoint:') && validWaypoint(r.value)).map(r=>r.value as SavedWaypoint)});};
    tx.onerror=()=>reject(Error('기록을 읽을 수 없습니다.')); });
  } finally {db.close();}
}
export async function writeNavigationRecord(kind:'voyage'|'waypoint', value:Voyage|SavedWaypoint) {
  if (!(kind==='voyage' ? validVoyage(value) : validWaypoint(value))) throw Error('유효하지 않은 기록입니다.');
  const db=await openDb();
  try { await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('records','readwrite'); const store=tx.objectStore('records'); const req=store.getAll(); let reason='저장 실패 또는 용량 부족입니다. 기존 기록을 삭제한 뒤 다시 시도하세요.';
    req.onsuccess=()=>{const key=`${kind}:${value.id}`;const rows=(req.result as Row[]).filter(r=>r.key!==key); rows.push({key,value});
      if (!withinStorageLimits(rows,kind)) {reason='저장 한도(항해 20개·웨이포인트 100개·12 MiB)에 도달했습니다. 기존 기록을 삭제하세요.';tx.abort();return;}
      store.put({key,value});};
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(Error(reason));tx.onerror=()=>reject(Error(reason));
  }); } finally {db.close();}
}
export async function deleteNavigationRecords(kind:'voyage'|'waypoint',id?:string) {
  const db=await openDb();
  try {await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('records','readwrite');const store=tx.objectStore('records');
    if(id)store.delete(`${kind}:${id}`);else{const req=store.openCursor();req.onsuccess=()=>{const c=req.result;if(c){if(String(c.key).startsWith(`${kind}:`))c.delete();c.continue();}};}
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('삭제하지 못했습니다. 다시 시도하세요.'));tx.onabort=()=>reject(Error('삭제가 취소됐습니다.'));
  });} finally {db.close();}
}
