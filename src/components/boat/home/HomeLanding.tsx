"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  Compass,
  FileQuestion,
  GraduationCap,
  Map,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  NotebookTabs,
  Package,
  Radar,
  RotateCcw,
  Sailboat,
  ShieldCheck,
  ShipWheel,
  Sparkles,
  Video,
  Waves
} from "lucide-react";
import { BannerAd } from "@/components/ads/BannerAd";
import { getTotalQuestionCount, type LicenseType } from "@/lib/boat/questions";
import { predictPass } from "@/lib/boat/prediction";
import { readExamHistory, readProgress, readWrongIds, type ExamHistoryRecord, type ProgressRecord } from "@/lib/boat/storage";
import { getTopWeakTags } from "@/lib/boat/weakness";

type PortalStatus = "ready" | "soon" | "premium";

type PortalItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: PortalStatus;
};

type PortalSection = {
  title: string;
  description: string;
  icon: LucideIcon;
  items: PortalItem[];
};

const defaultLicense: LicenseType = "yacht";
const yachtTotalQuestions = getTotalQuestionCount("yacht");
const generalTotalQuestions = getTotalQuestionCount("general");
const totalQuestions = yachtTotalQuestions + generalTotalQuestions;

function comingSoonHref(section: string, feature: string) {
  return `/coming-soon?section=${encodeURIComponent(section)}&feature=${encodeURIComponent(feature)}`;
}

const learningCenter: PortalSection = {
  title: "학습센터",
  description: "현재 바로 사용할 수 있는 문제은행 학습 기능입니다.",
  icon: BookOpenCheck,
  items: [
    { title: "문제풀이", description: "면허별 카테고리 문제 학습", href: "/study?license=yacht", icon: BookOpenCheck, status: "ready" },
    { title: "랜덤문제", description: "전체 문제에서 무작위 반복 학습", href: "/random?license=yacht", icon: RotateCcw, status: "ready" },
    { title: "모의고사", description: "50문항 실전 테스트", href: "/exam?license=yacht", icon: ClipboardList, status: "ready" },
    { title: "오답노트", description: "틀린 문제 자동 저장과 복습", href: "/wrong?license=yacht", icon: NotebookTabs, status: "ready" },
    { title: "학습분석", description: "취약 태그와 합격 가능성 확인", href: "/analysis?license=yacht", icon: BarChart3, status: "ready" },
    { title: "이론학습", description: "핵심 이론 목차와 관련 문제 연결", href: "/theory", icon: GraduationCap, status: "ready" }
  ]
};

const licenseCenter: PortalSection = {
  title: "면허센터",
  description: "면허 취득 과정과 공식 안내로 이어지는 포털 구조입니다.",
  icon: ShieldCheck,
  items: [
    { title: "면허취득 가이드", description: "전체 취득 흐름 구조", href: "/license-guide", icon: GraduationCap, status: "ready" },
    { title: "필기시험 안내", description: "필기시험 안내 센터", href: "/exam-guide", icon: FileQuestion, status: "ready" },
    { title: "실기시험 안내", description: "실기 안내 준비중", href: comingSoonHref("면허센터", "실기시험 안내"), icon: Sailboat, status: "soon" },
    { title: "수상안전교육", description: "교육 안내 구조", href: "/safety-guide", icon: ShieldCheck, status: "ready" },
    { title: "면허증 발급", description: "발급 안내 구조", href: "/license-issue", icon: ClipboardList, status: "ready" },
    { title: "레저활동 신고", description: "신고 안내 구조", href: "/leisure-report", icon: Megaphone, status: "ready" }
  ]
};

const facilityCenter: PortalSection = {
  title: "시설안내",
  description: "시험장, 교육장, 공식 신청 동선을 묶은 안내 영역입니다.",
  icon: MapPin,
  items: [
    { title: "시험장 안내", description: "시험장 안내 센터", href: "/centers", icon: MapPin, status: "ready" },
    { title: "교육장 안내", description: "교육장 데이터 준비중", href: comingSoonHref("시설안내", "교육장 안내"), icon: Building2, status: "soon" },
    { title: "공식 신청센터", description: "공식 신청 링크 구조", href: "/official-links", icon: Compass, status: "ready" },
    { title: "지도 서비스", description: "지도 연동 준비중", href: comingSoonHref("시설안내", "지도 서비스"), icon: Map, status: "soon" }
  ]
};

