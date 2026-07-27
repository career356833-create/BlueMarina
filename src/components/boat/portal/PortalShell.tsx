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
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(180deg,#0F3355_0%,#0A1E30_100%)] p-5 text-white sm:p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9FB3C8]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#D7E4F6] sm:text-base">{description}</p>
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
  actionLabel = "상세 보기"
}: PortalCardProps) {
  const content = (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1F3A50] bg-[#0E2233] text-[#2E8BFF]">
        <Icon size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-black text-white">{title}</h2>
          <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black text-[#9FB3C8]">{status}</span>
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#9FB3C8]">{description}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-1 text-xs font-black text-[#2E8BFF] sm:flex">
        {actionLabel}
        {href ? <ArrowRight size={16} /> : <ExternalLink size={15} />}
      </div>
    </>
  );

  const className =
    "flex min-h-28 items-center gap-4 rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-4 text-left transition hover:border-[#2E8BFF]/40 hover:bg-[#11293C] focus:outline-none focus:ring-2 focus:ring-[#2E8BFF]/30";

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
      <div className="rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1F3A50] bg-[#071827] text-[#00D3C7]">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-[#9FB3C8]">
              현재는 준비중입니다. 실제 안내 콘텐츠가 추가되면 공식 화면과 같은 방식으로 보여드립니다.
            </p>
            <button type="button" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1F3A50] bg-[#071827] px-4 py-2 text-sm font-black text-white">
              공식 사이트 확인
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-5 sm:p-6">
        <h3 className="text-base font-black text-white">향후 콘텐츠 항목</h3>
        <div className="mt-4 grid gap-3">
          {["안내 문구", "확인 항목", "FAQ", "관련 링크"].map((item) => (
            <div key={item} className="rounded-[20px] border border-[#1F3A50] bg-[#071827] p-4">
              <p className="text-sm font-black text-white">{item}</p>
              <p className="mt-1 text-xs font-semibold text-[#9FB3C8]">준비중</p>
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
  { title: "필기시험장", description: "지역별 시험장 카드 구조입니다.", icon: MapPin },
  { title: "실기시험장", description: "지역별 시험장 카드 구조입니다.", icon: MapPin },
  { title: "수상안전교육장", description: "지역별 교육장 카드 구조입니다.", icon: ShieldCheck },
  { title: "면제교육기관", description: "지역별 교육기관 카드 구조입니다.", icon: MapPin }
];

export const officialLinkCards = [
  { title: "조종면허 시험", description: "공식 사이트 이동 버튼 구조입니다." },
  { title: "수상안전교육", description: "공식 사이트 이동 버튼 구조입니다." },
  { title: "온라인 안전교육", description: "공식 사이트 이동 버튼 구조입니다." },
  { title: "면허증 갱신", description: "공식 사이트 이동 버튼 구조입니다." },
  { title: "면허증 재발급", description: "공식 사이트 이동 버튼 구조입니다." },
  { title: "진위 여부 조회", description: "공식 사이트 이동 버튼 구조입니다." }
];
