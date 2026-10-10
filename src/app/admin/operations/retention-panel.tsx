"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RetentionSummary } from "@/lib/acquisition/retention";

export function RetentionPanel() {
  const [value, setValue] = useState<{ status: string; summary: RetentionSummary } | null>(null);
  const [failed, setFailed] = useState(false), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setValue(null); setFailed(false);
    async function load() {
      try {
        const token = (await createClient()?.auth.getSession())?.data.session?.access_token;
        if (!token) throw new Error();
        const response = await fetch("/api/operations/retention", { cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) setValue(result);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    }
    void load();
    return () => controller.abort();
  }, [revision]);
  const date = (input: string | null) => input ? new Date(input).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "N/A";
  return <aside aria-labelledby="retention-title" className="mt-4 rounded-lg border border-white/15 p-3 text-xs leading-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="retention-title" className="font-semibold">이벤트 보관 · Observed raw event window: 90 days</h3><button type="button" onClick={() => refresh(n => n + 1)} className="min-h-11 rounded border border-white/30 px-3">보관 상태 새로고침</button></div>
    {value ? <dl className="grid gap-x-4 sm:grid-cols-2">
      <div><dt>운영 상태</dt><dd>{value.status}</dd></div>
      <div><dt>가장 오래된 이벤트 (현재 환경, KST)</dt><dd className="break-words">{date(value.summary.oldestRetained)}</dd></div>
      <div><dt>정리 대상 / 미래 시각 이상 (현재 환경)</dt><dd>{value.summary.eligibleRows} / {value.summary.futureRows}</dd></div>
      <div><dt>최근 실행 (모든 환경, KST)</dt><dd>{date(value.summary.lastRunAt)} · {value.summary.lastResult} · 삭제 {value.summary.lastDeletedRows ?? "N/A"}건</dd></div>
    </dl> : <p role="status">{failed ? "보관 상태 확인 불가 — 정상 또는 0건으로 간주하지 않습니다." : "보관 상태 확인 중…"}</p>}
    <p className="mt-2 text-white/60">설정: 매일 12:17 KST 정리. 90일 경과 후 다음 실행에서 삭제하며 실패하면 지연될 수 있습니다. 예약 작업의 활성 여부는 DB Cron에서 확인합니다. 실행이 26시간 넘게 없으면 주의가 표시됩니다. 가입·게시물·저장 항목은 대상이 아닙니다.</p>
  </aside>;
}
