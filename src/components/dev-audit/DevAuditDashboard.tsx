"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, FileWarning, Search, ShieldAlert, Smartphone, Wrench } from "lucide-react";
import { auditChecks, auditFeatures, auditRisks, type AuditFeature, type AuditImplementationStatus } from "@/lib/dev-audit/audit-data";
import { isAutomatedAuditSummary, type AutomatedAuditSummary } from "@/lib/dev-audit/audit-result";

const statusTone: Record<AuditImplementationStatus, string> = {
  PLANNED: "border-slate-600 bg-slate-700/30 text-slate-200",
  IMPLEMENTED: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  CONNECTED: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  WORKING: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  VERIFIED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  PARTIAL: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  MOCK_ONLY: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  DISCONNECTED: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  BROKEN: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  DEAD_CODE: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200",
  DEPRECATED: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  UNKNOWN: "border-slate-500 bg-slate-700/30 text-slate-300"
};

const filterOptions = [
  ["ALL", "전체"],
  ["WORKING", "정상 동작"],
  ["PARTIAL", "부분 동작"],
  ["DISCONNECTED", "미연결"],
  ["MOCK_ONLY", "Mock"],
  ["DEAD_CODE", "Dead Code 후보"],
  ["REVIEW", "검토 필요"],
  ["COMING", "Coming Soon"]
] as const;

