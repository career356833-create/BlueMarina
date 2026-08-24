import Link from "next/link";
import { Anchor, ArrowDown, ArrowRight, MapPin, Navigation } from "lucide-react";

const marinePlaces = [
  {
    eyebrow: "출조 포인트",
    name: "거제 구조라",
    detail: "Geoje · Fishing spot",
    icon: MapPin,
    position: "lg:left-[8%] lg:top-[17%]"
  },
  {
    eyebrow: "추천 항구",
    name: "통영 욕지도",
    detail: "Tongyeong · Harbor",
    icon: Navigation,
    position: "lg:right-[1%] lg:top-[40%]"
  },
  {
    eyebrow: "마리나",
    name: "부산 수영만",
    detail: "Busan · Marina",
    icon: Anchor,
    position: "lg:bottom-[2%] lg:left-[22%]"
  }
] as const;

type ExploreSeaSectionProps = {
  ctaHref?: string;
  ctaLabel?: string;
  ctaDirection?: "right" | "down";
};

export function ExploreSeaSection({
  ctaHref = "/sea",
  ctaLabel = "바다 지도 보기",
  ctaDirection = "right"
}: ExploreSeaSectionProps) {
  const ctaClassName =
    "mt-10 inline-flex min-h-11 items-center gap-5 border-b border-[#d5b477] pb-2 text-sm font-semibold text-[#e4c389] transition hover:text-[#fff0cf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]";
  const ctaContent = (
    <>
      {ctaLabel}
      {ctaDirection === "down" ? (
        <ArrowDown size={17} aria-hidden="true" />
      ) : (
        <ArrowRight size={17} aria-hidden="true" />
      )}
    </>
  );

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#050f19] text-[#f4f0e8] lg:min-h-[850px]"
      aria-labelledby="explore-sea-title"
    >
      <video
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/media/blue-marina-explore-sea.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-20 bg-[#050f19]/45" />
      <div className="absolute inset-0 -z-10 opacity-95 [background-image:radial-gradient(circle_at_73%_45%,rgba(7,24,39,0.12),rgba(5,15,25,0.46)_58%),linear-gradient(90deg,rgba(5,15,25,0.92)_0%,rgba(5,15,25,0.65)_40%,rgba(5,15,25,0.28)_76%,rgba(5,15,25,0.5)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1540px] items-center gap-16 px-5 py-24 sm:px-8 lg:min-h-[850px] lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-12 lg:py-28">
        <div className="relative z-10 max-w-xl lg:pb-10">
          <div className="flex items-center gap-4 text-[#d5b477]">
            <span className="h-px w-12 bg-current" />
            <p className="text-[11px] font-semibold tracking-[0.28em]">EXPLORE THE SEA</p>
          </div>

          <h2
            id="explore-sea-title"
            className="mt-8 font-serif text-5xl font-normal leading-[1.12] text-[#f4f0e8] sm:text-6xl lg:text-7xl"
          >
            바다가 알려주는
            <br />
            새로운 항해
          </h2>

          <p className="mt-7 max-w-md text-base leading-8 text-white/62 sm:text-lg">
            출조 포인트, 어항, 마리나,
            <br className="hidden sm:block" />
            그리고 당신이 찾는 바다를 연결합니다.
          </p>

          {ctaHref.startsWith("#") ? (
            <a href={ctaHref} className={ctaClassName}>
              {ctaContent}
            </a>
          ) : (
            <Link href={ctaHref} className={ctaClassName}>
              {ctaContent}
            </Link>
          )}

          <div className="mt-20 hidden items-center gap-6 text-[10px] tracking-[0.2em] text-white/35 lg:flex">
            <span>34° 48&apos; N</span>
            <span className="h-px w-16 bg-white/20" />
            <span>128° 26&apos; E</span>
          </div>
        </div>

        <div className="relative w-full lg:min-h-[680px]" aria-label="남해안 탐색 지도 미리보기">
          <div className="relative h-[420px] border-y border-white/10 bg-[#071522]/45 backdrop-blur-[2px] sm:border sm:border-white/10 lg:absolute lg:inset-0 lg:h-auto">
            <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:72px_72px]" />
            <div className="absolute left-5 top-5 flex items-center gap-3 text-[10px] tracking-[0.2em] text-white/40 sm:left-8 sm:top-8">
              <Navigation size={14} strokeWidth={1.4} aria-hidden="true" />
              SOUTH COAST · KOREA
            </div>

            <svg
              viewBox="0 0 800 660"
              className="absolute inset-0 h-full w-full"
              fill="none"
              role="img"
              aria-label="남해안 해안선과 항로를 표현한 차트"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M30 188C94 169 121 204 169 194C222 183 226 130 280 126C340 122 370 174 421 157C470 141 469 91 520 83C573 75 604 126 648 118C695 110 717 71 782 65"
                stroke="rgba(226,213,184,0.7)"
                strokeWidth="2"
              />
              <path
                d="M33 215C92 195 128 229 178 218C233 206 242 158 294 152C350 145 382 197 435 181C489 164 486 119 537 108C595 95 616 151 666 140C711 130 737 97 790 91"
                stroke="rgba(213,180,119,0.18)"
                strokeWidth="1"
              />
              <path
                d="M117 544C208 504 227 418 322 384C415 351 475 376 566 307C622 265 656 216 701 183"
                stroke="rgba(213,180,119,0.9)"
                strokeWidth="2"
                strokeDasharray="7 12"
              />
              <path
                d="M117 544C208 504 227 418 322 384C415 351 475 376 566 307C622 265 656 216 701 183"
                stroke="rgba(213,180,119,0.12)"
                strokeWidth="12"
              />
              <g fill="rgba(5,15,25,0.95)" stroke="rgba(226,213,184,0.82)" strokeWidth="2">
                <circle cx="117" cy="544" r="7" />
                <circle cx="322" cy="384" r="7" />
                <circle cx="566" cy="307" r="7" />
                <circle cx="701" cy="183" r="7" />
              </g>
              <g fill="rgba(244,240,232,0.38)" fontFamily="serif" fontSize="13" letterSpacing="2">
                <text x="70" y="603">42 M</text>
                <text x="352" y="430">18 M</text>
                <text x="598" y="354">27 M</text>
                <text x="693" y="238">HARBOR</text>
              </g>
            </svg>

            <div className="absolute bottom-5 right-5 text-right text-[9px] leading-5 tracking-[0.16em] text-white/28 sm:bottom-8 sm:right-8">
              COASTAL EXPLORATION CHART
              <br />
              VISUAL PREVIEW · NOT FOR NAVIGATION
            </div>
          </div>

          {/* Future: bind these presentation cards to MarinePlace and fishingSpot data. */}
          <div className="relative z-10 mt-4 grid gap-3 lg:mt-0 lg:block">
            {marinePlaces.map((place, index) => {
              const Icon = place.icon;

              return (
                <article
                  key={place.name}
                  className={`relative w-full border border-white/15 bg-[#071522]/88 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-5 lg:absolute lg:w-[min(245px,72vw)] ${place.position}`}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#d5b477]/45 text-[#d5b477]">
                      <Icon size={17} strokeWidth={1.45} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold tracking-[0.22em] text-[#d5b477]">{place.eyebrow}</p>
                      <h3 className="mt-2 text-base font-medium text-[#f4f0e8]">{place.name}</h3>
                      <p className="mt-1 text-[10px] tracking-[0.08em] text-white/40">{place.detail}</p>
                    </div>
                    <span className="ml-auto font-serif text-[10px] text-white/28">0{index + 1}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
