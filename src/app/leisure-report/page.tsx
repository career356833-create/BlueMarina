import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Compass,
  LifeBuoy,
  MapPinned,
  Megaphone,
  RadioTower,
  Sailboat,
  Users
} from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

const reportTypes = [
  {
    title: "원거리 수상레저활동 신고",
    description: "활동 위치와 운항 계획에 따라 공식 기준 확인이 필요합니다.",
    icon: Compass
  },
  {
    title: "근거리 수상레저활동 자율신고",
    description: "자율신고 가능 여부와 절차는 공식 기준을 확인하세요.",
    icon: Sailboat
  },
  {
    title: "기상특보 시 활동신고",
    description: "기상 상황에 따른 활동 가능 여부는 공식 안내를 확인해야 합니다.",
    icon: CloudSun
  },
  {
    title: "운항신고",
    description: "운항 전 신고 필요 여부는 상황별 공식 기준을 확인하세요.",
    icon: RadioTower
  }
];

const checklist = [
  { title: "활동 지역 확인", icon: MapPinned },
  { title: "기상특보 여부 확인", icon: CloudSun },
  { title: "탑승자 정보 확인", icon: Users },
  { title: "안전장비 확인", icon: LifeBuoy },
  { title: "공식 신고 필요 여부 확인", icon: ClipboardCheck }
];

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
    </div>
  );
}

export default function LeisureReportPage() {
  return (
    <PortalShell
      eyebrow="License Guide"
      title="레저활동 신고 안내"
      description="원거리 수상레저활동, 기상특보 시 활동신고 등은 상황별 공식 기준 확인이 필요한 영역입니다. Blue Marina는 공식 신고 경로로 이어지는 안내 구조를 제공합니다."
    >
      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Report Type" title="신고 유형" />
        <div className="grid gap-4 lg:grid-cols-2">
          {reportTypes.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Icon size={24} />
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">공식 기준 확인 필요</span>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                <Link
                  href="/official-links"
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0F2D52] px-4 py-2 text-sm font-black text-white transition hover:bg-slate-950"
                >
                  공식 신청센터에서 확인하기
                  <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Checklist" title="준비 체크리스트" />
          <div className="grid gap-3">
            {checklist.map((item) => {
              const Icon = item.icon;

              return (
                <label key={item.title} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-black text-slate-800">
                  <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700" />
                  <Icon size={18} className="shrink-0 text-sky-700" />
                  {item.title}
                </label>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-100 bg-[#0F2D52] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
            <Megaphone size={24} />
          </div>
          <h2 className="mt-4 text-xl font-black">공식 신청 안내</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
            레저활동 신고 가능 여부와 절차는 Blue Marina 내부에서 판단하거나 접수하지 않습니다. 실제 신고는 공식 신청센터에서 확인하세요.
          </p>
          <Link
            href="/official-links"
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50"
          >
            공식 신청센터로 이동
            <ArrowRight size={18} />
          </Link>
        </article>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <BellRing size={22} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm font-bold leading-7 text-amber-900">
            레저활동 신고 대상, 기준, 절차는 상황과 법령에 따라 달라질 수 있으므로 반드시 공식 홈페이지에서 확인하세요.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-sky-700" />
          <p className="text-sm font-semibold leading-7 text-slate-600">
            이 페이지는 신고 기준을 확정적으로 설명하지 않고, 활동 전 확인해야 할 항목과 공식 신청 경로를 안내하기 위한 포털 구조입니다.
          </p>
        </div>
      </section>
    </PortalShell>
  );
}
