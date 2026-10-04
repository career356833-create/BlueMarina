"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ModerationDomain, ModerationItem, ModerationQueue, ModerationSnapshot } from "@/lib/operations/moderation";

const names = { charter: "Charter", market: "Market", community: "Community", reports: "Community 신고" } as const;
type QueueName = keyof typeof names;
async function sessionToken() { return (await createClient()?.auth.getSession())?.data.session?.access_token ?? null; }

export function ModerationDashboard() {
  const [snapshot, setSnapshot] = useState<ModerationSnapshot | null>(null);
  const [message, setMessage] = useState("검토 대기 목록을 불러오는 중입니다.");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const accessToken = await sessionToken();
      if (!accessToken) { setSnapshot(null); setMessage("세션이 만료됐습니다. 다시 로그인해 주세요."); return; }
      const response = await fetch("/api/operations/moderation", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const body = await response.json() as { snapshot?: ModerationSnapshot; code?: string };
      if (!response.ok || !body.snapshot) { setSnapshot(null); setMessage(body.code ?? "목록을 불러올 수 없습니다."); return; }
      setSnapshot(body.snapshot); setMessage("");
    } catch { setSnapshot(null); setMessage("목록을 불러올 수 없습니다."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function review(queue: QueueName, id: string, action: string) {
    if ((queue === "charter" || queue === "market") && reason.trim().length < 3) {
      setMessage("Charter·Market 검토 사유를 3자 이상 입력해 주세요."); return;
    }
    setBusy(true); setMessage("");
    try {
      const accessToken = await sessionToken();
      if (!accessToken) { setMessage("세션이 만료됐습니다."); return; }
      const path = queue === "charter" ? `/api/charters/supply/submissions/${encodeURIComponent(id)}/review`
        : queue === "market" ? `/api/market/listings/${encodeURIComponent(id)}/review`
          : queue === "reports" ? `/api/community/admin/reports/${encodeURIComponent(id)}/review`
            : `/api/community/admin/posts/${encodeURIComponent(id)}/review`;
      const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() }), cache: "no-store" });
      const body = await response.json() as { code?: string };
      if (!response.ok) { setMessage(`${names[queue]} 검토 실패: ${body.code ?? response.status}`); return; }
      setReason("");
      await load();
      setMessage(`${names[queue]} ${action} 처리 완료. 공개 여부는 각 도메인의 공개 상태에 따릅니다.`);
    } catch { setMessage("검토 요청 결과를 확인할 수 없습니다. 새로고침 후 상태를 먼저 확인해 주세요."); }
    finally { setBusy(false); }
  }

  function canAct(queue: QueueName) {
    if (!snapshot) return false;
    const domain: ModerationDomain = queue === "reports" ? "community" : queue;
    return snapshot.roles[domain];
  }

  function actions(queue: QueueName, item: ModerationItem) {
    if (!canAct(queue)) return <span className="text-xs text-white/50">읽기 전용</span>;
    const available = queue === "reports" ? [["RESOLVE", "해결"], ["DISMISS", "기각"]]
      : [["APPROVE", "승인"], ["REJECT", "거절"]];
    return <div className="mt-4 flex flex-wrap gap-2">{available.map(([value, label]) =>
      <button key={value} type="button" disabled={busy} onClick={() => void review(queue, item.id, value)}
        className="min-h-11 rounded-lg border border-[#79C9D6]/50 px-4 text-sm font-bold disabled:opacity-50">{label}</button>)}</div>;
  }

  function section(queue: QueueName, data: ModerationQueue) {
    return <section key={queue} className="min-w-0 rounded-2xl border border-white/15 bg-[#0a1b2a] p-5" aria-label={`${names[queue]} 검토`}>
      <h2 className="font-serif text-2xl">{names[queue]} <span className="text-base text-[#79C9D6]">{data.available ? data.count : "접근 불가"}</span></h2>
      <p className="mt-2 text-xs text-white/55">실제 검토 대기 건수이며 QA 표시 항목도 업무 대기열에 포함됩니다. 공개 KPI가 아닙니다.</p>
      {data.available && data.count > data.items.length ? <p className="mt-2 text-xs text-amber-200">{canAct(queue) ? `최근 ${data.items.length}건만 표시합니다.` : "운영 권한에는 건수만 표시합니다."}</p> : null}
      <div className="mt-4 space-y-3">{data.items.map(item => <article key={item.id} className="min-w-0 rounded-xl border border-white/15 p-4">
        <p className="break-words font-semibold">{item.title}{item.qa ? <span className="ml-2 text-xs text-amber-200">QA</span> : null}</p>
        <p className="mt-1 break-all text-xs text-white/55">{item.id} · {item.status} · {item.submittedAt ?? "제출 시각 미확인"}</p>
        {item.owner ? <p className="mt-1 text-xs text-white/55">제출자 ID {item.owner}</p> : null}
        {item.issue ? <p className="mt-2 text-xs text-amber-100">{item.issue}</p> : null}
        {item.preview ? <details className="mt-3 rounded-lg border border-white/15 p-3 text-sm">
          <summary className="min-h-11 cursor-pointer text-[#AEE8EF]">검토 내용 보기</summary>
          <p className="whitespace-pre-wrap break-words pt-2 leading-6 text-white/80">{item.preview}</p>
        </details> : null}
        {item.detail ? <Link href={item.detail} className="mt-2 inline-flex min-h-11 items-center text-sm text-[#AEE8EF] underline">상세 확인</Link> : null}
        {actions(queue, item)}
      </article>)}</div>
    </section>;
  }

  return <main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/operations" className="inline-flex min-h-11 items-center text-sm text-[#AEE8EF]">운영 상태로 돌아가기</Link>
      <h1 className="mt-3 font-serif text-3xl sm:text-4xl">제출물 검토</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/65">각 도메인 관리자만 해당 항목을 열람·승인·거절합니다. Operations 권한 단독은 대기 건수만 봅니다. Charter 승인은 공개가 아닌 promotion candidate를 만듭니다.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 flex-1 gap-2 text-sm sm:max-w-xl">Charter·Market 검토 사유
          <input value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} className="min-h-11 rounded-lg border border-white/25 bg-[#0a1b2a] px-3" />
        </label>
        <button type="button" onClick={() => void load()} disabled={busy} className="min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold disabled:opacity-50">새로고침</button>
      </div>
      {message ? <p role="status" className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-sm">{message}</p> : null}
      {snapshot ? <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {section("charter", snapshot.charter)}{section("market", snapshot.market)}
        {section("community", snapshot.community)}{section("reports", snapshot.reports)}
      </div> : null}
    </div>
  </main>;
}
