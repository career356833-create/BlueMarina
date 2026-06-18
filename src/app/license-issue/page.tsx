import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  IdCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  WalletCards
} from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

const issueTypes = [
  {
    title: "신규발급",
    description: "필기시험과 실기시험을 모두 합격하고 수상안전교육을 이수한 사람",
    icon: BadgeCheck
  },
  {
    title: "갱신발급",
    description: "갱신을 위한 안전교육을 이수한 사람",
    icon: RefreshCw
  },
  {
    title: "재발급",
    description: "면허증을 재발급 받으려는 사람",
    icon: RotateCcw
  }
];

const requiredDocuments = [
  "최종 합격한 응시표",
  "신분증",
  "최근 6개월 이내 촬영한 컬러사진 1매 (3.5cm × 4.5cm)"
];

const proxyDocuments = ["대리인 신분증", "위임장"];

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

export default function LicenseIssuePage() {
  return (
    <PortalShell
      eyebrow="License Guide"
      title="면허증 발급 안내"
      description="조종면허 시험 합격 및 수상안전교육 이수 후 면허증 발급을 준비할 때 확인해야 할 대상, 종류, 수수료, 구비서류 안내입니다."
    >
      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Eligibility" title="발급 대상" />
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl bg-[#0F2D52] p-5 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-black">시험 합격 및 안전교육 이수자</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-sky-100">
              일반조종 1급, 2급, 요트조종에 합격하고 안전교육을 이수한 사람이 발급 대상입니다.
            </p>
          </article>

          <article className="rounded-2xl bg-slate-50 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <UserCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-950">면제교육기관 교육 이수자</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
              해양경찰청 지정 면허시험 면제교육기관에서 교육을 이수한 사람도 면허증 발급 대상에 포함됩니다.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle eyebrow="Issue Type" title="발급 종류" />
        <div className="grid gap-3 md:grid-cols-3">
          {issueTypes.map((item) => {
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

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Fee" title="수수료" />
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-[#0F2D52] px-4 py-4 text-white">
              <div>
                <p className="text-sm font-black">신규발급</p>
                <p className="mt-1 text-xs font-semibold text-sky-100">최초 면허증 발급</p>
              </div>
              <p className="text-xl font-black">5,000원</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-slate-950">
              <div>
                <p className="text-sm font-black">갱신 및 재발급</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">갱신발급, 재발급</p>
              </div>
              <p className="text-xl font-black text-sky-700">4,000원</p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Place" title="발급 장소" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <IdCard size={18} className="text-sky-700" />
                해양경찰서
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">면허증 발급 신청 장소로 확인할 수 있습니다.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <FileCheck2 size={18} className="text-sky-700" />
                조종면허시험장
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">조종면허시험장에서 면허발급 신청 시 약 15일 소요됩니다.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Documents" title="구비서류 체크리스트" />
          <div className="grid gap-3">
            {requiredDocuments.map((item) => (
              <label key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-black text-slate-800">
                <input type="checkbox" className="h-5 w-5 rounded border-sky-300 text-sky-700" />
                {item}
              </label>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle eyebrow="Proxy" title="대리신청 안내" />
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <WalletCards size={18} className="text-sky-700" />
              대리신청 구비서류
            </div>
            <ul className="mt-3 space-y-2">
              {proxyDocuments.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-[#0F2D52] p-5 text-white shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
              <ClipboardCheck size={24} />
            </div>
            <h2 className="mt-4 text-xl font-black">공식 신청 안내</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-sky-100">
              실제 신청은 Blue Marina 내부에서 처리하지 않습니다. 발급 가능 여부와 신청 절차는 공식 신청센터에서 확인하세요.
            </p>
          </div>
          <Link
            href="/official-links"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50"
          >
            공식 신청센터에서 확인하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <WalletCards size={22} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm font-bold leading-7 text-amber-900">
            발급 가능 여부, 준비서류, 수수료는 변경될 수 있으므로 공식 홈페이지에서 반드시 확인하세요.
          </p>
        </div>
      </section>
    </PortalShell>
  );
}
