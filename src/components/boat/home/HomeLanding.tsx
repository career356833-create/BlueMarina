import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";
import { MarineVideoHero } from "@/components/boat/home/MarineVideoHero";
import { PersonalizedHomeSection } from "@/components/boat/home/PersonalizedHomeSection";
import { platformServiceEntries } from "@/lib/platform/navigation";

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-[var(--bm-background)] text-[var(--bm-foreground)]" data-page-family="brand">
      <MarineVideoHero />

      <section id="home-services" className="border-y border-white/10 bg-[var(--bm-background)]" aria-label="서비스 바로가기">
        <div className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-12 lg:py-9">
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3">
            {platformServiceEntries.filter((item) => item.priority === "PRIMARY").map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex min-h-28 min-w-0 items-center justify-between gap-3 bg-[var(--bm-background)] px-4 py-5 transition hover:bg-[var(--bm-surface)] hover:text-[var(--bm-brand-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--bm-brand-accent)] sm:px-5 lg:min-h-32 lg:px-6"
              >
                <span className="min-w-0">
                  <span className="block font-serif text-lg text-[#f4f0e8] group-hover:text-[#f3d49a]">{item.title}</span>
                  <span className="mt-2 block break-keep text-xs leading-5 text-white/48">{item.description}</span>
                </span>
                <ArrowRight size={17} className="shrink-0 text-[var(--bm-brand-accent)]" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2">
            {platformServiceEntries.filter((item) => item.priority === "SECONDARY").map((item) => (
              <Link key={item.id} href={item.href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/68 transition hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]">
                {item.title}<ArrowRight size={15} className="text-[#d5b477]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PersonalizedHomeSection />

      <footer className="bg-[var(--bm-background)] px-5 pb-24 pt-9 text-center sm:px-8 lg:pb-9">
        <p className="text-[10px] tracking-[0.34em] text-[var(--bm-brand-accent)]">BLUE MARINA</p>
        <p className="mt-3 text-xs text-white/35">Marine · Fishing · Navigation</p>
      </footer>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
