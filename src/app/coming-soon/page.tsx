import Link from "next/link";
import { ArrowLeft, Clock, Waves } from "lucide-react";
import { DetailFrame, StatusNotice } from "@/components/platform/PageFamilies";

type ComingSoonPageProps = {
  searchParams: Promise<{
    feature?: string;
    section?: string;
  }>;
};

export default async function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const params = await searchParams;
  const feature = params.feature ?? "준비중 기능";
  const section = params.section ?? "Blue Marina";

  return (
    <DetailFrame width="reading">
      <section className="bm-detail-section mx-auto max-w-2xl p-7 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bm-surface-elevated)] text-[var(--bm-brand-accent)]">
          <Clock size={34} />
        </div>
        <p className="bm-eyebrow mt-5">{section}</p>
        <h1 className="mt-2 text-3xl">{feature}</h1>
        <p className="bm-lede mx-auto mt-3 max-w-md text-sm">
          이 기능은 Blue Marina 포털 확장 로드맵에 포함되어 있습니다. 실제 콘텐츠와 연동은 검증 후 순차적으로 공개됩니다.
        </p>
        <StatusNotice tone="limited" title="현재 이용 가능한 기능">
          <div className="flex items-start gap-3">
            <Waves className="mt-0.5 shrink-0 text-[var(--bm-brand-accent)]" size={20} />
            <p className="text-sm leading-6">
              현재는 문제은행, 모의고사, 오답노트, 학습분석, 이론학습 기능을 먼저 이용할 수 있습니다.
            </p>
          </div>
        </StatusNotice>
        <Link href="/" className="bm-action mt-6 gap-2 px-5 text-sm">
          <ArrowLeft size={18} />
          홈으로 돌아가기
        </Link>
      </section>
    </DetailFrame>
  );
}
