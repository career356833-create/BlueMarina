import Link from "next/link";
import { ParticipationLink } from "@/components/account/ParticipationLink";
import { canonicalMetadata } from "@/lib/release/site-url";
import { Anchor, Fish, Map, Search, SlidersHorizontal } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { EmptyState, PageHero } from "@/components/platform/DesignSystem";
import { productionCharterDataset } from "@/lib/charters/registry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...canonicalMetadata("/charters"),
  title: "출조 찾기",
  description: "공식 출처가 확인된 출조 정보만 안내하는 Blue Marina 출조 정보 서비스입니다."
};

const relatedServices = [
  { href: "/fishing-spots", label: "낚시 포인트", icon: Anchor },
  { href: "/fishing-spots/conditions", label: "어종·환경 조건", icon: SlidersHorizontal },
  { href: "/fish", label: "어종 도감", icon: Fish },
  { href: "/sea", label: "바다 지도", icon: Map }
] as const;

export default function ChartersPage() {
  return (
    <AppFrame family="discovery">
      <section className="mx-auto max-w-5xl space-y-6 py-5 sm:py-8">
        <PageHero eyebrow="Charter discovery" title="출조를 정직하게 찾다" description="검증된 선사·선박·출항 정보가 등록되면 출조 조건과 공식 문의 경로를 안내합니다. 실시간 좌석이나 예약 확정 기능은 제공하지 않습니다." />

        {productionCharterDataset.charters.length === 0 ? (
          <EmptyState icon={<Search size={28} aria-hidden="true" />} title="등록된 출조 정보가 없습니다" description="공식 출처가 확인된 출조 정보만 표시합니다. 현재 공개 출조 0건입니다. 업체는 기존 전화·공식 예약 링크와 상품 정보를 제출할 수 있습니다. 관리자 검토와 별도 게시 절차를 거치며 자동 게시되지 않습니다.">
            <div className="mt-5 flex flex-wrap justify-center gap-3"><ParticipationLink href="/charters/onboarding" className="bm-action px-5">출조상품 등록</ParticipationLink><Link href="/charters/partners" className="bm-action-secondary px-5">업체 등록 절차 보기</Link></div><p className="mt-3 text-sm">로그인 후 제출을 이어갑니다. 출조를 찾는 분은 아래 포인트·바다 정보를 살펴보세요.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedServices.map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="bm-action-secondary gap-2 px-4 text-sm transition hover:border-marine-accent"><Icon size={17} />{item.label}</Link>;
              })}
            </div>
            <Link href="/charters/partners" className="mt-5 inline-flex min-h-11 items-center px-3 text-sm font-semibold text-marine-accent underline underline-offset-4">업체용 출조 정보 등록 안내</Link>
          </EmptyState>
        ) : null}
      </section>
    </AppFrame>
  );
}
