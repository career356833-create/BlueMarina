"use client";

import Link from "next/link";
import { DetailFrame, StatusNotice } from "./PageFamilies";

export function PublicReadError({ href, label, retry }: { href: string; label: string; retry: () => void }) {
  return <DetailFrame width="reading"><section className="bm-detail-section my-6 space-y-5 p-6">
    <h1 className="text-2xl font-bold">{label} 정보를 불러오지 못했습니다</h1>
    <StatusNotice title="조회 실패" tone="warning">잠시 후 다시 시도해 주세요.</StatusNotice>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="bm-action px-5" onClick={retry}>다시 시도</button>
      <Link className="bm-action px-5" href={href}>{label} 목록</Link>
      <Link className="bm-action px-5" href="/">메인으로</Link>
    </div>
  </section></DetailFrame>;
}
