import { AlertTriangle, CheckCircle2, Compass, Gauge, ListChecks, PackageOpen, Route, Sailboat, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const courseSteps = [
  {
    title: "출발 준비",
    description: "탑승 전 자세, 주변 확인, 조작 준비 상태를 차분히 점검합니다.",
    icon: ListChecks
  },
  {
    title: "출항",
    description: "급하게 움직이지 않고 안전 확인 후 부드럽게 출발하는 흐름을 익힙니다.",
    icon: Sailboat
  },
  {
    title: "직진 및 변침",
    description: "정해진 순서에 따라 방향을 바꾸며 조작 감각을 유지하는 구간입니다.",
    icon: Route
  },
  {
    title: "정지",
    description: "속도를 줄이고 선체 움직임을 안정시키는 과정을 반복 학습합니다.",
    icon: Gauge
  },
  {
    title: "접안",
    description: "주변 상황과 속도를 확인하며 안전하게 접근하는 마무리 단계입니다.",
    icon: Compass
  }
];

const learningPoints = [
  {
    title: "침착하게 조작하기",
    description: "실수했을 때 급하게 조작하지 않고 다음 행동을 안정적으로 이어가는 것이 중요합니다.",
    icon: ShieldCheck
  },
  {
    title: "안전 확인",
    description: "출발, 변침, 정지, 접안 전후로 주변 상황을 확인하는 습관을 만듭니다.",
    icon: CheckCircle2
  },
  {
    title: "속도 조절",
    description: "코스 전체에서 빠르게 움직이는 것보다 부드럽게 제어하는 감각을 우선합니다.",
    icon: Gauge
  },
  {
    title: "순서 숙지",
    description: "시험 흐름을 미리 익히면 현장에서 긴장해도 다음 단계를 놓치지 않습니다.",
    icon: ListChecks
  }
];

function SectionTitle({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{label}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export default function PracticeCoursePage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <Route size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Practice</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">실기 코스 학습</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                실기시험에서 진행되는 기본 코스와 순서를 익히기 위한 학습 공간입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle
            label="Course Flow"
            title="코스 진행 순서"
            description="아래 순서는 학습용 기본 흐름입니다. 실제 시험장별 차이가 있을 수 있습니다."
          />
          <div className="space-y-3">
            {courseSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article key={step.title} className="relative rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-sky-700">STEP {index + 1}</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                  {index < courseSteps.length - 1 ? (
                    <div className="ml-6 mt-3 h-6 w-px bg-sky-200" aria-hidden="true" />
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Learning Points" title="학습 포인트" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {learningPoints.map((point) => {
              const Icon = point.icon;

              return (
                <article key={point.title} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{point.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{point.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <PackageOpen size={24} />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Materials</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">실습 자료</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            준비중입니다. 향후 실기 코스 설명 자료와 영상이 추가될 예정입니다.
          </p>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실기시험 코스 및 평가 기준은 시험장마다 일부 차이가 있을 수 있으므로 반드시 공식 안내를 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
