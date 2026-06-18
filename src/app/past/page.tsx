import Link from "next/link";
import { ArrowLeft, FileClock } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function PastPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-sky-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
          <FileClock size={32} />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">기출문제 준비 중</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          실제 기출과 700문항 문제은행은 다음 단계에서 탑재할 예정입니다. 현재는 더미 문제로 전체 학습 흐름을 확인할 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 font-black text-white"
        >
          <ArrowLeft size={18} />
          홈으로 돌아가기
        </Link>
      </section>
    </AppFrame>
  );
}
