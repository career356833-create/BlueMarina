import Link from "next/link";
import { ArrowLeft, Clock, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

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
    <AppFrame>
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-sky-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
          <Clock size={34} />
        </div>
        <p className="mt-5 text-sm font-black text-sky-700">{section}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{feature}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
          이 기능은 Blue Marina 포털 확장 로드맵에 포함되어 있습니다. 실제 콘텐츠와 연동은 검증 후 순차적으로 공개됩니다.
        </p>
        <div className="mt-6 rounded-2xl bg-sky-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Waves className="mt-0.5 shrink-0 text-sky-700" size={20} />
            <p className="text-sm font-semibold leading-6 text-slate-600">
              현재는 문제은행, 모의고사, 오답노트, 학습분석, 이론학습 기능을 먼저 이용할 수 있습니다.
            </p>
          </div>
        </div>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 text-sm font-black text-white">
          <ArrowLeft size={18} />
          홈으로 돌아가기
        </Link>
      </section>
    </AppFrame>
  );
}
