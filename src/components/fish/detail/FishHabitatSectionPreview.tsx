import { FishHabitatSection } from "./FishHabitatSection";

const previewCases = [
  {
    id: "case-habitat-present",
    title: "붉은대게",
    note: "서식 정보 존재",
    habitat: "동해",
    habitatSourceStatus: "present" as const,
  },
  {
    id: "case-habitat-long",
    title: "기름가자미",
    note: "긴 원문",
    habitat:
      "우리나라 동해, 남해 일본, 동중국해\n수심 200~400m 펄이나 모래 바닥에 주로 서식한다.\n산란과 먹이활동은 계절에 따라 달라질 수 있다.",
    habitatSourceStatus: "present" as const,
  },
  {
    id: "case-habitat-special",
    title: "특수문자 확인",
    note: "HTML escape 검증",
    habitat: "서식지: 연안 <script>alert(1)</script>\n\n개방된 해역",
    habitatSourceStatus: "present" as const,
  },
  {
    id: "case-habitat-hidden",
    title: "서식 정보 없음",
    note: "habitat null 시 섹션 숨김",
    habitat: null,
    habitatSourceStatus: "source_missing" as const,
  },
] as const;

export function FishHabitatSectionPreview() {
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
            <FishHabitatSection habitat={item.habitat} habitatSourceStatus={item.habitatSourceStatus} />
          </div>

          {item.habitat == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishHabitatSectionPreview;
