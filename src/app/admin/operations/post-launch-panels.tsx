import Link from "next/link";
import type { PostLaunchSummary } from "@/lib/operations/post-launch-summary";
import { AcquisitionPanel } from "./acquisition-panel";
import type { QueueSummary, Split } from "@/lib/operations/summary-model";

const value = (input: string | number | boolean | null | undefined) => input === null || input === undefined || input === "" ? "UNKNOWN" : String(input);
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-white/55">{label}</dt><dd className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{children}</dd></div>;
}
function Partition({ data }: { data: Split | null }) {
  return <span>Total {value(data?.total)} / QA {value(data?.qa)} / <strong>Real {value(data?.real)}</strong>{data?.unclassified ? ` / 미분류 ${data.unclassified}` : ""}</span>;
}
function Queue({ name, data }: { name: string; data: QueueSummary }) {
  return <article className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5">
    <h3 className="text-lg font-semibold">{name} <span className="text-xs text-white/50">{data.state}</span></h3>
    <dl className="mt-4 space-y-3"><Stat label="검토 대기"><Partition data={data.pending} /></Stat><Stat label="공개 · Real KPI (QA 제외)"><Partition data={data.public} /></Stat>
      <Stat label="오래된 대기 시간 · 전체 / Real">{value(data.oldestPendingHours)} h / {value(data.oldestRealPendingHours)} h</Stat>
      <Stat label="가장 오래된 대기">{value(data.oldestPendingAt)}</Stat><Stat label="최근 제출">{value(data.latestSubmissionAt)}</Stat></dl>
    <ul className="mt-4 space-y-2 text-xs text-white/65">{Object.entries(data.states).map(([state, count]) => <li key={state}><span>{state}: </span><Partition data={count} /></li>)}</ul>
    <Link href="/admin/operations/moderation" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#AEE8EF] underline focus-visible:outline">기존 검토 대기열 열기</Link>
  </article>;
}
export function PostLaunchPanels({ summary }: { summary: PostLaunchSummary }) {
  const { business, production, runtime, security, navigation, dataIntegrity } = summary;
  const attention = [
    business.charter.pending?.real ? "Charter 실제 제출 검토 필요" : null,
    business.market.pending?.real ? "Market 실제 제출 검토 필요" : null,
    business.community.pending?.real ? "Community 실제 제출 검토 필요" : null,
    business.reports.pending?.total ? "미해결 신고 확인 필요" : null,
    business.failures.length ? "일부 DB 집계 미확인" : null,
    production.match === false ? "main과 실행 중 배포 SHA가 다름" : null,
    navigation.warningState === "CURRENT_STATUS_UNAVAILABLE" ? "항행경보 현재 상태 확인 불가" : null,
    security.advisorWarn ? "Security Advisor WARN 검토 필요" : null,
    runtime.state !== "AVAILABLE" ? "Runtime 로그 수집 갱신 필요" : null,
  ].filter(Boolean);
  return <div className="mt-8 space-y-6">
    <section aria-label="Needs attention" className="rounded-xl border border-amber-200/30 p-5"><h2 className="text-xl font-semibold">Needs attention</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">{attention.length ? attention.map(item => <li key={item}>{item}</li>) : <li>확인된 수동 검토 항목 없음 · 안전 판정 아님</li>}</ul></section>
    <section aria-label="Production and rollback" className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="text-xl font-semibold">Production · Release</h2>
      <dl className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"><Stat label="실행 중 deployment ID">{value(production.deploymentId)}</Stat><Stat label="Control-plane 상태">{production.state}</Stat>
        <Stat label="실행 중 SHA">{value(production.deployedSha)}</Stat><Stat label="현재 main SHA">{value(production.mainSha)}</Stat><Stat label="main 일치">{value(production.match)}</Stat>
        <Stat label="배포 시각">{value(production.deployedAt)}</Stat><Stat label="배포 확인 근거 · 시각">{production.evidence} · {production.checkedAt}</Stat>
        <Stat label="마지막 확인 배포">{production.lastAudit?.deploymentId} · {production.lastAudit?.state}</Stat><Stat label="배포 감사 시각">{value(production.lastAudit?.checkedAt)}</Stat>
        <Stat label="이전 READY rollback 후보">{value(production.lastAudit?.rollback?.url)}</Stat></dl>
      <p className="mt-4 text-xs leading-5 text-white/55">{production.limitation} Rollback은 CLI/콘솔에서 별도 승인 후 실행하며 이 화면은 읽기 전용입니다.</p></section>
    <section aria-label="실제 DB 대기열"><h2 className="text-xl font-semibold">사업 운영 · QA / Real</h2><p className="mt-2 text-xs text-white/55">실제 KPI는 Real만 사용합니다. QA 판별 불가 건은 Real에 포함하지 않습니다. 집계 시각 {business.generatedAt}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3"><Queue name="Charter" data={business.charter} /><Queue name="Market" data={business.market} /><Queue name="Community" data={business.community} /></div>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3"><p>미해결 신고: <Partition data={business.reports.pending} /></p><p>댓글 전체: <Partition data={business.comments} /></p><p>반응 전체: <Partition data={business.reactions} /></p></div>
      <p className="mt-3 text-xs leading-5 text-white/50">{business.limitation}</p></section>
    <AcquisitionPanel funnel={business.acquisition}/>
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-label="Auth aggregates" className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="text-xl font-semibold">Auth · 개인정보 없는 집계</h2><dl className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="사용자 Total / QA / Real">{value(business.auth.users)} / {value(business.auth.qa)} / {value(business.auth.real)}</Stat>
        <Stat label="활성 QA / 차단 QA">{value(business.auth.activeQA)} / {value(business.auth.bannedQA)}</Stat><Stat label="활성 관리자 / QA 관리자">{value(business.auth.activeAdmins)} / {value(business.auth.activeQAAdmins)}</Stat>
        <Stat label="성공 세션 / 인증·callback 실패 / bad_oauth_state">UNKNOWN · 인증 이벤트 소스 미연결</Stat></dl></section>
      <section aria-label="Runtime aggregate sample" className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="text-xl font-semibold">Runtime · {runtime.state}</h2><dl className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="24h 조회 내 관찰 로그 / 상한 도달">{value(runtime.evidence?.sampleSize)} / {value(runtime.evidence?.possiblyTruncated)}</Stat><Stat label="표본 오류 / 4xx / 5xx">{value(runtime.evidence?.errorCount)} / {value(runtime.evidence?.http4xx)} / {value(runtime.evidence?.http5xx)}</Stat>
        <Stat label="표본 401 / 403">{value(runtime.evidence?.http401)} / {value(runtime.evidence?.http403)}</Stat><Stat label="표본 최다 오류 경로">{value(runtime.evidence?.topFailingRoute)}</Stat><Stat label="마지막 오류 시각">{value(runtime.evidence?.lastErrorAt)}</Stat><Stat label="수집 시각 / 경과">{value(runtime.evidence?.checkedAt)} / {value(runtime.ageHours)} h</Stat></dl>
        <p className="mt-3 text-xs leading-5 text-white/55">{runtime.limitation}</p></section>
    </div>
    <section aria-label="Navigation source detail" className="rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="text-xl font-semibold">Navigation Beta · 소스 상세</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="항행표지 상태 / 저장된 검증 범주">{navigation.aidsState} / {navigation.storedValidatedCategories}/{navigation.totalCategories}</Stat><Stat label="현재 신선한 VALID 범주 / 레코드">{navigation.validCategories}/{navigation.totalCategories} / {navigation.records}</Stat>
      <Stat label="마지막 성공 / 경과">{value(navigation.lastSuccessAt)} / {value(navigation.ageHours)} h</Stat><Stat label="경보 current-state / 현재 건수">{navigation.warningState} / {value(navigation.currentWarnings)}</Stat>
      <Stat label="경보 마지막 성공 / 경과">{value(navigation.warningLastSuccessAt)} / {value(navigation.warningAgeHours)} h</Stat></dl><p className="mt-3 text-xs leading-5 text-white/55">{navigation.limitation}</p></section>
    <section aria-label="Security and data integrity" className="rounded-xl border border-white/15 bg-[#0a1b2a] p-5"><h2 className="text-xl font-semibold">Security · Data integrity</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="RLS 감사 / 시각">{security.rlsEnabled}/{security.rlsTables} · {security.state} · {security.checkedAt}</Stat><Stat label="Advisor ERROR / WARN / INFO">{security.advisorError} / {security.advisorWarn} / {security.advisorInfo}</Stat>
      <Stat label="Advisor CRITICAL/HIGH">UNKNOWN · 공급자 severity 체계 다름</Stat><Stat label="실시간 private / public 버킷">{value(business.storage.privateBuckets)} / {value(business.storage.publicBuckets)}</Stat>
      <Stat label="Market private staging objects (실시간 / 감사)">{value(business.storage.marketStagingObjects)} / {security.marketStagingObjects} ({security.checkedAt})</Stat>
      <Stat label="감사 Spot / Fish / Marine">{dataIntegrity.observed.fishingSpots} / {dataIntegrity.observed.fishSpecies} / {dataIntegrity.observed.marineOrganisms}</Stat><Stat label="기준값 일치 / 감사 시각">{value(dataIntegrity.match)} / {dataIntegrity.checkedAt}</Stat></dl>
      <p className="mt-3 text-xs leading-5 text-white/55">{security.severityLimitation} 핵심 데이터는 캐시된 감사 기준이며 요청마다 full scan하지 않습니다. Storage 접근 실패는 UNKNOWN입니다.</p></section>
  </div>;
}
