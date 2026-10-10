"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { aggregateEvents } from "@/lib/acquisition/events";
import { RetentionPanel } from "./retention-panel";

type Snapshot = { status: string; observedSince: string | null; environment: string; metrics: ReturnType<typeof aggregateEvents> };
const labels: Record<string, string> = { landing_view: "Landing (익명 포함)", kakao_login_start: "Kakao 로그인 시작", kakao_login_complete: "Kakao 로그인 완료", charter_submission_start: "Charter 작성 시작", market_new_start: "Market 작성 시작", community_new_start: "Community 작성 시작", saved_item_created: "저장 성공", charter_submission_complete: "Charter 제출", market_submission_complete: "Market 제출", community_submission_complete: "Community 제출", moderation_approved: "승인 (대상 콘텐츠 기준)", moderation_rejected: "반려 (대상 콘텐츠 기준)", content_published: "최초 관측 공개 (대상 콘텐츠 기준)" };
export function ObservedFunnelPanel() {
  const [period, setPeriod] = useState("7d"), [domain, setDomain] = useState("ALL"), [group, setGroup] = useState("REAL");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [error, setError] = useState(""), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setSnapshot(null); setError("");
      try {
        const token = (await createClient()?.auth.getSession())?.data.session?.access_token;
        if (!token) throw new Error();
        const response = await fetch(`/api/operations/funnel?period=${period}&domain=${domain}&group=${group}`, { cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error();
        const value = await response.json() as Snapshot;
        if (!controller.signal.aborted) setSnapshot(value);
      } catch { if (!controller.signal.aborted) setError("이벤트 집계를 확인할 수 없습니다. 0건으로 간주하지 않습니다."); }
    }
    void load();
    return () => controller.abort();
  }, [period, domain, group, revision]);
  const percent = (value: { percent: number | null; numerator: number; denominator: number }) => value.percent === null ? "N/A" : `${value.percent}% (${value.numerator}/${value.denominator})`;
  return <section aria-labelledby="observed-funnel" className="mt-8 min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-4 sm:p-5">
    <h2 id="observed-funnel" className="font-serif text-2xl">실제 관측 퍼널</h2>
    <RetentionPanel />
    <p className="mt-2 break-words text-sm text-white/65">OBSERVED SINCE {snapshot?.observedSince ?? "수집 시작 기록 없음"} · {snapshot?.environment ?? "확인 중"}. 아래 현재 상태(CURRENT STATE) 집계와 별도입니다. 과거 데이터는 소급하지 않습니다.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <label className="text-sm">기간<select value={period} onChange={e => setPeriod(e.target.value)} className="ml-2 min-h-11 rounded bg-slate-800 px-2"><option value="today">Today (KST)</option><option value="7d">7 days</option><option value="30d">30 days</option></select></label>
      <label className="text-sm">서비스<select value={domain} onChange={e => setDomain(e.target.value)} className="ml-2 min-h-11 rounded bg-slate-800 px-2">{["ALL", "GENERAL", "CHARTER", "MARKET", "COMMUNITY"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="text-sm">분류<select value={group} onChange={e => setGroup(e.target.value)} className="ml-2 min-h-11 rounded bg-slate-800 px-2"><option>REAL</option><option>QA</option></select></label>
      <button type="button" onClick={() => refresh(n => n + 1)} className="min-h-11 rounded border border-white/30 px-3 text-sm">이벤트 새로고침</button>
    </div>
    {error ? <p role="status" className="mt-4 text-sm text-amber-200">{error}</p> : null}
    {snapshot ? <>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm"><thead><tr><th className="py-2">단계</th><th>Events</th><th>Sessions</th><th>Users</th></tr></thead><tbody>{Object.entries(snapshot.metrics.stages).map(([key, row]) => <tr key={key} className="border-t border-white/10"><th className="py-2 pr-2 font-normal">{labels[key]}</th><td>{row.events}</td><td>{row.sessions}</td><td>{row.users}</td></tr>)}</tbody></table></div>
      <p className="mt-4 text-sm">성공한 첫 행동 참여자 {snapshot.metrics.firstActionUsers}명 · 보존된 관측 중 첫 저장 사용자 {snapshot.metrics.firstObservedSavedUsers}명</p>
      <p className="mt-2 text-sm">동일 세션 로그인 완료: {percent(snapshot.metrics.loginCompletion)} · 동일 사용자 로그인 → 성공 행동: {percent(snapshot.metrics.loginToFirstAction)}</p>
      {Object.entries(snapshot.metrics.submissionCompletion).map(([name, ratio]) => <p key={name} className="mt-1 text-sm">{labels[name]} → 제출: {percent(ratio)}</p>)}
    </> : !error ? <p role="status" className="mt-4 text-sm">집계 중…</p> : null}
    <p className="mt-4 text-xs leading-5 text-white/55">익명 세션은 실제 사용자로 확정하지 않습니다. 식별된 QA·관리자 세션은 Real 전환에서 제외합니다. 비율은 같은 기간 내 시작 후 완료가 관측된 세션/사용자만 연결합니다. 승인·공개 행의 Users는 사용자 활성화 수가 아닙니다. 재공개는 별도 집계하지 않습니다. 이벤트는 best-effort이며 원장이나 전체 방문 통계가 아닙니다.</p>
  </section>;
}
