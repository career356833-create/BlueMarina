import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpenCheck, ClipboardList, FileText, GraduationCap, Landmark, MapPin, PenLine, Route, ShieldCheck, ShipWheel } from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

const roadmapSteps = [
  {
    step: "01",
    title: "시험 안내",
    description: "필기와 실기시험의 기본 흐름을 먼저 확인합니다.",
    href: "/exam-guide",
    icon: FileText
  },
  {
    step: "02",
    title: "수상안전교육",
    description: "면허 발급 전 확인해야 하는 교육 단계를 정리합니다.",
    href: "/safety-guide",
    icon: ShieldCheck
  },
  {
    step: "03",
    title: "면허증 발급",
    description: "신규발급, 갱신, 재발급 안내로 이어집니다.",
    href: "/license-issue",
    icon: BadgeCheck
  },
  {
    step: "04",
    title: "공식 신청센터",
    description: "실제 신청과 조회는 공식 사이트에서 확인합니다.",
    href: "/official-links",
    icon: Landmark
  },
  {
    step: "05",
    title: "시험장·교육장 안내",
    description: "시험장과 교육장 정보를 찾기 위한 시설 안내입니다.",
    href: "/centers",
    icon: MapPin
  },
  {
    step: "06",
    title: "필기 학습",
    description: "문제은행 기반으로 필기시험 감각을 만듭니다.",
    href: "/study",
    icon: PenLine
  },
  {
    step: "07",
    title: "기출문제 학습",
    description: "기출 학습 구조와 대체 학습 흐름을 확인합니다.",
    href: "/past",
    icon: ClipboardList
  },
  {
    step: "08",
    title: "실기학습",
    description: "코스, 실격 사유, 체크리스트를 준비합니다.",
    href: "/practice",
    icon: ShipWheel
  }
];

const studyOrder = [
  {
    step: "1단계",
    title: "이론학습",
    description: "핵심 개념과 관련 문제를 먼저 연결합니다.",
    href: "/theory",
    icon: BookOpenCheck
  },
  {
    step: "2단계",
    title: "문제풀이",
    description: "문제은행을 풀며 약한 영역을 확인합니다.",
    href: "/study",
    icon: PenLine
  },
  {
    step: "3단계",
    title: "모의고사",
    description: "50문항 실전 흐름으로 점수를 점검합니다.",
    href: "/exam",
    icon: GraduationCap
  },
  {
    step: "4단계",
    title: "기출문제",
    description: "출제 흐름을 확인하는 센터로 이동합니다.",
    href: "/past",
    icon: ClipboardList
  },
  {
    step: "5단계",
    title: "실기학습",
    description: "필기 이후 실기 준비 흐름을 확인합니다.",
    href: "/practice",
    icon: ShipWheel
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

export default function LicenseGuidePage() {
  return (
    <PortalShell
      eyebrow="Blue Marina License Roadmap"
      title="조종면허 취득 가이드"
      description="조종면허 취득 과정을 한눈에 확인할 수 있는 안내 페이지입니다."
    >
      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle label="Roadmap" title="단계별 로드맵" description="면허 취득과 학습 준비에 필요한 주요 페이지를 순서대로 정리했습니다." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roadmapSteps.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-sky-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-700">{item.step}</span>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-black text-sky-700">
                  이동하기
                  <ArrowRight size={15} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle label="Study Order" title="추천 학습 순서" description="처음 준비하는 학습자가 따라가기 쉬운 순서입니다." />
        <div className="grid gap-3 lg:grid-cols-5">
          {studyOrder.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.href} className="relative">
                <Link href={item.href} className="block h-full rounded-2xl border border-sky-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <p className="mt-4 text-xs font-black text-sky-700">{item.step}</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                </Link>
                {index < studyOrder.length - 1 ? (
                  <div className="hidden lg:absolute lg:-right-3 lg:top-1/2 lg:block lg:-translate-y-1/2 lg:text-sky-400">
                    <ArrowRight size={20} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
        <div className="flex gap-3">
          <Route className="mt-1 shrink-0 text-amber-600" size={22} />
          <p className="text-sm font-black leading-7 text-amber-900">
            시험 일정, 준비물, 수수료 및 세부 기준은 공식 안내를 반드시 확인하세요.
          </p>
        </div>
      </section>
    </PortalShell>
  );
}