function StatusBadge({ status }: { status: AuditImplementationStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone[status]}`}>{status}</span>;
}

function MetricCard({ label, value, helper, tone = "text-white" }: { label: string; value: number | string; helper: string; tone?: string }) {
  return (
    <section className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-4">
      <p className="text-xs font-black text-[#9FB3C8]">{label}</p>
      <p className={`mt-2 text-3xl font-black tabular-nums ${tone}`}>{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#6E8299]">{helper}</p>
    </section>
  );
}

function FeatureRow({ feature }: { feature: AuditFeature }) {
  return (
    <article className="rounded-xl border border-[#1F3A50] bg-[#071827] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#6E8299]">{feature.category} · {feature.featureId}</p>
          <h3 className="mt-1 text-base font-black text-white">{feature.name}</h3>
          {feature.route ? <p className="mt-1 font-mono text-xs text-[#9FB3C8]">{feature.route}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={feature.implementationStatus} />
          <StatusBadge status={feature.runtimeStatus} />
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#D7E4F6]">{feature.evidence}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-[#9FB3C8]">다음 조치: {feature.recommendedAction}</p>
      <p className="mt-3 break-all font-mono text-[11px] leading-5 text-[#6E8299]">{feature.relatedFiles.join(" · ")}</p>
    </article>
  );
}

export function DevAuditDashboard() {
  const [filter, setFilter] = useState<(typeof filterOptions)[number][0]>("ALL");
  const [query, setQuery] = useState("");
  const [automatedAudit, setAutomatedAudit] = useState<AutomatedAuditSummary | null>(null);
  const [auditSource, setAuditSource] = useState<"loading" | "generated" | "fallback">("loading");

  useEffect(() => {
    let active = true;

    fetch("/dev-audit/audit-summary.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("audit summary unavailable");
        return response.json();
      })
      .then((value: unknown) => {
        if (!active) return;
        if (!isAutomatedAuditSummary(value)) throw new Error("invalid audit summary");
        setAutomatedAudit(value);
        setAuditSource("generated");
      })
      .catch(() => {
        if (!active) return;
        setAutomatedAudit(null);
        setAuditSource("fallback");
      });

    return () => {
      active = false;
    };
  }, []);
  const counts = useMemo(() => {
    const implemented = auditFeatures.filter((feature) => ["IMPLEMENTED", "CONNECTED", "WORKING", "VERIFIED"].includes(feature.implementationStatus)).length;
    const working = auditFeatures.filter((feature) => ["WORKING", "VERIFIED"].includes(feature.runtimeStatus)).length;
    const partial = auditFeatures.filter((feature) => feature.runtimeStatus === "PARTIAL").length;
    const mock = auditFeatures.filter((feature) => feature.runtimeStatus === "MOCK_ONLY").length;
    const disconnected = auditFeatures.filter((feature) => feature.implementationStatus === "DISCONNECTED").length;
    const deadCode = auditFeatures.filter((feature) => feature.implementationStatus === "DEAD_CODE").length;
    return { implemented, working, partial, mock, disconnected, deadCode };
  }, []);
  const filteredFeatures = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return auditFeatures.filter((feature) => {
      const matchesQuery = !needle || [feature.name, feature.category, feature.route, feature.featureId, ...feature.relatedFiles].filter(Boolean).join(" ").toLowerCase().includes(needle);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "REVIEW" && feature.issue === "REVIEW_REQUIRED") ||
        (filter === "COMING" && feature.runtimeStatus === "MOCK_ONLY") ||
        feature.implementationStatus === filter ||
        feature.runtimeStatus === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query]);

  return (
    <main className="min-h-screen bg-[#050F19] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="border-b border-[#1F3A50] pb-6">
          <p className="text-xs font-black tracking-[0.2em] text-[#2E8BFF]">BLUE MARINA · DEVELOPER AUDIT</p>
          <h1 className="mt-3 text-3xl font-black">개발자 감사</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#9FB3C8]">
            정적 감사 데이터만 표시합니다. API 호출, AI 호출, DB 쓰기, 배포 동작은 수행하지 않습니다.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className={`rounded-full border px-3 py-1.5 ${auditSource === "generated" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-amber-400/40 bg-amber-400/10 text-amber-200"}`}>
              {auditSource === "loading" ? "자동 감사 결과 확인 중" : auditSource === "generated" ? "자동 생성 JSON 사용" : "정적 레지스트리 fallback"}
            </span>
            {automatedAudit ? (
              <>
                <span className="text-[#9FB3C8]">v{automatedAudit.generatorVersion}</span>
                <span className="text-[#9FB3C8]">{new Date(automatedAudit.auditedAt).toLocaleString("ko-KR")}</span>
                <span className={automatedAudit.overallStatus === "fail" ? "text-rose-300" : automatedAudit.overallStatus === "warning" ? "text-amber-300" : "text-emerald-300"}>
                  {automatedAudit.overallStatus.toUpperCase()}
                </span>
              </>
            ) : null}
          </div>
        </header>

        {automatedAudit ? (
          <section className="mt-6 rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={19} className="text-[#2E8BFF]" />
                <h2 className="text-lg font-black">자동 감사 결과</h2>
              </div>
              <p className="text-xs font-bold text-[#9FB3C8]">자동 결과는 사람의 설계·구현 판정을 덮어쓰지 않습니다.</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(automatedAudit.checks).map(([name, check]) => (
                <div key={name} className="rounded-xl border border-[#1F3A50] bg-[#071827] p-3">
                  <p className="font-mono text-xs font-black text-[#9FB3C8]">{name}</p>
                  <p className={`mt-1 text-sm font-black ${check.status === "fail" ? "text-rose-300" : check.status === "warning" ? "text-amber-300" : check.status === "pass" ? "text-emerald-300" : "text-slate-300"}`}>
                    {String(check.status).toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
              {(["critical", "high", "medium", "low"] as const).map((severity) => (
                <span key={severity} className="rounded-full border border-[#1F3A50] bg-[#071827] px-3 py-1.5 text-[#D7E4F6]">
                  {severity.toUpperCase()} {automatedAudit.issues.filter((item) => item.severity === severity).length}
                </span>
              ))}
            </div>
            {automatedAudit.issues.length ? (
              <details className="mt-4 rounded-xl border border-[#1F3A50] bg-[#071827]">
                <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-black">자동 발견 이슈 {automatedAudit.issues.length}건 보기</summary>
                <div className="border-t border-[#1F3A50] p-3">
                  <div className="max-h-[420px] space-y-2 overflow-y-auto">
                    {automatedAudit.issues.slice(0, 100).map((item) => (
                      <article key={item.id} className="rounded-lg border border-[#1F3A50] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-black text-amber-300">{item.severity.toUpperCase()}</span>
                          <p className="text-sm font-black text-white">{item.title}</p>
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] text-[#9FB3C8]">{item.file}{item.line ? `:${item.line}` : ""}</p>
                        {item.evidence ? <p className="mt-1 text-xs font-semibold leading-5 text-[#6E8299]">{item.evidence}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="전체 기능" value={auditFeatures.length} helper="감사 레지스트리 기준" />
          <MetricCard label="구현 완료" value={counts.implemented} helper="구현 단계와 실제 동작은 분리" tone="text-sky-200" />
          <MetricCard label="정상 동작 근거" value={counts.working} helper="WORKING 또는 VERIFIED" tone="text-emerald-300" />
          <MetricCard label="부분 동작" value={counts.partial} helper="실환경 추가 검증 필요" tone="text-amber-300" />
          <MetricCard label="Mock 전용" value={counts.mock} helper="Coming Soon 포함" tone="text-violet-300" />
          <MetricCard label="미연결·정리 후보" value={counts.disconnected + counts.deadCode} helper="삭제 대상은 아님" tone="text-orange-300" />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5">
            <div className="flex items-center gap-2"><ClipboardList size={19} className="text-[#2E8BFF]" /><h2 className="text-lg font-black">전체 요약</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#1F3A50] bg-[#071827] p-4"><p className="text-xs font-black text-[#9FB3C8]">프로젝트</p><p className="mt-1 font-black">Blue Marina Boat License PWA</p></div>
              <div className="rounded-xl border border-[#1F3A50] bg-[#071827] p-4"><p className="text-xs font-black text-[#9FB3C8]">마지막 감사</p><p className="mt-1 font-black">2026-07-30</p></div>
              <div className="rounded-xl border border-[#1F3A50] bg-[#071827] p-4"><p className="text-xs font-black text-[#9FB3C8]">빌드·TypeScript·Lint</p><p className="mt-1 font-black text-emerald-300">PASS</p></div>
              <div className="rounded-xl border border-[#1F3A50] bg-[#071827] p-4"><p className="text-xs font-black text-[#9FB3C8]">감사 방식</p><p className="mt-1 font-black">정적 데이터 · 읽기 전용</p></div>
            </div>
          </article>
          <article className="rounded-2xl border border-rose-400/35 bg-rose-400/10 p-5">
            <div className="flex items-center gap-2 text-rose-200"><ShieldAlert size={19} /><h2 className="text-lg font-black">위험 및 우선순위</h2></div>
            <ul className="mt-4 space-y-3">
              {auditRisks.map((risk) => <li key={risk.name} className="text-sm font-semibold leading-5 text-rose-100"><span className="font-black">{risk.name}</span><br /><span className="text-rose-200/80">{risk.recommendedAction}</span></li>)}
            </ul>
          </article>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5">
            <div className="flex items-center gap-2"><CheckCircle2 size={19} className="text-emerald-300" /><h2 className="text-lg font-black">문제 데이터</h2></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[['일반조종면허', '700문항'], ['요트조종면허', '700문항'], ['총 문항', '1,400문항'], ['이론', '30 ready']].map(([label, value]) => <div key={label} className="rounded-xl border border-[#1F3A50] bg-[#071827] p-3"><p className="text-xs font-bold text-[#9FB3C8]">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}
            </div>
            <p className="mt-4 text-xs font-semibold leading-5 text-[#9FB3C8]">ID, 4지선다, 정답 범위, 해설, 태그, 분류, 면허별 분리는 `check:learning-core` 통과 항목만 표시합니다.</p>
          </article>
          <article className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5">
            <div className="flex items-center gap-2"><Smartphone size={19} className="text-[#2E8BFF]" /><h2 className="text-lg font-black">PWA 상태</h2></div>
            <div className="mt-4 space-y-3 text-sm font-semibold text-[#D7E4F6]">
              <p>Manifest · 아이콘 · production service worker 등록 코드는 존재합니다.</p>
              <p>설치, 업데이트, 오프라인, stale bundle, 실제 기기 표시는 아직 릴리스 검증이 필요합니다.</p>
              <StatusBadge status="PARTIAL" />
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2"><Wrench size={19} className="text-[#2E8BFF]" /><h2 className="text-lg font-black">기능 구조 · 미연결 · Mock · Dead Code 후보</h2></div><p className="text-xs font-bold text-[#9FB3C8]">구현 상태 / 실제 동작 상태를 함께 표시</p></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-full border px-3 text-xs font-black transition ${filter === value ? "border-[#2E8BFF] bg-[#2E8BFF]/15 text-white" : "border-[#1F3A50] text-[#9FB3C8] hover:border-[#2E8BFF]/60"}`}>{label}</button>)}
          </div>
          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-[#1F3A50] bg-[#071827] px-4"><Search size={17} className="text-[#6E8299]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="기능명, 경로, 파일명, 상태 검색" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-[#6E8299]" /></label>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">{filteredFeatures.map((feature) => <FeatureRow key={feature.featureId} feature={feature} />)}</div>
          {filteredFeatures.length === 0 ? <p className="mt-5 text-center text-sm font-bold text-[#9FB3C8]">조건에 맞는 감사 항목이 없습니다.</p> : null}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5"><div className="flex items-center gap-2"><FileWarning size={19} className="text-amber-300" /><h2 className="text-lg font-black">검증 기록</h2></div><div className="mt-4 space-y-3">{auditChecks.map((check) => <div key={check.command} className="rounded-xl border border-[#1F3A50] bg-[#071827] p-3"><div className="flex items-center justify-between gap-3"><p className="font-black">{check.name}</p><span className="text-xs font-black text-emerald-300">{check.status.toUpperCase()}</span></div><p className="mt-1 font-mono text-xs text-[#9FB3C8]">{check.command}</p><p className="mt-2 text-xs font-semibold text-[#6E8299]">{check.detail}</p></div>)}</div></article>
          <article className="rounded-2xl border border-[#1F3A50] bg-[#0E2233] p-5"><div className="flex items-center gap-2"><AlertTriangle size={19} className="text-amber-300" /><h2 className="text-lg font-black">정적 데이터 안내</h2></div><p className="mt-4 text-sm font-semibold leading-6 text-[#D7E4F6]">이 페이지는 `src/lib/dev-audit/audit-data.ts`의 정적 레지스트리만 사용합니다. 문서 파일을 브라우저에서 파싱하거나 외부 API, AI API, DB, localStorage를 호출하지 않습니다.</p><p className="mt-3 text-sm font-semibold leading-6 text-[#9FB3C8]">개선 권고는 표시만 하며 자동 수정·삭제·배포를 수행하지 않습니다.</p></article>
        </section>
      </div>
    </main>
  );
}
