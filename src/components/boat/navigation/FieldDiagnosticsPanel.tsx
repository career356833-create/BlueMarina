"use client";
import { useState } from 'react';
import { FIELD_CHECKLIST, MANUAL_RESULTS, type FieldEnumKey, type FieldValues, type ManualResult } from '@/lib/marine-navigation/field-diagnostics';
import type { FieldDiagnostics } from './useFieldDiagnostics';

const labels: Partial<Record<keyof FieldValues,string>> = {
  deviceType:'기기 분류 (추정)', browser:'브라우저 분류 (추정)', gpsSupported:'GPS API 지원', permission:'위치 권한', gpsQuality:'GPS 신선도·품질', fixSource:'측정 출처',
  firstFixMs:'GPS 요청→첫 측정 (ms)', accuracyMeters:'GPS 정확도 (m)', lastFixAt:'마지막 측정 시각', updateIntervalMs:'최근 측정 간격 (ms)', fixAgeMs:'측정 나이 (ms)',
  nativeSpeed:'최근 GPS 원본 속도 제공', sogDisplay:'현재 SOG 표시', nativeCog:'최근 GPS 원본 COG 제공', compassSupported:'나침반 API 지원', compassReading:'나침반 실제 수신',
  map:'지도 스타일 로딩', terrain:'실제 DEM 상태', mapError:'진단 중 지도 오류', camera:'2D / 3D 모드', follow:'자동 추적', wakeSupported:'Wake Lock 지원', wake:'Wake Lock 실제 상태',
  network:'브라우저 네트워크', visibility:'페이지 가시성', voyage:'항해 상태', validPoints:'유효 기록점 수', track:'항적 표시', pwaDisplay:'실행 모드',
};
function display(key: string, value: unknown) {
  if (value == null) return 'UNKNOWN';
  if (key === 'lastFixAt' && typeof value === 'number') return new Date(value).toLocaleTimeString();
  if (value === 'ACTIVE' && key === 'terrain') return 'ACTIVE · DEM 로딩 확인';
  if (value === 'PITCH_ONLY') return 'PITCH_ONLY · 기울기만, DEM 아님';
  return String(value);
}
export function FieldDiagnosticsPanel({diagnostics}: {diagnostics: FieldDiagnostics}) {
  const [feedback,setFeedback] = useState('');
  const [preview,setPreview] = useState('');
  const {report,active} = diagnostics;
  async function copy() {
    const text = JSON.stringify(diagnostics.currentReport(),null,2);
    try { await navigator.clipboard.writeText(text); setFeedback('진단 결과를 복사했습니다.'); }
    catch { setPreview(text); setFeedback('자동 복사를 사용할 수 없습니다. 아래 결과를 직접 선택해 복사하거나 JSON을 다운로드하세요.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(diagnostics.currentReport(),null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='blue-marina-navigation-field-diagnostics.json'; a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000); setFeedback('JSON 다운로드를 요청했습니다. 기기의 다운로드 목록을 확인하세요.');
  }
  return <details className="border-t border-white/20 px-4 py-2 text-xs" data-testid="field-diagnostics">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">기기 진단 · 현장 테스트{active ? ' (기록 중)' : ''}</summary>
    <p className="mb-3 leading-5 text-[#bfd1cc]">진단 시작 후에만 상태 변화를 메모리에 기록합니다. 좌표·항적·계정·원본 오류문은 제외하며 자동 전송하지 않습니다. 새로고침·화면 이탈 전 결과를 내려받으세요.</p>
    <div className="flex flex-wrap gap-2">
      {!active ? <button type="button" onClick={()=>{diagnostics.start();setFeedback('');setPreview('');}} className="min-h-11 rounded border border-white/30 px-3">{report ? '새 진단 시작 (이전 결과 초기화)' : '진단 시작'}</button> : <button type="button" onClick={diagnostics.stop} className="min-h-11 rounded border border-amber-200 px-3">진단 종료</button>}
      {report ? <><button type="button" onClick={()=>void copy()} className="min-h-11 rounded border border-white/30 px-3">진단 결과 복사</button><button type="button" onClick={download} className="min-h-11 rounded border border-white/30 px-3">진단 결과 JSON 다운로드</button></> : null}
    </div>
    <p role="status" className="my-2 break-words">{feedback}</p>
    {preview ? <textarea readOnly aria-label="직접 복사할 진단 JSON" value={preview} className="h-40 w-full min-w-0 bg-[#07161b] p-2" /> : null}
    {report ? <>
      <p className="my-3">{active ? '기록 중' : '수집 종료 · 아래는 종료 시점 결과'} · 이벤트 {report.events.length}/300 · 제외된 오래된 이벤트 {report.droppedEvents}</p>
      <p className="mb-3 text-amber-100">자동 관측은 실기기 PASS 판정이 아닙니다. UNKNOWN은 미관측입니다. GPS는 상단 위치 버튼으로 별도 시작하세요. 첫 획득 시간은 진단 중 GPS 요청한 경우에만 측정합니다.</p>
      <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 break-words" aria-label="자동 기기 관측">
        {Object.entries(labels).map(([key,label])=><div key={key} className="min-w-0 rounded bg-white/5 p-2"><dt className="text-[#a9bcb6]">{label}</dt><dd className="mt-1 [overflow-wrap:anywhere]">{display(key,report.automatedObservations[key as FieldEnumKey])}</dd></div>)}
      </dl>
      <p className="my-3 leading-5">온라인은 외부 자료원 접속 성공을 뜻하지 않습니다. DEM 실패 원인은 관측된 오류 범주까지만 표시하며 메모리 부족·OS 설정은 수동 확인이 필요합니다. GPS speed 미제공은 속도계 고장으로 판정하지 않습니다.</p>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">스마트폰 수동 체크리스트 (NAV-R01~R15 + 기능 확인)</summary>
        <p className="mb-3">안전하게 멈춘 상태에서 조작하세요. 실제로 확인한 항목만 선택합니다. ADB 연결은 필요 없습니다. 항해 기록은 별도 저장이며 사이트 데이터 삭제 시 사라질 수 있습니다.</p>
        {FIELD_CHECKLIST.map(([id,title,help])=><label key={id} className="mb-3 block rounded border border-white/15 p-3"><span className="block font-semibold">{id} {title}</span><span className="my-2 block leading-5 text-[#bfd1cc]">{help}</span><select aria-label={`${id} 결과`} value={report.manualTests[id]} onChange={e=>diagnostics.setManual(id,e.target.value as ManualResult)} className="min-h-11 w-full rounded border border-white/30 bg-[#07161b] px-2">{MANUAL_RESULTS.map(result=><option key={result}>{result}</option>)}</select></label>)}
      </details>
      <details><summary className="min-h-11 cursor-pointer py-3">최근 상태 이벤트</summary><ol className="max-h-52 overflow-auto break-words text-[11px]">{report.events.slice(-30).map((event,i)=><li key={i}>{Math.round(event.elapsedMs/1000)}s · {event.type} {event.value ?? ''}</li>)}</ol></details>
    </> : null}
    <p className="mt-3 leading-5 text-[#a9bcb6]">실제 스마트폰 GPS·핀치·잠금 복귀는 사용자가 직접 확인해야 합니다. 항해 참고용이며 안전 항로·백그라운드 GPS를 보장하지 않습니다.</p>
  </details>;
}
