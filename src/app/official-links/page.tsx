import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileQuestion,
  FileText,
  HelpCircle,
  IdCard,
  Megaphone,
  MonitorPlay,
  Sailboat,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PortalShell } from "@/components/boat/portal/PortalShell";

type OfficialItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
  status?: "verified" | "identity-required" | "checking";
};

type OfficialGroup = {
  title: string;
  description: string;
  guideHref?: string;
  guideLabel?: string;
  icon: LucideIcon;
  items: OfficialItem[];
};

const officialGroups: OfficialGroup[] = [
  {
    title: "시험 신청",
    description: "필기와 실기시험 접수 및 일정 확인으로 이어질 공식 메뉴입니다.",
    guideHref: "/exam-guide",
    guideLabel: "면허시험 안내 보기",
    icon: FileQuestion,
    items: [
      { title: "시험 일정 조회", icon: CalendarDays, url: "https://boat.kcg.go.kr/home/lcnsExpr/exprSchdulRcpt/exprRcpt1.do", status: "verified" },
      { title: "필기시험 접수", icon: FileText, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "실기시험 접수", icon: Sailboat, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "시험 접수 확인/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "시험면제신청", icon: BadgeCheck, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "응시표 출력", icon: FileText, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" }
    ]
  },
  {
    title: "수상안전교육",
    description: "교육 안내, 일정 확인, 접수, 이수 확인으로 이어질 공식 메뉴입니다.",
    guideHref: "/safety-guide",
    guideLabel: "수상안전교육 안내 보기",
    icon: ShieldCheck,
    items: [
      { title: "교육 안내/준비물", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/lcnsExpr/lcnsExprGdnc/infoView15.do", status: "verified" },
      { title: "수상안전교육 신청", icon: ShieldCheck, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "교육 일정 조회", icon: CalendarDays, url: "https://boat.kcg.go.kr/home/wtrcSafeEdu/eduSchdulRcpt/eduRcpt1.do", status: "verified" },
      { title: "교육 접수 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" },
      { title: "온라인 안전교육", icon: MonitorPlay, status: "checking" },
      { title: "교육 수료증 출력/이수 확인", icon: BadgeCheck, url: "https://boat.kcg.go.kr/home/common/cert_info.do", status: "identity-required" }
    ]
  },
  {
    title: "면허증",
    description: "면허발급 신청, 정보조회, 발급안내로 이어질 공식 메뉴입니다.",
    guideHref: "/license-issue",
    guideLabel: "면허증 발급 안내 보기",
    icon: IdCard,
    items: [
      { title: "면허증 발급 안내", icon: IdCard, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnseIssuInfo/infoView1.do", status: "verified" },
      { title: "면허증 갱신", icon: BadgeCheck, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnsIssuAply/lcnsUpdt1.do", status: "identity-required" },
      { title: "면허증 재발급", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnsIssuAply/lcnsIsgn2.do", status: "identity-required" },
      { title: "조종면허 증명서 발급", icon: FileText, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnsIssuAply/lcnsIssuance.do", status: "identity-required" },
      { title: "면허증 갱신 연기·사전", icon: CalendarDays, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnsIssuAply/updtPstpmnMvup1.do", status: "identity-required" },
      { title: "면허증 진위여부 조회", icon: CheckCircle2, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnsIssuAply/infoView1.do", status: "verified" },
      { title: "면허갱신 안내", icon: BadgeCheck, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnseIssuInfo/infoView2.do", status: "verified" },
      { title: "분실 등 면허증 재발급 안내", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/lcnsIssu/lcnseIssuInfo/infoView4.do", status: "verified" }
    ]
  },
  {
    title: "레저활동 신고",
    description: "수상레저활동 신고, 확인/변경/취소, 다이버 신고, 종사자 교육, 활동 안내로 이어질 공식 메뉴입니다.",
    guideHref: "/leisure-report",
    guideLabel: "레저활동 신고 안내 보기",
    icon: Megaphone,
    items: [
      { title: "원거리 수상레저활동 신고", icon: Megaphone, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/ldstcWtrlsrActDclr/infoIns2.do", status: "identity-required" },
      { title: "원거리 신고 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/ldstcWtrlsrActDclr/infoChg1.do", status: "identity-required" },
      { title: "근거리 수상레저활동 자율신고", icon: Sailboat, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/sdstcWtrlsrActDclr/infoIns2.do", status: "identity-required" },
      { title: "근거리 자율신고 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/sdstcWtrlsrActDclr/infoChg1.do", status: "identity-required" },
      { title: "기상특보 시 활동신고", icon: ShieldCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/weathrSpcnwsDclr/infoIns2.do", status: "identity-required" },
      { title: "기상특보신고 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/weathrSpcnwsDclr/infoChg1.do", status: "identity-required" },
      { title: "운항신고", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/wtrlsrNvgtDclr/infoIns2.do", status: "identity-required" },
      { title: "운항신고 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/wtrlsrNvgtDclr/infoChg1.do", status: "identity-required" },
      { title: "원거리 수중레저활동(다이버) 신고", icon: Megaphone, url: "https://boat.kcg.go.kr/home/urms/ldstcUnderWtrlsrActDclr/infoIns2.do", status: "identity-required" },
      { title: "다이버 신고 확인/변경/취소", icon: ClipboardCheck, url: "https://boat.kcg.go.kr/home/urms/ldstcUnderWtrlsrActDclr/infoChg1.do", status: "identity-required" },
      { title: "종사자 교육 신청 확인", icon: ShieldCheck, url: "https://boat.kcg.go.kr/home/grdr/grdrEdu/eduChgRtrcn1.do", status: "identity-required" },
      { title: "종사자 교육 수료증 출력", icon: BadgeCheck, url: "https://boat.kcg.go.kr/home/grdr/grdrEdu/infoView2.do", status: "verified" },
      { title: "원거리 수상레저활동 안내", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/ldstcWtrlsrActDclr/infoView1.do", status: "verified" },
      { title: "원거리 수중레저활동(다이버) 안내", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/urms/ldstcUnderWtrlsrActDclr/infoView1.do", status: "verified" },
      { title: "근거리 수상레저활동 안내", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/sdstcWtrlsrActDclr/infoView1.do", status: "verified" },
      { title: "기상특보중 수상레저활동 안내", icon: ShieldCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/weathrSpcnwsDclr/infoView1.do", status: "verified" },
      { title: "수상레저활동 금지구역", icon: ShieldCheck, url: "https://boat.kcg.go.kr/home/wtrlsrActInfo/ldstcWtrlsrActDclr/infoView2.do", status: "verified" },
      { title: "기구별 안전가이드", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/lcnsExpr/lcnsExprGdnc/infoView21.do", status: "verified" }
    ]
  },
  {
    title: "공식 안내",
    description: "공식 홈페이지, 문의처, 제도 변경 확인을 위한 외부 연결 예정 메뉴입니다.",
    icon: HelpCircle,
    items: [
      { title: "공식 홈페이지", icon: ExternalLink, url: "https://boat.kcg.go.kr/home/main.do", status: "verified" },
      { title: "공식 문의처", icon: HelpCircle, url: "https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView9.do", status: "verified" },
      { title: "제도 변경 확인", icon: CalendarDays, status: "checking" }
    ]
  }
];

function StatusBadge({ status }: { status: OfficialItem["status"] }) {
  if (status === "identity-required") {
    return <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">실명인증 필요</span>;
  }

  if (status === "checking") {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">URL 확인중</span>;
  }

  return <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">공식 URL 확인</span>;
}

function OfficialActionItem({ item }: { item: OfficialItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-950">{item.title}</p>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold leading-5 text-slate-500">
          {item.url ? "공식 사이트에서 열기" : "공식 홈페이지에서 확인"}
          {item.url ? <ExternalLink size={13} /> : null}
        </p>
      </div>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-sky-100 bg-slate-50 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50 sm:min-h-[84px] sm:p-4"
        aria-label={`${item.title} 공식 사이트에서 새창으로 열기`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="flex min-h-[76px] w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-left sm:min-h-[84px] sm:p-4"
      aria-label={`${item.title} URL 확인중`}
    >
      {content}
    </button>
  );
}

function OfficialGroupCard({ group }: { group: OfficialGroup }) {
  const Icon = group.icon;
  const visibleItems = group.items.slice(0, 6);
  const hiddenItems = group.items.slice(6);

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2D52] text-white">
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">{group.title}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{group.description}</p>
          </div>
        </div>

        {group.guideHref ? (
          <Link
            href={group.guideHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-200 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-50"
          >
            {group.guideLabel}
            <ArrowRight size={16} />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 sm:gap-3">
        {visibleItems.map((item) => (
          <OfficialActionItem key={`${group.title}-${item.title}`} item={item} />
        ))}
      </div>

      {hiddenItems.length > 0 ? (
        <details className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
          <summary className="cursor-pointer list-none text-sm font-black text-sky-800">
            추가 공식 메뉴 {hiddenItems.length}개 보기
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
            {hiddenItems.map((item) => (
              <OfficialActionItem key={`${group.title}-${item.title}`} item={item} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export default function OfficialLinksPage() {
  return (
    <PortalShell
      eyebrow="Blue Marina Official Link Center"
      title="공식 신청센터"
      description="시험 접수, 수상안전교육, 면허증, 레저활동 신고에 필요한 공식 메뉴를 목적별로 정리한 안내 허브입니다."
    >
      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">실제 신청은 공식 사이트에서만 가능합니다</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              공식 URL이 확인된 신청/조회 항목은 새창으로 연결됩니다. 실명인증이 필요한 메뉴는 공식 사이트 이동 후 본인확인 절차가 진행될 수 있습니다.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              시험 접수, 접수 확인/변경/취소, 시험면제신청, 응시표 출력은 같은 본인확인 페이지로 연결될 수 있으며 인증 후 공식 메뉴에서 진행합니다.
            </p>
          </div>
          <span className="w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">공식 URL 1차 연결</span>
        </div>
      </section>

      <div className="grid gap-4">
        {officialGroups.map((group) => (
          <OfficialGroupCard key={group.title} group={group} />
        ))}
      </div>
    </PortalShell>
  );
}
