"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { getAuditIssueCount } from "@/lib/dev-audit/audit-data";

export function DevAuditFloatingButton() {
  const issueCount = getAuditIssueCount();
  const label = issueCount > 0 ? `감사 ${issueCount}` : "감사";

  return (
    <Link
      href="/dev-audit"
      aria-label="개발자 감사 화면 열기"
      title="개발자 감사"
      className="fixed bottom-5 right-5 z-50 hidden min-h-12 items-center gap-2 rounded-full border border-sky-300/35 bg-[#0E2233]/95 px-4 text-sm font-black text-white shadow-none outline-none transition hover:border-sky-300 hover:bg-[#16324a] focus-visible:ring-2 focus-visible:ring-[#2E8BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050F19] lg:flex"
    >
      <ClipboardCheck size={18} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
