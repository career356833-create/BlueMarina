import { BadgeCheck, CalendarDays, Camera, CheckCircle2, Clock, IdCard, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const dayBeforeChecklist = ["신분증 확인", "응시표 확인", "시험 일정과 장소 확인", "이동 시간 확인", "충분한 휴식", "날씨 확인"];

const testDayChecklist = ["여유 있게 도착", "시험장 안내 확인", "시험관 지시 경청", "안전 확인 습관 유지", "급조작 피하기", "실수해도 침착하게 진행"];

const supplies = [
  {
    title: "신분증",
    description: "본인 확인에 필요한 기본 준비물입니다.",
    icon: IdCard
  },
  {
    title: "응시표",
    description: "시험 접수 내역과 응시 정보를 확인할 때 필요할 수 있습니다.",
    icon: BadgeCheck
  },
  {
    title: "필요 시 사진",
    description: "사진 제출이 필요한 경우가 있는지 공식 안내를 확인하세요.",
    icon: Camera
  },
  {
    title: "개인 물품",
    description: "이동, 대기, 컨디션 관리를 위한 개인 물품을 준비합니다.",
    icon: PackageCheck
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

function ChecklistGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-800">
          <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700 focus:ring-sky-500" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

export default function PracticeChecklistPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <CheckCircle2 size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Practice</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">실기시험 체크리스트</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                시험 전 준비물과 당일 확인사항을 정리하는 공간입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Day Before" title="시험 전날 체크리스트" description="전날에는 준비물과 이동 계획, 컨디션을 차분히 확인하세요." />
          <ChecklistGrid items={dayBeforeChecklist} />
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Test Day" title="시험 당일 체크리스트" description="당일에는 안내를 잘 듣고 안전 확인 습관을 끝까지 유지하는 것이 중요합니다." />
          <ChecklistGrid items={testDayChecklist} />
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle label="Supplies" title="준비물 카드" description="공식 준비물은 시험장 및 공식 안내를 반드시 확인하세요." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {supplies.map((item) => {
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

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <Clock className="text-sky-700" size={24} />
            <h3 className="mt-3 text-base font-black text-slate-950">이동 시간</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">예상 이동 시간과 도착 여유를 함께 확인하세요.</p>
          </article>
          <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <MapPin className="text-sky-700" size={24} />
            <h3 className="mt-3 text-base font-black text-slate-950">장소 확인</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">시험장 위치와 현장 안내를 미리 확인하세요.</p>
          </article>
          <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <CalendarDays className="text-sky-700" size={24} />
            <h3 className="mt-3 text-base font-black text-slate-950">일정 확인</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">응시 날짜와 시간을 공식 안내 기준으로 확인하세요.</p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-amber-600" size={22} />
            <p className="text-sm font-black leading-7 text-amber-900">
              실기시험 준비물과 진행 방식은 시험장별로 다를 수 있으므로 반드시 공식 안내를 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
