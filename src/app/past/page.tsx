import Link from "next/link";
import { BarChart3, BookOpenCheck, ClipboardList, FileClock, History, ListChecks, RotateCcw, Sailboat, ShipWheel, Shuffle, Trophy } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const pastMenus = [
  {
    title: "일반조종면허 기출",
    description: "연도별/회차별 기출 데이터는 공식 자료 확인 후 순차 반영 예정입니다.",
    status: "준비중",
    icon: ShipWheel
  },
  {
    title: "요트조종면허 기출",
    description: "요트 기출 흐름을 따로 학습할 수 있는 구조를 준비하고 있습니다.",
    status: "준비중",
    icon: Sailboat
  },
  {
    title: "최근 출제유형",
    description: "현재는 1,400문항 문제은행 기반 학습으로 출제 흐름을 익힐 수 있습니다.",
    status: "문제은행 기반",
    icon: BarChart3
  },
  {
    title: "오답 기반 복습",
    description: "오답노트와 학습분석 데이터를 활용한 기출형 복습 구조를 준비 중입니다.",
    status: "준비중",
    icon: RotateCcw
  }
];

const alternativeLinks = [
  {
    title: "일반조종면허 모의고사",
    description: "일반조종면허 700문항에서 50문항 실전 테스트를 진행합니다.",
    href: "/exam?license=general",
    icon: ShipWheel
  },
  {
    title: "요트조종면허 모의고사",
    description: "요트조종면허 700문항에서 50문항 실전 테스트를 진행합니다.",
    href: "/exam?license=yacht",
    icon: Sailboat
  },
  {
    title: "랜덤문제",
    description: "문제은행 전체에서 무작위로 출제되는 문제를 반복 학습합니다.",
    href: "/random?license=general",
    icon: Shuffle
  },
  {
    title: "이론학습",
    description: "30개 핵심 이론과 관련 문제를 연결해 기본기를 정리합니다.",
    href: "/theory",
    icon: BookOpenCheck
  }
];

const plannedItems = ["연도별 기출문제", "회차별 기출문제", "빈출 유형 분석", "기출 오답노트"];

function SectionTitle({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{label}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export default function PastPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <FileClock size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Past Exams</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">기출문제 학습센터</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                출제 흐름을 확인하고 실전 감각을 키우기 위한 학습 공간입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Past Exam Menu" title="기출문제 학습 메뉴" description="현재는 실제 연도별 기출 데이터 대신 문제은행 기반 학습으로 안내합니다." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pastMenus.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <Icon size={22} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">{item.status}</span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Available Now" title="현재 사용 가능한 대체 학습" description="기출 데이터 반영 전에는 아래 학습 기능으로 실전 감각을 먼저 만들 수 있습니다." />
          <div className="grid gap-3 sm:grid-cols-2">
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
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/60 p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <History size={24} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-sky-700">Coming Soon</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">향후 추가 예정</h2>
            <div className="mt-4 grid gap-2">
              {plannedItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800">
                  <ClipboardList size={18} className="text-sky-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Trophy size={24} />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">문제은행 기반 학습 안내</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              현재 Blue Marina는 1,400문항 문제은행을 기반으로 학습을 제공합니다. 연도별/회차별 기출문제는 공식 자료 확인 후 순차 반영 예정입니다.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <ListChecks className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실제 연도별/회차별 기출문제는 공식 자료 확인 후 반영합니다. 현재 페이지는 기출 학습 구조와 대체 학습 흐름을 안내합니다.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
