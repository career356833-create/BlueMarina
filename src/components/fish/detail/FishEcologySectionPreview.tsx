import { FishEcologySection } from "./FishEcologySection";

const previewCases = [
  {
    id: "case-ecology-present",
    title: "붉은대게",
    note: "생태 정보 존재",
    ecology: "산란기 2~3월, 최소성숙갑폭 암컷 55~75mm, 수컷 70~100mm",
    ecologySourceStatus: "present" as const,
  },
  {
    id: "case-ecology-long",
    title: "참조기",
    note: "긴 원문",
    ecology:
      "1년이면 전장 15cm, 2년이면 24cm,3년이면 29cm,4년이면 33cm, 5년이면 35cm까지 성장한다. 체장 40cm. 산란기는 3~6월로서 남쪽일수록 빠르고 북쪽일수록 늦으며, 산란장은 우리나라 서해안 일대와 중국 연안해역이다.전장 30cm 정도면 3만~7만 개의 알을 산란한다.",
    ecologySourceStatus: "present" as const,
  },
  {
    id: "case-ecology-special",
    title: "특수문자 확인",
    note: "HTML escape 검증",
    ecology: "생태: 연안 <script>alert(1)</script>\n\n수심 200~400m",
    ecologySourceStatus: "present" as const,
  },
  {
    id: "case-ecology-hidden",
    title: "생태 정보 없음",
    note: "ecology null 시 섹션 숨김",
    ecology: null,
    ecologySourceStatus: "source_missing" as const,
  },
] as const;

export function FishEcologySectionPreview() {
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
            <FishEcologySection ecology={item.ecology} ecologySourceStatus={item.ecologySourceStatus} />
          </div>

          {item.ecology == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishEcologySectionPreview;
