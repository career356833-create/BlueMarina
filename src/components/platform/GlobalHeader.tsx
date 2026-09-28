"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Anchor, ArrowLeft, Compass, UserRound } from "lucide-react";
import { PlatformDesktopNav } from "@/components/platform/PlatformDesktopNav";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname !== "/";

  function goBack() {
    // Next's index counts in-app transitions. A direct entry falls back to its parent page.
    if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
      router.back();
      return;
    }
    const parent = pathname.split("/").filter(Boolean).slice(0, -1).join("/");
    router.push(parent ? `/${parent}` : "/");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[110] border-b border-white/10 bg-[#050f19]/90 text-[#f4f0e8] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1540px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-[#f3ead9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]" aria-label="Blue Marina 홈">
          <Anchor size={27} strokeWidth={1.35} className="shrink-0 text-[#d5b477]" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-serif text-[15px] tracking-[0.28em] sm:text-base">BLUE MARINA</span>
            <span className="mt-1 hidden text-[9px] tracking-[0.2em] text-white/45 sm:block">MARINE · FISHING · NAVIGATION</span>
          </span>
        </Link>

        <PlatformDesktopNav />

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {showBack ? (
            <button type="button" onClick={goBack} className="inline-flex size-11 items-center justify-center border border-white/20 text-white/80 transition hover:border-[#d5b477] hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b477]" aria-label="이전 화면으로">
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          ) : (
            <Link href="/sea" className="inline-flex size-11 items-center justify-center border border-white/20 text-white/80 transition hover:border-[#d5b477] hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b477] lg:hidden" aria-label="바다 지도">
              <Compass size={19} aria-hidden="true" />
            </Link>
          )}
          <Link href="/account" className="inline-flex size-11 items-center justify-center text-white/80 transition hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b477]" aria-label="내 계정">
            <UserRound size={20} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
