import { FishMorphologySection } from "./FishMorphologySection";

const previewCases = [
  {
    id: "case-red-snow-crab",
    title: "붉은대게",
    note: "morphology 존재 / feature source_missing",
    morphology:
      "전체적으로 짙은 적색이며, 갑각의 뒷아가미구역이 부풀어올라 있으며 뒷부분의 경사가 급하고, 옆 가장자리 뒷부분에 예리한 가시가 있다(한국해양무척추동물도감).",
    distinguishingFeatures: null,
    morphologySourceStatus: "present" as const,
    featureSourceStatus: "source_missing" as const,
  },
  {
    id: "case-blackfin-flounder",
    title: "기름가자미",
    note: "season source_missing / 긴 morphology 원문",
    morphology:
      "몸은 긴 타원형이다. 주둥이가 짧고, 입이 작으며 입의 앞부분만 열린다. 두 눈 사이의 간격은 좁다. 무안측에는 다수의 점액공이 있어서 몸 표면이 미끄럽다. 꼬리지느러미 뒤 가장자리는 둥글다. 측선은 몸의 중앙 부분에 있고, 가슴지느러미 부근에서 매우 낮게 솟아오른다. 유안측은 암갈색을 띠고 윤곽이 뚜렷하지 않은 어두운 무늬가 있다. 무안측은 회백색, 등지느러미의 가장자리는 검은색을 띈다.",
    distinguishingFeatures: null,
    morphologySourceStatus: "present" as const,
    featureSourceStatus: "source_missing" as const,
  },
  {
    id: "case-hidden-section",
    title: "형태 정보 없음 검증",
    note: "morphology null 시 전체 섹션 숨김",
    morphology: null,
    distinguishingFeatures: null,
    morphologySourceStatus: "source_missing" as const,
    featureSourceStatus: "source_missing" as const,
  },
] as const;

export function FishMorphologySectionPreview() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <FishMorphologySection
              morphology={item.morphology}
              morphologySourceStatus={item.morphologySourceStatus}
              distinguishingFeatures={item.distinguishingFeatures}
              featureSourceStatus={item.featureSourceStatus}
            />
          </div>

          {item.morphology == null ? (
            <p className="text-xs font-medium text-slate-500">섹션이 렌더링되지 않아야 하는 케이스입니다.</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default FishMorphologySectionPreview;
