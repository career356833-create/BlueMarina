import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  IdCard,
  MonitorPlay,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

const checklist = ["신분증 준비", "사진 준비", "교육 일정 확인", "공식 신청센터 확인"];
const materials = ["신분증", "6개월 이내 촬영 컬러사진 1매 (3.5cm × 4.5cm)"];
const proxyItems = ["대리인 신분증", "위임자 신분증", "위임장"];

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm font-semibold leading-6 text-slate-600">
      <CheckCircle2 size={16} className="mt-1 shrink-0 text-sky-600" />
      <span>{children}</span>
    </li>
  );
}

export default function SafetyGuidePage() {
  return (
    <PortalShell
      eyebrow="License Guide"
      title="수상안전교육 안내"
      description="조종면허증 발급 전 확인해야 하는 수상안전교육의 위치, 준비물, 공식 신청 경로를 정리한 안내 페이지입니다."
    >
      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Overview" title="교육 개요" />
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl bg-[#0F2D52] p-5 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-black">면허증 발급 전 이수 확인</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
              수상안전교육은 조종면허증 발급 신청 전까지 이수 완료가 필요한 교육입니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">확인 시점</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                필기/실기 합격 후 면허증 발급 전 단계에서 교육 이수 여부를 확인해야 합니다.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">신청 안내</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                온라인 안전교육, 교육일정, 교육신청은 Blue Marina 내부에서 처리하지 않고 공식 신청센터로 안내합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Process" title="면허 취득 절차에서의 위치" />
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { title: "필기시험", active: false },
            { title: "실기시험", active: false },
            { title: "수상안전교육", active: true },
            { title: "면허증 발급", active: false }
          ].map((item, index) => (
            <div key={item.title} className={`relative rounded-2xl p-4 ${item.active ? "bg-sky-700 text-white" : "bg-slate-50 text-slate-900"}`}>
              <p className={`text-xs font-black ${item.active ? "text-sky-100" : "text-sky-700"}`}>STEP {index + 1}</p>
              <p className="mt-2 text-base font-black">{item.title}</p>
              <p className={`mt-2 text-xs font-semibold leading-5 ${item.active ? "text-sky-50" : "text-slate-500"}`}>
                {item.active ? "발급 신청 전 이수 완료 확인" : "이전/다음 절차"}
              </p>
              {index < 3 ? (
                <div className="mt-4 flex justify-center text-sky-500 md:absolute md:-right-4 md:top-1/2 md:mt-0 md:-translate-y-1/2">
                  <ArrowRight size={20} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Fee & Materials</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">수수료와 준비물</h2>
            </div>
            <div className="rounded-2xl bg-[#0F2D52] px-4 py-3 text-right text-white">
              <p className="text-[11px] font-black text-sky-100">수수료</p>
              <p className="text-base font-black">14,400원</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <IdCard size={18} className="text-sky-700" />
                준비물
              </div>
              <ul className="mt-3 space-y-2">
                {materials.map((item) => (
                  <ListItem key={item}>{item}</ListItem>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <WalletCards size={18} className="text-sky-700" />
                대리접수
              </div>
              <ul className="mt-3 space-y-2">
                {proxyItems.map((item) => (
                  <ListItem key={item}>{item}</ListItem>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-100 bg-[#0F2D52] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
            <MonitorPlay size={24} />
          </div>
          <h2 className="mt-4 text-xl font-black">공식 신청 안내</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
            온라인 안전교육, 교육일정, 교육신청은 공식 신청센터에서 확인하세요. Blue Marina에서는 실제 신청 기능을 제공하지 않습니다.
          </p>
          <Link
            href="/official-links"
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50"
          >
            공식 신청센터에서 확인하기
            <ArrowRight size={18} />
          </Link>
        </article>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Checklist" title="수상안전교육 확인 체크리스트" />
        <div className="grid gap-3 sm:grid-cols-2">
          {checklist.map((item) => (
            <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-black text-slate-800">
              <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700" />
              {item}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <CalendarCheck size={22} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm font-bold leading-7 text-amber-900">
            교육 일정, 신청 가능 여부, 온라인 교육 수강 방법은 공식 홈페이지에서 반드시 확인하세요.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <ClipboardCheck size={22} className="mt-0.5 shrink-0 text-sky-700" />
          <p className="text-sm font-semibold leading-7 text-slate-600">
            이 페이지는 수상안전교육 준비에 필요한 최소 안내를 제공하며, 실제 일정과 접수 가능 여부는 공식 신청 경로를 기준으로 확인해야 합니다.
          </p>
        </div>
      </section>
    </PortalShell>
  );
}
