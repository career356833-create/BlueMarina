"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  id: string;
  status: string;
  validationResult: { errors: number; warnings: number; issues: Array<{ field: string; code: string; severity: string; message: string }> };
  registrationCrosswalk: { status: string; autoApproved: false };
};

export function SubmissionStatusPanel({ id }: { id: string }) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [message, setMessage] = useState("제출 상태를 확인하고 있습니다.");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (method: "GET" | "POST") => {
    try {
      const supabase = createClient();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) { setMessage("로그인 후 본인 제출 상태를 확인할 수 있습니다."); return; }
      const path = `/api/charters/supply/submissions/${encodeURIComponent(id)}${method === "POST" ? "/validate" : ""}`;
      const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json() as { ok: boolean; submission?: Submission; code?: string };
      if (!response.ok || !result.submission) { setMessage(result.code === "AUTH_REQUIRED" ? "이 제출 정보를 볼 권한이 없습니다." : `상태를 확인하지 못했습니다: ${result.code ?? "INTERNAL_ERROR"}`); return; }
      setSubmission(result.submission);
      setMessage("");
    } catch { setMessage("네트워크 문제로 제출 상태를 확인하지 못했습니다. 다시 시도해 주세요."); }
  }, [id]);

  useEffect(() => { void request("GET"); }, [request]);

  async function revalidate() {
    setBusy(true);
    try { await request("POST"); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 space-y-4 rounded-2xl border border-[#29465D] bg-[#071827] p-5 text-white" aria-label="내 제출 상태">
    <h2 className="text-xl font-black">내 제출 상태</h2>
    <p className="text-sm text-[#B8CBDD]">본인 또는 승인된 관리자만 볼 수 있습니다. 검토 필요 상태는 게시·업체 인증을 뜻하지 않습니다.</p>
    {message ? <p role="status" className="text-sm text-[#B8CBDD]">{message}</p> : null}
    {submission ? <div className="space-y-4">
      <p className="break-all text-xs text-[#9FB3C8]">제출 ID {submission.id}</p>
      <p className="text-lg font-black">상태: {submission.status}</p>
      <p className="text-sm text-[#B8CBDD]">서버 검증 오류 {submission.validationResult.errors}건 · 확인 사항 {submission.validationResult.warnings}건 · 공공 등록정보 대조 {submission.registrationCrosswalk.status}</p>
      <ul className="space-y-2 text-sm text-[#B8CBDD]">{submission.validationResult.issues.map((issue, index) => <li key={`${issue.field}-${issue.code}-${index}`} className="rounded-xl border border-[#29465D] p-3">{issue.severity}: {issue.message}</li>)}</ul>
      <button type="button" disabled={busy || !["SUBMITTED", "VALIDATION_FAILED", "REVIEW_REQUIRED"].includes(submission.status)} onClick={() => void revalidate()} className="min-h-11 rounded-full border border-[#79C9D6]/50 px-5 text-sm font-bold text-[#AEE8EF] disabled:opacity-50">{busy ? "검증 중" : "다시 검증"}</button>
    </div> : null}
  </section>;
}
