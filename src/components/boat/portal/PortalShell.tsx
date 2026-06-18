import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock, Compass, ExternalLink, FileText, MapPin, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

type PortalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

type PortalCardProps = {
  title: string;
  description: string;
  href?: string;
  icon?: LucideIcon;
  status?: string;
  actionLabel?: string;
};

export function PortalShell({ eyebrow, title, description, children }: PortalShellProps) {
  return (
    <AppFrame>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] p-6 text-white shadow-lg sm:p-8 lg:p-10">
          <p className="text-sm font-black text-cyan-200">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-sky-100 sm:text-base">{description}</p>
        </section>
        {children}
      </div>
    </AppFrame>
  );
}

export function PortalCard({
  title,
  description,
  href,
  icon: Icon = FileText,
  status = "준비중",
  actionLabel = "자세히 보기"
}: PortalCardProps) {
  const content = (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">{status}</span>
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-1 text-xs font-black text-sky-700 sm:flex">
        {actionLabel}
        {href ? <ArrowRight size={16} /> : <ExternalLink size={15} />}
      </div>
    </>
  );

  const className =
    "flex min-h-28 items-center gap-4 rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

export function PlaceholderContent({ title }: { title: string }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">내용 준비중입니다. 실제 안내 문구는 공식 자료 검증 후 입력합니다.</p>
            <button type="button" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 px-4 py-2 text-sm font-black text-sky-700">
              공식사이트 확인
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-black text-slate-950">향후 콘텐츠 섹션</h3>
        <div className="mt-4 grid gap-3">
          {["핵심 안내", "확인 사항", "FAQ", "관련 링크"].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-800">{item}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">준비중</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const guidePortalCards = [
  { title: "면허시험 안내", description: "면허시험 안내 화면 구조를 준비합니다.", href: "/exam-guide", icon: FileText },
  { title: "수상안전교육 안내", description: "수상안전교육 안내 화면 구조를 준비합니다.", href: "/safety-guide", icon: ShieldCheck },
  { title: "면허증 발급 안내", description: "면허증 발급 안내 화면 구조를 준비합니다.", href: "/license-issue", icon: FileText },
  { title: "레저활동 신고 안내", description: "레저활동 신고 안내 화면 구조를 준비합니다.", href: "/leisure-report", icon: Compass }
];

export const centerCards = [
  { title: "필기시험장", description: "지역, 연락처, 지도 영역을 수록할 카드 구조입니다.", icon: MapPin },
  { title: "실기시험장", description: "지역, 연락처, 지도 영역을 수록할 카드 구조입니다.", icon: MapPin },
  { title: "수상안전교육장", description: "지역, 연락처, 지도 영역을 수록할 카드 구조입니다.", icon: ShieldCheck },
  { title: "면제교육장", description: "지역, 연락처, 지도 영역을 수록할 카드 구조입니다.", icon: MapPin }
];

export const officialLinkCards = [
  { title: "조종면허 시험 신청", description: "공식사이트 이동 버튼 구조입니다." },
  { title: "수상안전교육 신청", description: "공식사이트 이동 버튼 구조입니다." },
  { title: "온라인 안전교육", description: "공식사이트 이동 버튼 구조입니다." },
  { title: "면허증 갱신", description: "공식사이트 이동 버튼 구조입니다." },
  { title: "면허증 재발급", description: "공식사이트 이동 버튼 구조입니다." },
  { title: "진위여부 조회", description: "공식사이트 이동 버튼 구조입니다." }
];
