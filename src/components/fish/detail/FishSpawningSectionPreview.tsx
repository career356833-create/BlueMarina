import { FishSpawningSection } from "./FishSpawningSection";

const previewCases = [
  {
    id: "case-spawning-present",
    title: "붉은대게",
    note: "spawning 존재",
    spawning: "산란기 2~3월",
    spawningSourceStatus: "present" as const,
  },
  {
    id: "case-spawning-long",
    title: "기름가자미",
    note: "긴 원문",
    spawning: "산란기는 1~6월이며 주산란기는 3~5월\n수온과 서식 깊이에 따라 시기가 달라질 수 있다.",
    spawningSourceStatus: "present" as const,
  },
  {
    id: "case-spawning-special",
    title: "특수문자 확인",
    note: "HTML escape 검증",
    spawning: "산란기 3~6월 <script>alert(1)</script>",
    spawningSourceStatus: "present" as const,
  },
  {
    id: "case-spawning-hidden",
    title: "산란 정보 없음",
    note: "spawning null 시 섹션 숨김",
    spawning: null,
    spawningSourceStatus: "source_missing" as const,
  },
] as const;

export function FishSpawningSectionPreview() {
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
            <FishSpawningSection
              spawning={item.spawning}
              spawningSourceStatus={item.spawningSourceStatus}
            />
          </div>

          {item.spawning == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishSpawningSectionPreview;
