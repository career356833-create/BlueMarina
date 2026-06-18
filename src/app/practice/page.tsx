import { LifeBuoy } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function PracticePage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-sky-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
          <LifeBuoy size={34} />
        </div>
        <p className="mt-5 text-sm font-black text-sky-700">실기시험</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">준비중</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
          실기시험 체크리스트, 코스 안내, 감점 포인트 학습 기능을 추가할 예정입니다.
        </p>
      </section>
    </AppFrame>
  );
}
