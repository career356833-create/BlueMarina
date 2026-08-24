import Link from "next/link";
import { Anchor, ArrowDown, ArrowRight, Compass } from "lucide-react";

export const MARINE_HERO_VIDEO_PATH = "/media/blue-marina-marina-hero.mp4";

const desktopNav = [
  { href: "/sea", label: "Sea" },
  { href: "/fish", label: "Fish" },
  { href: "/fishing-spots", label: "Spots" },
  { href: "/license-guide", label: "Guide" },
  { href: "/license-guide", label: "My" }
] as const;

export function MarineVideoHero() {
  return (
    <section
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-[#050f19] text-[#f4f0e8] lg:min-h-[850px]"
      aria-labelledby="marine-hero-title"
    >
      <div className="absolute inset-0 -z-30 bg-[#050f19]" />
      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[52%_center] motion-reduce:hidden md:object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={MARINE_HERO_VIDEO_PATH} type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,15,25,0.94)_0%,rgba(5,15,25,0.68)_42%,rgba(5,15,25,0.2)_78%,rgba(5,15,25,0.12)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(3,10,18,0.48)_0%,transparent_34%,rgba(3,10,18,0.18)_60%,rgba(3,10,18,0.84)_100%)]" />

      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#050f19]/10 backdrop-blur-[2px]">
        <div className="mx-auto flex h-20 w-full max-w-[1540px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3 text-[#f3ead9]">
            <Anchor size={27} strokeWidth={1.35} className="text-[#d5b477]" aria-hidden="true" />
            <div>
              <p className="font-serif text-[15px] tracking-[0.28em] sm:text-base">BLUE MARINA</p>
              <p className="mt-1 text-[9px] tracking-[0.2em] text-white/45">MARINE · FISHING · NAVIGATION</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="주요 메뉴">
            {desktopNav.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="text-sm font-medium tracking-[0.08em] text-white/70 transition hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/sea"
            className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white/80 backdrop-blur-sm lg:hidden"
            aria-label="바다 지도"
          >
            <Compass size={19} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1540px] flex-1 items-center px-5 pb-24 pt-28 sm:px-8 sm:pt-32 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold tracking-[0.28em] text-[#d5b477] sm:text-[11px]">
            SEA · FISHING · NAVIGATION
          </p>
          <div className="mt-5 h-px w-16 bg-[#d5b477]" />

          <h1
            id="marine-hero-title"
            className="mt-8 font-serif text-5xl font-normal leading-[1.1] text-[#f4f0e8] sm:text-6xl lg:text-7xl xl:text-8xl"
          >
            바다를 읽고,
            <br />
            더 멀리 나아가다.
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-7 text-white/68 sm:text-lg sm:leading-8">
            오늘의 바다부터 출조, 어종, 항해까지{" "}
            <br className="hidden sm:block" />
            Blue Marina에서 하나로 연결합니다.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/today-sea"
              className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#f1eadc] px-6 text-sm font-semibold text-[#07121d] shadow-[0_16px_50px_rgba(0,0,0,0.25)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1eadc]"
            >
              오늘의 바다
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/sea"
              className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/35 bg-[#071827]/25 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#d5b477] hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]"
            >
              바다 탐색
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <a
        href="#home-services"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[9px] tracking-[0.24em] text-white/45 transition hover:text-[#e4c389] sm:flex"
        aria-label="서비스 바로가기 보기"
      >
        SCROLL TO DISCOVER
        <ArrowDown size={16} strokeWidth={1.2} aria-hidden="true" />
      </a>
    </section>
  );
}