const practiceCenter: PortalSection = {
  title: "실기학습",
  description: "실기시험 대비 콘텐츠가 들어갈 준비중 영역입니다.",
  icon: Sailboat,
  items: [
    { title: "실기 코스", description: "코스 흐름과 학습 포인트", href: "/practice/course", icon: Sailboat, status: "ready" },
    { title: "실격사유", description: "주의해야 할 실격 위험 유형", href: "/practice/fail-items", icon: ShieldCheck, status: "ready" },
    { title: "실기 체크리스트", description: "시험 전날과 당일 준비 항목", href: "/practice/checklist", icon: ClipboardList, status: "ready" },
    { title: "실기 영상", description: "영상 자료 라이브러리 준비 페이지", href: "/practice/videos", icon: Video, status: "ready" }
  ]
};

const marineInfo: PortalSection = {
  title: "해양정보",
  description: "조석, 날씨, 항로표지 등 해양레저 정보 확장 영역입니다.",
  icon: Waves,
  items: [
    { title: "조석표", description: "지역별 조석표 준비중", href: comingSoonHref("해양정보", "조석표"), icon: Waves, status: "soon" },
    { title: "물때 정보", description: "물때 정보 준비중", href: comingSoonHref("해양정보", "물때 정보"), icon: Radar, status: "soon" },
    { title: "해상날씨", description: "해상날씨 준비중", href: comingSoonHref("해양정보", "해상날씨"), icon: CloudSun, status: "soon" },
    { title: "항로표지 가이드", description: "항로표지 콘텐츠 준비중", href: comingSoonHref("해양정보", "항로표지 가이드"), icon: Compass, status: "soon" }
  ]
};

const expansionServices: PortalSection = {
  title: "확장예정 서비스",
  description: "프리미엄, 용품, 커뮤니티 기능을 한 영역으로 정리했습니다.",
  icon: Sparkles,
  items: [
    { title: "AI 학습센터", description: "AI 학습코치와 오답분석 준비중", href: comingSoonHref("확장예정 서비스", "AI 학습센터"), icon: Bot, status: "premium" },
    { title: "해양용품", description: "안전장비와 추천도구 큐레이션 준비중", href: comingSoonHref("확장예정 서비스", "해양용품"), icon: Package, status: "soon" },
    { title: "커뮤니티", description: "공지사항, 합격후기, 질문답변 준비중", href: comingSoonHref("확장예정 서비스", "커뮤니티"), icon: MessageCircleQuestion, status: "soon" }
  ]
};

const roadmap = [
  { phase: "Phase 1", title: "학습 기능", items: ["문제은행", "모의고사", "오답노트", "이론학습"] },
  { phase: "Phase 2", title: "포털 골격", items: ["면허센터", "시설안내", "공식 신청센터", "정책 페이지"] },
  { phase: "Phase 3", title: "해양 정보", items: ["조석표", "물때", "해상날씨", "항로표지"] },
  { phase: "Phase 4", title: "확장 서비스", items: ["AI 학습센터", "해양용품", "커뮤니티"] }
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-5 w-1 rounded-full bg-sky-600" />
      <h2 className="text-lg font-black text-slate-950 lg:text-xl">{children}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: PortalStatus }) {
  if (status === "ready") {
    return <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-black text-sky-700">사용 가능</span>;
  }

  if (status === "premium") {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">Premium</span>;
  }

  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">Coming Soon</span>;
}

