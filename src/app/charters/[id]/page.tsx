import { notFound } from "next/navigation";
import Link from "next/link";
import { DetailFrame, DetailBackLink } from "@/components/platform/PageFamilies";
import { AccountSaveButton } from "@/components/account/AccountSaveButton";
import { RecentlyViewedTracker } from "@/components/account/RecentlyViewedTracker";
import { charterAvailabilityLabel, charterPriceLabel, getCharter } from "@/lib/charters/registry";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "출조 정보", robots: { index: false, follow: false } };
export default async function CharterDetail({ params }: { params: Promise<{ id: string }> }) {
  const charter = getCharter((await params).id);
  if (!charter) notFound();
  const href = `/charters/${encodeURIComponent(charter.id)}`;
  return <DetailFrame width="reading">
    <RecentlyViewedTracker item={{ entityType: "CHARTER", entityId: charter.id, label: charter.title, href }} />
    <article className="space-y-5 py-5 sm:py-10">
      <DetailBackLink href="/charters">출조 목록</DetailBackLink>
      <header className="bm-detail-section p-6 sm:p-8">
        <p className="bm-eyebrow">Charter detail</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">{charter.title}</h1>
        <p className="bm-lede mt-4">{charter.description ?? "상세 설명은 공식 출처 확인 후 제공됩니다."}</p>
        <div className="mt-5"><AccountSaveButton entityType="CHARTER" entityId={charter.id} label={charter.title} href={href} /></div>
      </header>
      <section className="bm-detail-section p-6 sm:p-8">
        <h2 className="text-xl">상품 정보</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--bm-foreground-muted)]">가격</dt><dd className="mt-1 font-bold">{charterPriceLabel(charter.price)}</dd></div>
          <div><dt className="text-[var(--bm-foreground-muted)]">예약 상태</dt><dd className="mt-1 font-bold">{charterAvailabilityLabel(charter.status)}</dd></div>
          <div><dt className="text-[var(--bm-foreground-muted)]">잔여석</dt><dd className="mt-1 font-bold">잔여석 확인 필요</dd></div>
          <div><dt className="text-[var(--bm-foreground-muted)]">문의</dt><dd className="mt-1 font-bold">공식 연락처 확인 필요</dd></div>
        </dl>
      </section>
      <Link href="/reservations" className="bm-action-secondary px-5">예약·문의 안내</Link>
    </article>
  </DetailFrame>;
}
