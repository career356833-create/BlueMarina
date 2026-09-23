import Link from "next/link";
import { Anchor, Fish, Map, Search, SlidersHorizontal } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { productionCharterDataset } from "@/lib/charters/registry";

const relatedServices = [
  { href: "/fishing-spots", label: "낚시 포인트", icon: Anchor },
  { href: "/fishing-spots/conditions", label: "어종·환경 조건", icon: SlidersHorizontal },
  { href: "/fish", label: "어종 도감", icon: Fish },
  { href: "/sea", label: "바다 지도", icon: Map }
] as const;

export default function ChartersPage() {
  return (
    <AppFrame>
      <section className="mx-auto max-w-5xl py-5 sm:py-10">
        <p className="flex items-center gap-2 text-xs font-black tracking-[.2em] text-[#79C9D6]"><Anchor size={15} /> CHARTER DISCOVERY</p>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">출조를 정직하게 찾다</h1>
        <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-[#B8CBDD]">검증된 선사·선박·출항 정보가 등록되면 출조 조건과 공식 문의 경로를 안내합니다. 실시간 좌석이나 예약 확정 기능은 제공하지 않습니다.</p>

        {productionCharterDataset.charters.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-[#29465D] bg-[#071827] p-8 text-center sm:p-12">
            <Search className="mx-auto text-[#79C9D6]" />
            <h2 className="mt-4 text-xl font-black">등록된 출조 정보가 없습니다</h2>
            <p className="mt-2 text-sm font-semibold text-[#9FB3C8]">공식 출처가 확인된 출조 정보만 표시합니다. 포인트와 바다 조건을 먼저 살펴볼 수 있습니다.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedServices.map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#29465D] bg-[#0B2235] px-4 text-sm font-black text-[#D7E4F6] transition hover:border-[#79C9D6]/60"><Icon size={17} />{item.label}</Link>;
              })}
            </div>
            <Link href="/charters/onboarding" className="mt-5 inline-flex min-h-11 items-center px-3 text-xs font-bold text-[#79C9D6] underline decoration-[#79C9D6]/35 underline-offset-4">업체용 출조 정보 등록 안내</Link>
          </div>
        ) : null}
      </section>
    </AppFrame>
  );
}
