"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  ArrowRight,
  BookOpenCheck,
  Compass,
  ChevronDown,
  Fish,
  GraduationCap,
  HelpCircle,
  MapPin,
  Mic,
  Navigation,
  Radio,
  Search,
  Ship,
  ShoppingBag,
  Sparkles,
  Trophy,
  Waves,
  Clock3,
  Route
} from "lucide-react";
import { BannerAd } from "@/components/ads/BannerAd";
import { SeaInterestCard } from "@/components/boat/home/SeaInterestCard";

type CardStatus = "ready" | "soon" | "premium";

type FeatureCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status?: CardStatus;
};

const PREVIEW_COUNT = 3;

function comingSoonHref(section: string, feature: string) {
  return `/coming-soon?section=${encodeURIComponent(section)}&feature=${encodeURIComponent(feature)}`;
}

const primaryActions: FeatureCard[] = [
  {
    title: "오늘 조황",
    description: "실시간 조황 미리보기",
    href: comingSoonHref("조황", "오늘 조황"),
    icon: Fish,
    status: "soon"
  },
  {
    title: "출조 예약",
    description: "선사·출항 정보 찾기",
    href: "/fishing-spots",
    icon: BookOpenCheck,
    status: "ready"
  },
  {
    title: "라이트 내비",
    description: "근거리 항로 안내",
    href: comingSoonHref("라이트 내비", "라이트 내비"),
    icon: Navigation,
    status: "soon"
  },
  {
    title: "방송 시작",
    description: "라이브 준비중",
    href: comingSoonHref("방송", "방송 시작"),
    icon: Radio,
    status: "soon"
  }
];

const catchPreview: FeatureCard[] = [
  {
    title: "오늘의 조황",
    description: "실시간 조황 미리보기",
    href: comingSoonHref("조황", "오늘의 조황"),
    icon: Trophy,
    status: "soon"
  },
  {
    title: "최신 조황",
    description: "출조 포인트 한눈에",
    href: comingSoonHref("조황", "최신 조황"),
    icon: Fish,
    status: "soon"
  },
  {
    title: "조황 인증",
    description: "사진 기반 공유",
    href: comingSoonHref("조황", "조황 인증"),
    icon: Compass,
    status: "soon"
  }
];

const spotPreview: FeatureCard[] = [
  {
    title: "선상낚시 거점",
    description: "공식 출조 지점",
    href: "/fishing-spots?type=boat-fishing-point",
    icon: Ship,
    status: "ready"
  },
  {
    title: "갯바위 거점",
    description: "지형별 확인",
    href: "/fishing-spots?type=rock-fishing-point",
    icon: MapPin,
    status: "ready"
  },
  {
    title: "출조 안전",
    description: "출항 전 체크",
    href: "/fishing-safety",
    icon: Anchor,
    status: "ready"
  }
];

const allServiceLinks: FeatureCard[] = [
  {
    title: "면허·교육 허브",
    description: "입문자 로드맵",
    href: "/license-guide",
    icon: GraduationCap,
    status: "ready"
  },
  {
    title: "낚시백과",
    description: "어종·보트·상식",
    href: "/marine-knowledge",
    icon: Waves,
    status: "ready"
  },
  {
    title: "FAQ",
    description: "자주 묻는 질문",
    href: "/faq",
    icon: HelpCircle,
    status: "ready"
  },
  {
    title: "시험장·교육장",
    description: "127개 시설",
    href: "/centers",
    icon: MapPin,
    status: "ready"
  },
  {
    title: "어종백과",
    description: "100종 정리",
    href: "/fish",
    icon: Fish,
    status: "ready"
  },
  {
    title: "낚시용어사전",
    description: "초보용 용어 안내",
    href: "/dictionary",
    icon: Search,
    status: "ready"
  }
];

