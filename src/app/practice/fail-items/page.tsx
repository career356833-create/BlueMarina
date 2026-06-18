import { AlertTriangle, CheckCircle2, Gauge, Hand, PackageOpen, Radio, Route, ShieldAlert } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const riskTypes = [
  {
    title: "안전 확인 부족",
    description: "출발, 변침, 접안 전후로 주변 상황을 충분히 확인하지 않는 경우입니다.",
    icon: ShieldAlert
  },
  {
    title: "시험관 지시 불이행",
    description: "시험 중 안내와 지시를 제대로 듣지 않거나 다른 행동을 먼저 하는 경우입니다.",
    icon: Radio
  },
  {
    title: "충돌 또는 접촉 위험",
    description: "장애물, 계류 시설, 다른 선박과의 거리 확보가 부족한 상황을 말합니다.",
    icon: AlertTriangle
  },
  {
    title: "코스 이탈",
    description: "정해진 흐름을 놓치거나 진행 방향을 크게 벗어나는 위험 유형입니다.",
    icon: Route
  },
  {
    title: "조작 미숙",
    description: "급조작, 과도한 조타, 속도 제어 실패처럼 안정성이 떨어지는 경우입니다.",
    icon: Hand
  },
  {
    title: "음주 또는 부적절한 상태",
    description: "시험에 적합하지 않은 몸 상태나 안전을 해칠 수 있는 상태를 피해야 합니다.",
    icon: Gauge
  }
];

const checklist = ["출발 전 주변 확인", "시험관 지시 듣기", "과속하지 않기", "급조작 피하기", "접안 시 거리와 속도 확인", "당황하면 즉시 안전 확보"];

function SectionTitle({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{label}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export default function PracticeFailItemsPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(248,113,113,0.28),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <ShieldAlert size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Practice</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">실격 사유 학습</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                실기시험에서 불합격으로 이어질 수 있는 주요 위험 행동을 미리 확인하는 공간입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle
            label="Risk Types"
            title="실격 위험 유형"
            description="아래 항목은 학습용 위험 유형입니다. 실제 공식 실격 기준은 시험장과 공식 안내를 반드시 확인해야 합니다."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {riskTypes.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Checklist" title="시험 중 주의할 행동" />
          <div className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-800">
                <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700 focus:ring-sky-500" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <PackageOpen size={24} />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Materials</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">공식 기준표 및 영상 자료</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            준비중입니다. 향후 공식 실격 기준표와 영상 자료가 추가될 예정입니다.
          </p>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실기시험 평가 기준과 실격 사유는 공식 안내 및 시험장 안내를 반드시 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
