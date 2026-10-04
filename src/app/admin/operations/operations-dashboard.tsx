"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadKakaoMaps } from "@/lib/sea/kakao-maps";
import type { OperationsHealth, OperationsSnapshot, OperationsSourceStatus } from "@/lib/operations/model";
import type { ModerationSnapshot } from "@/lib/operations/moderation";

function Badge({ value }: { value: OperationsHealth | OperationsSourceStatus }) {
  const tone = value === "HEALTHY" || value === "AVAILABLE" ? "text-emerald-300 border-emerald-300/30"
    : value === "ERROR" ? "text-rose-300 border-rose-300/30"
      : value === "STALE" || value === "DEGRADED" ? "text-amber-300 border-amber-300/30"
        : "text-slate-300 border-slate-300/30";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function Stamp({ value }: { value: string | null }) {
  return value ? <time dateTime={value} className="break-all">{value}</time> : <span>확인 불가</span>;
}

export function OperationsDashboard() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [message, setMessage] = useState("운영 상태를 불러오는 중입니다.");
  const [busy, setBusy] = useState(false);
  const [kakao, setKakao] = useState<OperationsSourceStatus>("UNKNOWN");
  const [moderation, setModeration] = useState<ModerationSnapshot | null>(null);

  async function load() {
    setBusy(true);
    try {
      const client = createClient();
      const token = (await client?.auth.getSession())?.data.session?.access_token;
      if (!token) { setSnapshot(null); setMessage("인증 세션이 만료되었거나 제공되지 않았습니다."); return; }
      const response = await fetch("/api/operations/health", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json() as { ok: boolean; snapshot?: OperationsSnapshot; code?: string };
      if (!response.ok || !body.snapshot) { setSnapshot(null); setMessage(body.code ?? "운영 정보를 불러올 수 없습니다."); return; }
      setSnapshot(body.snapshot);
      setMessage("");
      try {
        const moderationResponse = await fetch("/api/operations/moderation", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const moderationBody = await moderationResponse.json() as { snapshot?: ModerationSnapshot };
        setModeration(moderationResponse.ok ? moderationBody.snapshot ?? null : null);
      } catch { setModeration(null); }
    } catch { setSnapshot(null); setMessage("운영 정보를 불러올 수 없습니다."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    if (!key) return;
    let active = true;
    loadKakaoMaps(key).then(() => { if (active) setKakao("AVAILABLE"); }).catch(() => { if (active) setKakao("ERROR"); });
    return () => { active = false; };
  }, []);

  return <main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold tracking-[0.22em] text-[#d5b477]">BLUE MARINA · PRIVATE OPERATIONS</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="font-serif text-3xl sm:text-4xl">운영 상태</h1><p className="mt-2 max-w-2xl text-sm text-white/65">현재 요청의 제한된 관찰값입니다. 서비스 상태는 해양 안전 판정이 아닙니다.</p></div>
        <button type="button" onClick={() => void load()} disabled={busy} className="min-h-11 rounded-full border border-white/30 px-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d5b477] disabled:opacity-50">수동 새로고침</button>
      </div>
      {message ? <p role="status" className="mt-6 rounded-xl border border-white/20 bg-white/5 p-4 text-sm">{message}</p> : null}
      {snapshot ? <>
        <section aria-label="검토 대기" className="mt-8 rounded-xl border border-white/15 bg-[#0a1b2a] p-5">
          <h2 className="font-serif text-2xl">관리자 검토 대기</h2>
          <p className="mt-2 text-sm text-white/65">현재 DB 대기열입니다. QA 항목은 공개 KPI에 포함되지 않습니다.</p>
          {moderation ? <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4"><p>Charter {moderation.charter.available ? moderation.charter.count : "접근 불가"}</p><p>Market {moderation.market.available ? moderation.market.count : "접근 불가"}</p><p>Community {moderation.community.available ? moderation.community.count : "접근 불가"}</p><p>신고 {moderation.reports.available ? moderation.reports.count : "접근 불가"}</p></div> : <p className="mt-3 text-sm text-white/50">검토 건수를 확인할 수 없습니다.</p>}
          <Link href="/admin/operations/moderation" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#AEE8EF] underline">검토 화면 열기</Link>
        </section>
        <section aria-label="배포 정보" className="mt-8 grid gap-3 rounded-xl border border-white/15 bg-[#0a1b2a] p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-white/50">환경</p><p className="mt-1 font-semibold">{snapshot.deployment.environment}</p></div>
          <div><p className="text-white/50">SHA</p><p className="mt-1 break-all font-mono text-xs">{snapshot.deployment.sha ?? "확인 불가"}</p></div>
          <div><p className="text-white/50">URL · 앱 버전</p><p className="mt-1 break-all">{snapshot.deployment.url ?? "확인 불가"} · {snapshot.deployment.appVersion}</p></div>
          <div><p className="text-white/50">배포 · SW 캐시</p><p className="mt-1"><Stamp value={snapshot.deployment.deployedAt} /> · {snapshot.deployment.serviceWorkerVersion ?? "확인 불가"}</p></div>
        </section>
        <p className="mt-3 text-xs text-white/55">점검 시각 <Stamp value={snapshot.checkedAt} /> · 최근 점검에서 확인된 5xx: {snapshot.currentSample5xx}건. 장기 오류율이나 SLA가 아닙니다. 릴리스 판정은 {snapshot.releaseEvidence.kind} ({snapshot.releaseEvidence.checkedAt}) 기록입니다.</p>

        <section aria-labelledby="ops-services" className="mt-9"><h2 id="ops-services" className="font-serif text-2xl">서비스</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.services.map((service) => <article key={service.id} className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{service.id}</h3><Badge value={service.status} /></div><p className="mt-3 text-sm text-white/70">{service.path} · HTTP {service.httpStatus ?? "—"} · {service.latencyMs ?? "—"} ms · redirect {service.redirectCount ?? 0}</p>{service.finalUrl && service.redirectCount ? <p className="mt-1 break-all text-xs text-white/50">최종 URL {service.finalUrl}</p> : null}<p className="mt-2 text-xs text-white/50">{service.limitation}</p></article>)}</div></section>

        <section aria-labelledby="ops-sources" className="mt-9"><h2 id="ops-sources" className="font-serif text-2xl">외부 소스</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.sources.map((source) => <article key={source.id} className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{source.id}</h3><Badge value={source.id === "Kakao Maps" ? kakao : source.status} /></div><dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><dt className="text-white/50">HTTP · 지연</dt><dd>{source.httpStatus ?? "—"} · {source.latencyMs ?? "—"} ms</dd><dt className="text-white/50">관측 · 지점</dt><dd>{source.recordCount ?? "—"} · {source.stationCount ?? "—"}</dd><dt className="text-white/50">원본 시각</dt><dd><Stamp value={source.sourceTimestamp} /></dd><dt className="text-white/50">수집 시각</dt><dd><Stamp value={source.fetchedAt} /></dd><dt className="text-white/50">점검 시각</dt><dd><Stamp value={source.lastCheckedAt} /></dd></dl><p className="mt-3 text-xs leading-5 text-white/55">{source.limitation}</p></article>)}</div></section>

        <section aria-label="읽기 전용 설정 및 제한" className="mt-9 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="font-serif text-xl">기능 플래그</h2><dl className="mt-4 grid grid-cols-2 gap-2 text-sm">{Object.entries(snapshot.featureFlags).map(([name, enabled]) => <div key={name} className="contents"><dt className="text-white/60">{name}</dt><dd>{enabled ? "ON" : "OFF"}</dd></div>)}</dl><p className="mt-3 text-xs text-white/50">표시는 읽기 전용이며 설정값·키는 제공하지 않습니다.</p></div>
          <div className="rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="font-serif text-xl">Conditions · Today Sea</h2><p className="mt-4 text-sm">Conditions <Badge value={snapshot.conditions.status} /> · selector {snapshot.conditions.selectorCount}종</p><p className="mt-2 text-xs text-white/60">profileContext {snapshot.conditions.profileContext} · seasonality {snapshot.conditions.seasonality} · RISA {snapshot.conditions.risaStatus} · FEMO {snapshot.conditions.femoStatus}</p><p className="mt-4 text-sm">Today Sea <Badge value={snapshot.todaySea.status} /> · 부분 렌더링 {snapshot.todaySea.partialRendering ? "지원" : "확인 불가"}</p><p className="mt-2 text-xs text-white/60">비활성 소스: {snapshot.todaySea.disabledSources.join(", ") || "없음"}</p></div></section>
        <section aria-labelledby="ops-limits" className="mt-9 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 id="ops-limits" className="font-serif text-xl">알려진 제한</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">{snapshot.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
      </> : null}
    </div>
  </main>;
}
