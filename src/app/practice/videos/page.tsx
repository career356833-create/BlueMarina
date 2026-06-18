import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Film, PackageOpen, PlaySquare, Route, ShieldAlert, ShipWheel } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const videoCategories = [
  {
    title: "실기 코스 영상",
    description: "코스 흐름을 단계별로 확인할 수 있는 영상 영역입니다.",
    icon: Route
  },
  {
    title: "실격 사유 설명 영상",
    description: "주의해야 할 위험 행동을 정리할 영상 영역입니다.",
    icon: ShieldAlert
  },
  {
    title: "시험 전 체크리스트 영상",
    description: "전날과 당일 준비 사항을 점검할 영상 영역입니다.",
    icon: ClipboardCheck
  },
  {
    title: "초보자 조작 팁 영상",
    description: "처음 실기를 준비하는 학습자를 위한 조작 팁 영상 영역입니다.",
    icon: ShipWheel
  }
];

const plannedItems = ["시험 코스 설명", "접안/이안 흐름", "실격 위험 행동", "시험 당일 준비"];

const alternativeLinks = [
  {
    title: "실기 코스",
    description: "기본 코스 순서와 학습 포인트를 먼저 확인하세요.",
    href: "/practice/course",
    icon: Route
  },
  {
    title: "실격 사유",
    description: "불합격으로 이어질 수 있는 위험 행동을 먼저 점검하세요.",
    href: "/practice/fail-items",
    icon: ShieldAlert
  },
  {
    title: "체크리스트",
    description: "시험 전날과 당일 확인사항을 먼저 정리하세요.",
    href: "/practice/checklist",
    icon: CheckCircle2
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

export default function PracticeVideosPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <PlaySquare size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Practice</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">실기 영상 학습</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                실기시험 코스와 주의사항을 영상으로 학습할 수 있도록 준비 중입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Video Library" title="영상 카테고리" description="실제 영상은 아직 연결하지 않았고, 향후 자료를 담을 영역만 준비했습니다." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {videoCategories.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <Icon size={22} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">준비중</span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <PackageOpen size={24} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Coming Soon</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">영상 추가 예정 안내</h2>
            <div className="mt-4 grid gap-2">
              {plannedItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800">
                  <Film size={18} className="text-sky-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle label="Alternative Study" title="대체 학습 안내" description="영상 자료가 준비되기 전에는 아래 페이지에서 먼저 학습할 수 있습니다." />
            <div className="grid gap-3">
              {alternativeLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className="rounded-2xl border border-sky-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                        <Icon size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실제 실기시험 기준은 시험장 및 공식 안내를 반드시 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