function PortalCard({ item }: { item: PortalItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-h-[128px] flex-col rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Icon size={22} />
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-4 text-sm font-black text-slate-950">{item.title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.description}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-black text-sky-700">
        열기 <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function PortalSectionBlock({ section, compact = false }: { section: PortalSection; compact?: boolean }) {
  const Icon = section.icon;

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2D52] text-white">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-950">{section.title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{section.description}</p>
        </div>
      </div>
      <div className={`grid gap-3 sm:grid-cols-2 ${compact ? "xl:grid-cols-3" : "xl:grid-cols-3"}`}>
        {section.items.map((item) => (
          <PortalCard key={`${section.title}-${item.title}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function RoadmapPanel() {
  return (
    <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm">
      <SectionTitle>서비스 로드맵</SectionTitle>
      <div className="grid gap-3 md:grid-cols-4">
        {roadmap.map((item) => (
          <div key={item.phase} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black text-sky-700">{item.phase}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{item.title}</p>
            <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
              {item.items.map((text) => (
                <li key={text} className="flex gap-1">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-sky-600" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeLanding() {
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryRecord[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [weakTags, setWeakTags] = useState<string[]>([]);

  useEffect(() => {
    setProgress(readProgress(defaultLicense));
    setExamHistory(readExamHistory(defaultLicense));
    setWrongCount(readWrongIds(defaultLicense).length);
    setWeakTags(getTopWeakTags(5, defaultLicense).items.map((item) => item.label));
  }, []);

  const solved = progress?.solvedIds.length ?? 0;
  const progressPercent = yachtTotalQuestions === 0 ? 0 : Math.round((solved / yachtTotalQuestions) * 100);
  const continueHref = wrongCount > 0 ? "/wrong?license=yacht" : solved > 0 ? "/random?license=yacht" : "/study?license=yacht";
  const prediction = useMemo(() => predictPass(examHistory, weakTags), [examHistory, weakTags]);

  return (
    <div className="space-y-5 lg:space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-200/40">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(219,242,255,0.94)_0%,rgba(240,249,255,0.78)_38%,rgba(14,165,233,0.24)_72%,rgba(15,45,82,0.48)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(135deg,#0ea5e9_0%,#0369a1_50%,#0f2d52_100%)] opacity-90" />

        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-10">
          <div>
            <p className="text-sm font-black text-sky-700">Blue Marina Portal</p>
            <h1 className="mt-3 text-5xl font-black leading-none text-[#0F2D52] sm:text-6xl lg:text-7xl">Blue Marina</h1>
            <p className="mt-3 text-2xl font-black text-sky-700 sm:text-3xl">바다로 가는 가장 쉬운 길</p>
            <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-700">
              일반조종면허와 요트조종면허 1,400문항 학습을 중심으로 면허, 시설, 실기, 해양정보까지 이어지는 해양레저 포털입니다.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link href="/study?license=general" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800">
                <ShipWheel size={20} />
                일반조종면허 시작
              </Link>
              <Link href="/study?license=yacht" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0F2D52] px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-950">
                <Sailboat size={20} />
                요트조종면허 시작
              </Link>
              <Link href={continueHref} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50">
                <ArrowRight size={20} />
                이어서 학습
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-[#08265a] p-5 text-white shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-sky-100">문제은행</p>
                <p className="mt-2 text-2xl font-black">{totalQuestions.toLocaleString()}문항</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-sky-100">요트 진도율</p>
                <p className="mt-2 text-2xl font-black">{progressPercent}%</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-sky-100">합격예측</p>
                <p className="mt-2 text-2xl font-black">{prediction.passRate || "--"}%</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-sky-100">홈 IA</p>
                <p className="mt-2 text-2xl font-black">6섹션</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-sky-50">
              학습센터를 가장 앞에 두고, 나머지 포털 기능은 준비중 상태로 정리해 모바일에서도 빠르게 탐색할 수 있게 했습니다.
            </p>
          </div>
        </div>
      </section>

      <BannerAd label="Hero 아래 광고 영역" />

      <section>
        <SectionTitle>Blue Marina 포털</SectionTitle>
        <PortalSectionBlock section={learningCenter} />
      </section>

      <BannerAd label="학습센터 아래 광고 영역" />

      <PortalSectionBlock section={licenseCenter} />

      <BannerAd label="면허센터 아래 광고 영역" />

      <section className="grid gap-4 xl:grid-cols-2">
        <PortalSectionBlock section={facilityCenter} />
        <PortalSectionBlock section={practiceCenter} />
      </section>

      <PortalSectionBlock section={marineInfo} />

      <BannerAd label="해양정보 아래 광고 영역" />
      <BannerAd label="확장예정 서비스 위 광고 영역" />

      <PortalSectionBlock section={expansionServices} compact />

      <RoadmapPanel />
    </div>
  );
}
