"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { appendVoyage, emptyProximity, etaEstimate, proximityStep, savedVoyage, startVoyage, transitionVoyage, type EtaSample, type Voyage } from "@/lib/marine-navigation/voyage";
import { deleteNavigationRecords, readNavigationRecords, writeNavigationRecord, validWaypoint } from "@/lib/marine-navigation/voyage-store";
import { NavigationWakeLock, type WakeState } from "@/lib/marine-navigation/wake-lock";
import { distanceMeters } from "@/lib/marine-navigation/geo";
import { initialBearingDegrees } from "@/lib/marine-navigation/bearing";
import type { NavigationDestination, SavedWaypoint, VesselPosition } from "@/lib/marine-navigation/types";
import type { FieldAction } from '@/lib/marine-navigation/field-diagnostics';

export function useVoyageManager(fix: VesselPosition | null, destination: NavigationDestination | null, onFieldAction?: (action: FieldAction) => void) {
  const [session,setSession]=useState<Voyage|null>(null);
  const [records,setRecords]=useState<Voyage[]>([]);
  const [waypoints,setWaypoints]=useState<SavedWaypoint[]>([]);
  const [legacyWaypoints,setLegacyWaypoints]=useState<SavedWaypoint[]>([]);
  const [viewed,setViewed]=useState<Voyage|null>(null);
  const [now,setNow]=useState(0);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [radius,setRadius]=useState(0);
  const [alert,setAlert]=useState(false);
  const proximity=useRef(emptyProximity());
  const samples=useRef<EtaSample[]>([]);
  const etaKey=useRef('');
  const [eta,setEta]=useState<number|null>(null);
  const [wakeEnabled,setWakeEnabled]=useState(false);
  const [wakeState,setWakeState]=useState<WakeState>('OFF');
  const wake=useRef<NavigationWakeLock|null>(null);
  const reload=useCallback(async()=>{const data=await readNavigationRecords();setRecords(data.voyages);setWaypoints(data.waypoints);setReady(true);},[]);
  useEffect(()=>{try{const data:unknown=JSON.parse(localStorage.getItem('blue-marina-navigation:waypoints:v1')??'[]');if(Array.isArray(data))setLegacyWaypoints(data.filter(validWaypoint).slice(0,100));}catch{}},[]);
  useEffect(()=>{let mounted=true;readNavigationRecords().then(data=>{if(mounted){setRecords(data.voyages);setWaypoints(data.waypoints);setReady(true);}}).catch(()=>{if(mounted)setNotice('로컬 저장소를 사용할 수 없습니다. 저장·삭제 기능이 제한됩니다.');});return()=>{mounted=false;};},[]);
  useEffect(()=>{const tick=()=>setNow(Date.now());tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{setSession(current=>current ? appendVoyage(current,fix,Date.now()) : current);},[fix]);
  useEffect(()=>{
    const key=destination ? `${destination.id}:${destination.latitude}:${destination.longitude}` : '';
    if(etaKey.current!==key){samples.current=[];proximity.current=emptyProximity();setAlert(false);etaKey.current=key;}
    const estimate=etaEstimate(fix && destination ? distanceMeters(fix,destination) : null,fix,fix && destination ? initialBearingDegrees(fix,destination) : null,now,samples.current);
    samples.current=estimate.samples;setEta(estimate.minutes);
    proximity.current=proximityStep(proximity.current,radius,fix,destination,now);setAlert(proximity.current.alerted);
  },[destination,fix,now,radius]);
  useEffect(()=>{
    const controller=new NavigationWakeLock(navigator.wakeLock ? ()=>navigator.wakeLock.request('screen') : undefined,setWakeState);wake.current=controller;
    const visibility=()=>controller.setVisible(document.visibilityState==='visible');visibility();document.addEventListener('visibilitychange',visibility);
    return()=>{document.removeEventListener('visibilitychange',visibility);controller.destroy();wake.current=null;};
  },[]);
  useEffect(()=>{if(!session || session.state==='COMPLETED')return;const prevent=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[session]);
  async function operation(work:()=>Promise<void>,message:string, action?:FieldAction) {if(busy)return;setBusy(true);try{await work();await reload();setNotice(message);if(action)onFieldAction?.(action);}catch(error){onFieldAction?.('STORAGE_FAILED');setNotice(error instanceof Error ? error.message : '로컬 작업 실패');}finally{setBusy(false);}}
  return { session,records,waypoints,legacyWaypoints,viewed,now,notice,busy,ready,radius,alert,eta,wakeEnabled,wakeState,
    setNotice,
    exported:()=>onFieldAction?.('GPX_EXPORTED'),
    start:()=>{if(!fix || session && session.state!=='COMPLETED')return;setViewed(null);setSession(startVoyage(crypto.randomUUID(),Date.now(),destination?.name,fix.source==='SIMULATION'));setNotice('항해 기록 시작 · 아직 저장되지 않았습니다.');onFieldAction?.('VOYAGE_STARTED');},
    transition:(state:Voyage['state'])=>{if(session && session.state!=='COMPLETED' && session.state!==state)onFieldAction?.(state==='RECORDING'?'VOYAGE_RESUMED':state==='PAUSED'?'VOYAGE_PAUSED':'VOYAGE_COMPLETED');setSession(v=>v?transitionVoyage(v,state,Date.now()):v);if(state==='COMPLETED'){wake.current?.setEnabled(false);setWakeEnabled(false);setNotice('항해 종료 · 기록 저장을 누르면 이 브라우저에 보관됩니다.');}},
    save:()=>session && operation(()=>writeNavigationRecord('voyage',savedVoyage(session,Date.now())),'기록을 이 브라우저에 저장했습니다. 진행 중 기록은 재개 대기 상태로 보관됩니다.','VOYAGE_SAVED_LOCALLY'),
    view:(record:Voyage)=>{onFieldAction?.('VOYAGE_REOPENED');setViewed(record);setNotice('과거 저장 항적 표시 · 현재 GPS 위치가 아닙니다.');},
    closeView:()=>setViewed(null),
    recover:(record:Voyage)=>{if(session && session.state!=='COMPLETED')return;setViewed(null);setSession({...record,state:'PAUSED',activeSince:null,breakSegment:true});setNotice('복구됨 · GPS를 확인하고 재개를 눌러주세요. 자동 재개하지 않습니다.');},
    remove:(id?:string)=>operation(async()=>{await deleteNavigationRecords('voyage',id);setViewed(v=>!id || v?.id===id?null:v);},'항해 기록을 삭제했습니다.'),
    importLegacy:()=>operation(async()=>{for(const p of legacyWaypoints)await writeNavigationRecord('waypoint',p);setLegacyWaypoints([]);},'V4 웨이포인트를 가져왔습니다. 기존 원본은 보존했습니다.'),
    saveWaypoint:(point:SavedWaypoint)=>operation(()=>writeNavigationRecord('waypoint',point),'웨이포인트를 이 브라우저에 저장했습니다.','WAYPOINT_SAVED'),
    removeWaypoint:(id:string)=>operation(()=>deleteNavigationRecords('waypoint',id),'웨이포인트를 삭제했습니다.'),
    selectRadius:(value:number)=>{setRadius(value);proximity.current=emptyProximity();setAlert(false);},
    testWakeFailure:()=>{if(process.env.NODE_ENV==='production')return;wake.current?.setEnabled(false);setWakeEnabled(false);const test=new NavigationWakeLock(async()=>{throw Error('SIMULATED_DENIAL');},setWakeState);test.setEnabled(true);},
    toggleWake:()=>{const enabled=!wakeEnabled;onFieldAction?.(enabled?'WAKE_REQUESTED':'WAKE_RELEASE_REQUESTED');setWakeEnabled(enabled);wake.current?.setEnabled(enabled);},
  };
}
export type VoyageManager=ReturnType<typeof useVoyageManager>;
