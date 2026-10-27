"use client";
import { useEffect, useState } from "react";
import { averageMovingKnots, gpxFilename, voyageElapsed, voyageGpx, type Voyage } from "@/lib/marine-navigation/voyage";
import { validWaypoint } from "@/lib/marine-navigation/voyage-store";
import type { GeoPoint, NavigationDestination, SavedWaypoint, VesselPosition } from "@/lib/marine-navigation/types";
import type { VoyageManager } from "./useVoyageManager";

const button="min-h-11 rounded-lg border border-white/25 px-3 py-2 text-xs disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8fffe9]";
export const formatVoyageTime=(ms:number)=>`${Math.floor(ms/3600000).toString().padStart(2,'0')}:${Math.floor(ms/60000)%60<10?'0':''}${Math.floor(ms/60000)%60}:${Math.floor(ms/1000)%60<10?'0':''}${Math.floor(ms/1000)%60}`;
export function VoyagePanel({manager:m,fix,mapPoint,onSelect}:{manager:VoyageManager;fix:VesselPosition|null;mapPoint:GeoPoint|null;onSelect:(p:NavigationDestination)=>void}) {
  const [name,setName]=useState('');const [latitude,setLatitude]=useState('');const [longitude,setLongitude]=useState('');const [note,setNote]=useState('');const [editing,setEditing]=useState<SavedWaypoint|null>(null);
  const [waypointOpen,setWaypointOpen]=useState(false);const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
  useEffect(()=>{if(mapPoint){setLatitude(String(mapPoint.latitude));setLongitude(String(mapPoint.longitude));setName('지도 선택 지점');setEditing(null);setWaypointOpen(true);}},[mapPoint]);
  function download(v:Voyage) {const gpx=voyageGpx(v);if(!gpx){m.setNotice('내보낼 유효 항적이 없습니다.');return;}const url=URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml'}));const a=document.createElement('a');a.href=url;a.download=gpxFilename(v);a.click();m.exported();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function saveWaypoint(){
    const p:SavedWaypoint={id:editing?.id??crypto.randomUUID(),createdAt:editing?.createdAt??Date.now(),sourceType:'manual',name:name.trim(),latitude:Number(latitude),longitude:Number(longitude),note:note.trim()};
    if(!latitude.trim() || !longitude.trim() || !validWaypoint(p)){m.setNotice('이름과 위도(-90~90), 경도(-180~180)를 확인하세요.');return;}
    void m.saveWaypoint(p);
  }
  const v=m.session; const active=v && v.state!=='COMPLETED';
  return <section aria-label="항해 관리" className="space-y-4 border-b border-white/15 p-4 text-xs leading-5">
    <h2 className="text-base font-semibold">항해 관리</h2>
    <p>기록·웨이포인트는 저장 버튼을 누를 때 이 브라우저에만 보관됩니다. 서버·계정에 동기화하지 않습니다. 공유 기기에서는 다른 사용자가 볼 수 있습니다.</p>
    <p className="text-[#a9bcb6]">항해 20개 · 각 10,000점 · 웨이포인트 100개 · 총 12 MiB. 저장하지 않은 새 기록은 새로고침 시 사라집니다.</p>
    {m.notice && <p role="status" className="break-words rounded-lg border border-amber-300/30 p-2 text-amber-100">{m.notice}</p>}
    {v && <div data-testid="voyage-statistics" className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-3 tabular-nums">
      <span>{v.simulation?'모의 항해 · ':''}{({RECORDING:'기록 중',PAUSED:'사용자 일시정지',COMPLETED:'종료'})[v.state]}</span><span>{v.state==='RECORDING' && !fix ? 'GPS 측정 불가 · 거리 기록 중단' : ''}</span>
      <span>운항시간 {formatVoyageTime(voyageElapsed(v,m.now))}</span><span>유효 이동거리 {(v.distanceMeters/1852).toFixed(3)} nm</span>
      <span>평균 이동속도 {averageMovingKnots(v)?.toFixed(1)??'—'} kn</span><span>최대 확인속도 {v.maxKnots?.toFixed(1)??'—'} kn</span><span>유효 측정점 {v.points.length}</span><span>현재 SOG {fix?.speedKnots?.toFixed(1)??'—'} kn</span>
      {v.points.length>=10000 && <p className="col-span-2 text-amber-100">기록점 한도 도달 · 종료 후 새 항해를 시작하세요.</p>}
    </div>}
    <div className="flex flex-wrap gap-2">
      {!active && <button className={button} disabled={!fix} onClick={m.start}>새 항해 시작</button>}
      {v?.state==='RECORDING' && <button className={button} onClick={()=>m.transition('PAUSED')}>일시정지</button>}
      {v?.state==='PAUSED' && <button className={button} disabled={!fix || v.points.length>=10000} onClick={()=>m.transition('RECORDING')}>재개</button>}
      {active && <button className={button} onClick={()=>m.transition('COMPLETED')}>항해 종료</button>}
      {v && <><button className={button} disabled={m.busy || !m.ready} onClick={()=>void m.save()}>기록 저장</button><button className={button} disabled={!v.points.length} onClick={()=>download(v)}>현재 항적 GPX 내보내기</button></>}
    </div>
    <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">나의 항해 기록 ({m.records.length})</summary>
      {!m.records.length && <p>저장된 항해가 없습니다.</p>}
      {m.records.map(record=><article key={record.id} className="space-y-2 border-t border-white/20 py-3">
        <p>{record.simulation?'SIMULATION · ':''}{new Date(record.startedAt).toLocaleString('ko-KR')} · {record.state==='PAUSED'?'재개 대기':'종료'}</p>
        <p>{record.destinationName??'목적지 없음'} · {formatVoyageTime(record.elapsedMs)} · {(record.distanceMeters/1852).toFixed(3)} nm · 평균 {averageMovingKnots(record)?.toFixed(1)??'—'} kn</p>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>m.view(record)}>상세·이전 항적 보기</button><button className={button} onClick={()=>download(record)}>GPX 내보내기</button>{record.state==='PAUSED' && <button className={button} disabled={Boolean(active)} onClick={()=>m.recover(record)}>복구 준비</button>}<button className={button} onClick={()=>setConfirmDelete(record.id)}>기록 삭제</button></div>
      </article>)}
      {m.records.length>0 && <button className={button} onClick={()=>setConfirmDelete('ALL')}>전체 항해 기록 삭제</button>}
      {confirmDelete && <div role="alert" className="mt-2 rounded-lg border border-red-300/50 p-3"><p>선택한 {confirmDelete==='ALL'?'모든 ':''}항해 기록을 이 브라우저에서 삭제할까요? 되돌릴 수 없습니다.</p><button className={button} disabled={m.busy} onClick={()=>{void m.remove(confirmDelete==='ALL'?undefined:confirmDelete);setConfirmDelete(null);}}>삭제 확인</button><button className={button} onClick={()=>setConfirmDelete(null)}>취소</button></div>}
    </details>
    {m.viewed && <div className="rounded-lg border border-amber-200/40 p-3"><p>과거 항적 표시 중 · 실시간 위치가 아닙니다.</p><p>{m.viewed.points.length}점 · 최대 {m.viewed.maxKnots?.toFixed(1)??'—'} kn</p><button className={button} onClick={m.closeView}>현재 항적으로 돌아가기</button></div>}
    <details open={waypointOpen} onToggle={e=>setWaypointOpen(e.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-3 font-semibold">웨이포인트 ({m.waypoints.length})</summary>
      {m.legacyWaypoints.length>0 && <button className={button} disabled={m.busy || !m.ready} onClick={()=>void m.importLegacy()}>V4 저장 지점 {m.legacyWaypoints.length}개 가져오기</button>}
      <p>지도를 눌러 지점을 선택하거나 좌표를 직접 입력하세요. 저장된 지점은 안전한 정박지·통항 가능 위치를 뜻하지 않습니다.</p>
      <button className={button} disabled={!fix} onClick={()=>{if(fix){setLatitude(String(fix.latitude));setLongitude(String(fix.longitude));setName('현재 위치');setEditing(null);}}}>현재 GPS 위치 입력</button>
      <div className="mt-2 grid gap-2"><label>이름<input className="mt-1 w-full rounded border border-white/25 bg-[#102832] p-2" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><div className="grid grid-cols-2 gap-2"><label>위도 latitude<input className="mt-1 w-full rounded border border-white/25 bg-[#102832] p-2" inputMode="decimal" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><label>경도 longitude<input className="mt-1 w-full rounded border border-white/25 bg-[#102832] p-2" inputMode="decimal" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label></div><label>메모 (선택)<input className="mt-1 w-full rounded border border-white/25 bg-[#102832] p-2" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><button className={button} disabled={m.busy || !m.ready} onClick={saveWaypoint}>{editing?'웨이포인트 수정 저장':'웨이포인트 저장'}</button></div>
      {m.waypoints.map(p=><article key={p.id} className="mt-3 border-t border-white/15 pt-2"><p className="break-words">{p.name} · {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</p><p className="break-words">{p.note}</p><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>onSelect(p)}>목적지로 설정</button><button className={button} onClick={()=>{setEditing(p);setName(p.name);setLatitude(String(p.latitude));setLongitude(String(p.longitude));setNote(p.note??'');}}>이름·메모 수정</button><button className={button} disabled={m.busy} onClick={()=>void m.removeWaypoint(p.id)}>웨이포인트 삭제</button></div></article>)}
    </details>
    <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">목적지 알림·화면 켜짐 유지</summary>
      <label>접근 반경<select className="ml-2 min-h-11 rounded bg-[#102832] px-3" value={m.radius} onChange={e=>m.selectRadius(Number(e.target.value))}>{[0,300,100,50].map(r=><option key={r} value={r}>{r?r+'m':'OFF'}</option>)}</select></label><p>정확도와 연속 3회 측정으로 반경 진입을 확인합니다. 안전한 도착을 보증하지 않습니다.</p>
      <button className={button} aria-pressed={m.wakeEnabled} onClick={m.toggleWake}>화면 켜짐 유지 {m.wakeEnabled?'ON':'OFF'}</button><p role="status">{({OFF:'꺼짐',REQUESTING:'화면 유지 요청 중',ACTIVE:'화면 켜짐 유지 중',SUSPENDED:'화면 유지 해제됨 · 화면 복귀 시 재요청',UNSUPPORTED:'이 브라우저는 화면 유지를 지원하지 않습니다.',FAILED:'화면 유지 요청 실패 · 다시 ON으로 시도하세요.'})[m.wakeState]}</p>{process.env.NODE_ENV!=="production" && <button className={button} onClick={m.testWakeFailure}>개발 전용 Wake Lock 실패 테스트</button>}<p>절전 모드에서 거절될 수 있으며 백그라운드 GPS 추적을 보장하지 않습니다.</p>
    </details>
    <p className="text-[#a9bcb6]">ETA: 현재 직선 접근속도 기준 참고값. 해류·통항 제한·장애물을 고려하지 않습니다. 항적은 지나온 기록이며 추천 안전항로가 아닙니다.</p>
  </section>;
}
