import Link from "next/link";
import { AlertTriangle, BadgeCheck, CheckCircle2, ClipboardCheck, Compass, LifeBuoy, PlaySquare, Sailboat, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const overviewCards = [
  {
    title: "실기시험 준비",
    description: "필기 합격 후 실제 조종 흐름을 익히기 위한 준비 단계입니다.",
    icon: Sailboat
  },
  {
    title: "실격 사유 숙지",
    description: "시험장에서 바로 감점 또는 실격으로 이어질 수 있는 행동을 미리 점검합니다.",
    icon: AlertTriangle
  },
  {
    title: "코스 연습",
    description: "출발, 회전, 접안 등 실기 코스 흐름을 반복해서 익히는 영역입니다.",
    icon: Compass
  },
  {
    title: "체크리스트 확인",
    description: "시험 전 준비물과 컨디션을 빠뜨리지 않도록 확인합니다.",
    icon: ClipboardCheck
  }
];

const learningMenus = [
  {
    title: "실기 코스",
    description: "코스별 조종 흐름과 주의 포인트를 정리할 예정입니다.",
    icon: Compass,
    badge: "사용 가능",
    href: "/practice/course"
  },
  {
    title: "실격 사유",
    description: "시험 전 반드시 피해야 할 주요 실격 포인트를 정리할 예정입니다.",
    icon: ShieldCheck,
    badge: "사용 가능",
    href: "/practice/fail-items"
  },
  {
    title: "시험 전 체크리스트",
    description: "시험 당일 준비물과 확인 항목을 한눈에 점검합니다.",
    icon: BadgeCheck,
    badge: "사용 가능",
    href: "/practice/checklist"
  },
  {
    title: "실기 영상",
    description: "향후 영상 자료가 추가될 예정입니다.",
    icon: PlaySquare,
    badge: "준비중",
    href: "/practice/videos"
  }
];

const checklist = ["신분증 준비", "응시표 확인", "시험 일정 확인", "안전장비 확인", "충분한 휴식"];

function SectionTitle({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{label}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export default function PracticePage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_50%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <LifeBuoy size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Practice</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">실기시험 학습센터</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                필기시험 합격 후 실기시험 준비를 위한 학습 공간입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Overview" title="실기시험 개요" description="실기시험은 조종 동작, 안전 확인, 코스 이해를 함께 준비해야 합니다." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
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
          <SectionTitle label="Menu" title="학습 메뉴" />
          <div className="grid gap-3 sm:grid-cols-2">
            {learningMenus.map((item) => {
              const Icon = item.icon;
              const isReady = item.badge === "사용 가능";
              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <Icon size={24} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${isReady ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </>
              );

              if (item.href) {
                return (
                  <Link key={item.title} href={item.href} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                    {cardContent}
                  </Link>
                );
              }

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  {cardContent}
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle label="Checklist" title="시험 전 체크리스트" description="시험장으로 가기 전 기본 준비 항목을 점검하세요." />
            <div className="grid gap-3 sm:grid-cols-2">
              {checklist.map((item) => (
                <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-800">
                  <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700 focus:ring-sky-500" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <PlaySquare size={24} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Video</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">실기 영상</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              준비중입니다. 향후 영상 자료가 추가될 예정입니다.
            </p>
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-500">
              유튜브 임베드나 영상 API 연동 없이, 현재는 콘텐츠 영역만 확보했습니다.
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실기시험 세부 기준은 시험장 및 공식 안내를 반드시 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
