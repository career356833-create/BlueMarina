import { FishFeedingSection } from "./FishFeedingSection";

const previewCases = [
  {
    id: "case-feeding-present",
    title: "붉은대게",
    note: "먹이 정보 존재",
    feeding: "부유성 유기물, 작은 갑각류, 저서성 미세생물 등을 먹는다.",
    feedingSourceStatus: "present" as const,
  },
  {
    id: "case-feeding-long",
    title: "참조기",
    note: "긴 원문",
    feeding:
      "치어기에는 동물성 플랑크톤을 주로 섭식하고, 성장 후에는 소형 어류와 갑각류를 먹는다.\n\n서식 수온과 계절에 따라 먹이 선택이 달라질 수 있다.",
    feedingSourceStatus: "present" as const,
  },
  {
    id: "case-feeding-special",
    title: "특수문자 확인",
    note: "HTML escape 검증",
    feeding: "먹이: 갑각류 <script>alert(1)</script>\n\n플랑크톤",
    feedingSourceStatus: "present" as const,
  },
  {
    id: "case-feeding-hidden",
    title: "먹이 정보 없음",
    note: "feeding null 시 섹션 숨김",
    feeding: null,
    feedingSourceStatus: "source_missing" as const,
  },
] as const;

export function FishFeedingSectionPreview() {
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
            <FishFeedingSection feeding={item.feeding} feedingSourceStatus={item.feedingSourceStatus} />
          </div>

          {item.feeding == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishFeedingSectionPreview;
