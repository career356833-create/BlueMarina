import { FishDistributionSection } from "./FishDistributionSection";

const previewCases = [
  {
    id: "case-distribution-present",
    title: "붉은대게",
    note: "정상 분포 정보",
    distribution: "동해",
    distributionSourceStatus: "present" as const,
  },
  {
    id: "case-distribution-long",
    title: "제주소라",
    note: "긴 분포 원문",
    distribution:
      "한국, 일본(홋카이도 남부, 혼슈우, 시코쿠, 큐우슈우, 카메키쇼, 이주오오시마, 쿠모미, 칸토, 세토 내해, 토오시마, 쵸시), 중국, 대만, 홍콩\n연안과 비교적 깊은 해역에 분포한다.",
    distributionSourceStatus: "present" as const,
  },
  {
    id: "case-distribution-special",
    title: "특수문자 확인",
    note: "HTML escape 검증",
    distribution: "분포: 연안 <script>alert(1)</script>\n\n서해안과 남해안",
    distributionSourceStatus: "present" as const,
  },
  {
    id: "case-distribution-hidden",
    title: "분포 정보 없음",
    note: "distribution null 시 섹션 숨김",
    distribution: null,
    distributionSourceStatus: "source_missing" as const,
  },
] as const;

export function FishDistributionSectionPreview() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-2">
      {previewCases.map((item) => (
        <article
          key={item.id}
          className="flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.title}</p>
            <p className="text-sm text-slate-600">{item.note}</p>
          </header>

          <div className="max-w-[390px] overflow-hidden rounded-2xl bg-white">
            <FishDistributionSection
              distribution={item.distribution}
              distributionSourceStatus={item.distributionSourceStatus}
            />
          </div>

          {item.distribution == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishDistributionSectionPreview;