const partnerLinks: FeatureCard[] = [
  {
    title: "용품",
    description: "준비중",
    href: comingSoonHref("광고·제휴", "용품"),
    icon: ShoppingBag,
    status: "soon"
  },
  {
    title: "광고",
    description: "제휴 안내",
    href: comingSoonHref("광고·제휴", "광고"),
    icon: Compass,
    status: "soon"
  },
  {
    title: "프리미엄",
    description: "AI·구독 기능",
    href: comingSoonHref("광고·제휴", "프리미엄"),
    icon: Sparkles,
    status: "premium"
  }
];

function StatusBadge({ status = "ready" }: { status?: CardStatus }) {
  if (status === "ready") {
    return <span className="rounded-full bg-[#2E8BFF]/15 px-2 py-0.5 text-[10px] font-black text-[#2E8BFF]">사용 가능</span>;
  }

  if (status === "premium") {
    return <span className="rounded-full bg-[#00D3C7]/15 px-2 py-0.5 text-[10px] font-black text-[#00D3C7]">Premium</span>;
  }

  return <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black text-slate-300">준비중</span>;
}

function ActionCard({ item }: { item: FeatureCard }) {
  const Icon = item.icon;
  const isReady = item.status === "ready";

  return (
    <Link
      href={item.href}
      className="group flex min-h-[112px] min-w-0 flex-col justify-between rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-3 transition hover:border-[#2E8BFF]/50 hover:bg-[#11293C]"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            isReady ? "bg-[#2E8BFF]/15 text-[#2E8BFF]" : "bg-white/6 text-sky-100"
          }`}
        >
          <Icon size={18} />
        </div>
        {!isReady && <StatusBadge status={item.status} />}
      </div>

      <div className="mt-3 min-w-0">
        <p className="break-words text-[15px] font-black leading-5 text-white">{item.title}</p>
        <p className="mt-1 text-xs font-semibold text-[#9FB3C8]">{item.description}</p>
      </div>

      <ArrowRight className="mt-2 self-end text-[#6E8299] transition group-hover:text-[#2E8BFF]" size={15} />
    </Link>
  );
}

function ServiceLinkCard({ item }: { item: FeatureCard }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-[#1F3A50] bg-[#0E2233] p-3 transition hover:border-[#2E8BFF]/40 hover:bg-[#11293C]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2E8BFF]/15 text-[#2E8BFF]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-black text-white">{item.title}</p>
          {item.status && item.status !== "ready" && <StatusBadge status={item.status} />}
        </div>
        <p className="mt-0.5 truncate text-xs font-semibold text-[#9FB3C8]">{item.description}</p>
      </div>
      <ArrowRight className="shrink-0 text-[#6E8299] transition group-hover:text-[#2E8BFF]" size={15} />
    </Link>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-tight text-white lg:text-xl">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-black text-[#2E8BFF]">
          전체 보기
        </Link>
      )}
    </div>
  );
}

function PreviewSection({ title, href, items }: { title: string; href: string; items: FeatureCard[] }) {
  return (
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-3 lg:p-4">
      <SectionTitle title={title} href={href} />
      <div className="grid gap-2 lg:grid-cols-3">
        {items.slice(0, PREVIEW_COUNT).map((item, index) => (
          <div key={item.title} className={index >= 2 ? "hidden lg:block" : ""}>
            <ServiceLinkCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeHeader() {
  const chips = [
    { label: "오늘의 바다", href: "/sea", icon: Waves },
    { label: "실시간 조황", href: comingSoonHref("조황", "실시간 조황"), icon: Fish },
    { label: "주요 기능", href: "#primary-actions", icon: BookOpenCheck },
    { label: "빠른 출항", href: "/fishing-spots", icon: Navigation }
  ];

  return (
    <section className="rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(180deg,#0F3355_0%,#0A1E30_100%)] px-4 py-3 text-white lg:px-5 lg:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9FB3C8]">Blue Marina</p>
          <h1 className="mt-1 text-[22px] font-black leading-tight text-white sm:text-[30px]">오늘 바다, 어디로 갈까요?</h1>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-[#D7E4F6] sm:text-sm sm:leading-6">
            물때·날씨·실제 조황을 한눈에 확인하고 출조를 준비하세요.
          </p>
        </div>

        <div className="hidden grid-cols-2 gap-2 lg:grid">
          {[
            { label: "현장형 PWA", icon: Anchor },
            { label: "스피드 모드", icon: Clock3 },
            { label: "준비중 최소화", icon: Sparkles },
            { label: "빠른 진입", icon: ArrowRight }
          ].map((chip) => {
            const Icon = chip.icon;

            return (
              <div
                key={chip.label}
                className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/90"
              >
                <Icon size={14} />
                <span>{chip.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 hidden flex-wrap gap-2 sm:mt-4 sm:flex">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Link
              key={chip.label}
              href={chip.href}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black text-white/90 transition hover:border-[#2E8BFF]/50 hover:bg-[#2E8BFF]/15"
            >
              <Icon size={13} />
              {chip.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function VoiceAssistantCard() {
  return (
    <section className="rounded-[28px] border border-[#1F3A50] bg-[#071827] p-4 text-white lg:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00D3C7]/15 text-[#00D3C7]">
          <Mic size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#00D3C7]">AI Fishing Assistant</p>
          <h2 className="truncate text-xl font-black text-white">음성비서</h2>
          <p className="hidden text-sm font-semibold text-[#9FB3C8] sm:block">
            물때, 기상, 조황, 출조 준비를 한 번에 물어보세요.
          </p>
        </div>
      </div>

      <Link
        href={comingSoonHref("AI", "음성비서")}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[#00D3C7] px-4 text-sm font-black text-[#071827] transition hover:bg-[#6af1e8]"
      >
        AI에게 물어보기
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "조황 한눈에", icon: Fish },
          { label: "출항 확인", icon: Route }
        ].map((chip) => {
          const Icon = chip.icon;
          return (
            <div
              key={chip.label}
              className="rounded-[18px] border border-[#1F3A50] bg-[#0E2233] px-3 py-2 text-[11px] font-semibold text-[#D7E4F6]"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} className="text-[#00D3C7]" />
                <span>{chip.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ServicesAccordion({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-3 lg:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9FB3C8]">All Services</p>
          <h2 className="text-lg font-black text-white">전체 서비스</h2>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#1F3A50] bg-[#0E2233] px-3 text-sm font-black text-white lg:hidden"
          onClick={onToggle}
          aria-expanded={open}
        >
          <ChevronDown className={`mr-1 transition ${open ? "rotate-180" : ""}`} size={16} />
          열기
        </button>
      </div>

      <div className={`mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${open ? "" : "hidden lg:grid"}`}>
        {allServiceLinks.map((item) => (
          <ServiceLinkCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

function PartnerAdSlot() {
  return (
    <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-3 lg:p-4">
      <SectionTitle title="광고·제휴" />
      <div className="grid gap-2 sm:grid-cols-3">
        {partnerLinks.map((item) => (
          <ServiceLinkCard key={item.title} item={item} />
        ))}
      </div>
      <div className="mt-3">
        <BannerAd label="광고·제휴 영역" />
      </div>
    </section>
  );
}

export function HomeLanding() {
  const [serviceOpen, setServiceOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-3 pb-10 lg:space-y-5">
      <HomeHeader />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <SeaInterestCard />
        <VoiceAssistantCard />
      </section>

      <section id="primary-actions" className="scroll-mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {primaryActions.map((item) => (
          <ActionCard key={item.title} item={item} />
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <PreviewSection title="최근 조황" href={comingSoonHref("조황", "조황 전체 보기")} items={catchPreview} />
        <PreviewSection title="가까운 출조거점" href="/fishing-spots" items={spotPreview} />
      </div>

      <ServicesAccordion open={serviceOpen} onToggle={() => setServiceOpen((open) => !open)} />

      <PartnerAdSlot />
    </div>
  );
}
