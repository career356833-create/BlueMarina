import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";
import { MarineVideoHero } from "@/components/boat/home/MarineVideoHero";

const serviceLinks = [
  { href: "/today-sea", label: "오늘의 바다", description: "물때와 해양 기상" },
  { href: "/sea", label: "바다 지도", description: "해역과 거점 탐색" },
  { href: "/fishing-spots", label: "낚시 포인트", description: "출조 지역 검색" },
  { href: "/fish", label: "어종 도감", description: "어종 정보와 기록" }
] as const;

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-[#030b15] text-white">
      <MarineVideoHero />

      <section id="home-services" className="border-y border-white/10 bg-[#050f19]" aria-label="서비스 바로가기">
        <div className="mx-auto grid w-full max-w-[1540px] grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
          {serviceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-24 items-center justify-between gap-3 border-white/10 px-3 py-5 transition odd:border-r [&:nth-child(-n+2)]:border-b hover:text-[#f3d49a] sm:px-5 lg:min-h-28 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            >
              <span>
                <span className="font-serif text-lg text-[#f4f0e8] group-hover:text-[#f3d49a]">{item.label}</span>
                <span className="mt-2 block text-xs text-white/42">{item.description}</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[#d5b477]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="bg-[#030b15] px-5 pb-24 pt-9 text-center sm:px-8 lg:pb-9">
        <p className="text-[10px] tracking-[0.34em] text-[#d5b477]">BLUE MARINA</p>
        <p className="mt-3 text-xs text-white/35">Marine · Fishing · Navigation</p>
      </footer>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
