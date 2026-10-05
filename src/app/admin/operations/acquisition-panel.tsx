import type { ActivationCount, ActivationFunnel } from "@/lib/acquisition/funnel";
const number = (value: number | null | undefined) => value == null ? "UNKNOWN" : String(value);
const percent = (value: number | null) => value == null ? "UNKNOWN" : `${value}%`;
function Count({ value }: { value: ActivationCount | null }) {
  return <span>{value ? <>Real <strong>{number(value.real)}</strong> · QA {value.qa} · Admin {value.admin} · 판별 불가 {value.unclassified} (Total {value.total})</> : "UNKNOWN"}</span>;
}
export function AcquisitionPanel({ funnel }: { funnel: ActivationFunnel }) {
  return <section aria-label="Acquisition and activation" className="min-w-0 rounded-xl border border-white/15 bg-[#0a1b2a] p-5">
    <h2 className="text-xl font-semibold">유입 · 첫 참여</h2>
    <p className="mt-2 text-sm leading-6 text-white/65">로그인만으로 활성 사용자가 되지는 않습니다. 현재 남아 있는 서버 저장·제출 기록의 고유 참여자를 집계합니다.</p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><dt className="text-xs text-white/55">등록 Real 사용자 (QA·관리자 제외)</dt><dd>{number(funnel.realRegisteredUsers)}</dd></div>
      <div><dt className="text-xs text-white/55">관측 가능한 첫 참여자 · 중복 제거</dt><dd className="mt-1 text-sm"><Count value={funnel.firstActions}/></dd></div>
      <div><dt className="text-xs text-white/55">저장 참여자</dt><dd className="mt-1 text-sm"><Count value={funnel.firstSaved}/></dd></div>
      <div><dt className="text-xs text-white/55">방문 → 로그인 시작/완료 → 작성 시작</dt><dd className="mt-1 text-sm">UNKNOWN · 이벤트 저장소 미연결</dd></div>
    </dl>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">{(["charter", "market", "community"] as const).map(domain => <article key={domain} className="min-w-0 rounded-lg border border-white/15 p-4">
      <h3 className="font-semibold capitalize">{domain}</h3><dl className="mt-3 space-y-3 text-sm">
        <div><dt className="text-white/55">제출 완료</dt><dd><Count value={funnel[domain].submissions}/></dd></div>
        <div><dt className="text-white/55">첫 제출자</dt><dd><Count value={funnel[domain].firstSubmitters}/></dd></div>
        <div><dt className="text-white/55">승인 이력이 있는 제출물</dt><dd><Count value={funnel[domain].approved}/></dd></div>
        <div><dt className="text-white/55">거절 이력이 있는 제출물</dt><dd><Count value={funnel[domain].rejected}/></dd></div>
        <div><dt className="text-white/55">현재 공개</dt><dd><Count value={funnel[domain].published}/></dd></div>
        <div><dt className="text-white/55">Real 제출 → 승인 / 승인 → 현재 공개</dt><dd>{percent(funnel[domain].submissionToApprovedPercent)} / {percent(funnel[domain].approvedToCurrentlyPublicPercent)}</dd></div>
      </dl>{domain === "charter" ? <p className="mt-3 text-xs leading-5 text-amber-100">승인은 게시 후보입니다. 실제 공개는 별도의 검증된 registry release가 필요합니다.</p> : null}
    </article>)}</div>
    <p className="mt-4 text-xs leading-5 text-white/55">이 값은 누적 전환율이 아닙니다. 삭제된 저장 항목·과거 유입은 복원할 수 없습니다. 0건 분모, 조회 실패·상한 도달, 로그인 전환율과 유입 경로는 UNKNOWN입니다. 기존 검토 대기열과 needs attention을 함께 확인하세요.</p>
  </section>;
}
