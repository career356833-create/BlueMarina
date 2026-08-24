import Image from "next/image";
import Link from "next/link";
import { Anchor, ArrowRight, Fish, Thermometer } from "lucide-react";

const fishingHighlights = [
  {
    eyebrow: "어종 탐색",
    label: "참돔",
    detail: "어종 정보 확인",
    icon: Fish
  },
  {
    eyebrow: "포인트 예시",
    label: "통영 매물도",
    detail: "출조 전 현장 확인",
    icon: Anchor
  },
  {
    eyebrow: "수온",
    label: "--°C",
    detail: "실시간 연동 전",
    icon: Thermometer
  }
] as const;

export function FishingExperienceSection() {
  return (
    <section
      id="fishing-experience"
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-[#050f19] text-[#f4f0e8] lg:min-h-[850px]"
      aria-labelledby="fishing-experience-title"
    >
      <Image
        src="/media/blue-marina-fishing-experience.png"
        alt="해 뜨는 바다에서 선상 낚시를 즐기는 두 사람"
        fill
        sizes="100vw"
        className="-z-30 object-cover object-[66%_center] sm:object-[62%_center] lg:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[#03101b]/18" />
      <div className="absolute inset-0 -z-10 [background-image:linear-gradient(90deg,rgba(3,12,23,0.97)_0%,rgba(3,12,23,0.88)_29%,rgba(3,12,23,0.38)_53%,rgba(3,12,23,0.08)_76%),linear-gradient(180deg,rgba(3,10,18,0.36)_0%,rgba(3,10,18,0.04)_48%,rgba(3,10,18,0.78)_100%)] max-lg:[background-image:linear-gradient(90deg,rgba(3,12,23,0.94)_0%,rgba(3,12,23,0.62)_62%,rgba(3,12,23,0.2)_100%),linear-gradient(180deg,rgba(3,10,18,0.35)_0%,rgba(3,10,18,0.18)_45%,rgba(3,10,18,0.88)_100%)]" />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1540px] flex-col justify-center px-5 pb-24 pt-20 sm:px-8 lg:min-h-[850px] lg:px-12 lg:py-24">
        <div className="relative z-10 max-w-xl lg:w-[40%]">
          <div className="flex items-center gap-4 text-[#d5b477]">
            <span className="h-px w-12 bg-current" />
            <p className="text-[11px] font-semibold tracking-[0.28em]">FISHING EXPERIENCE</p>
          </div>

          <h2
            id="fishing-experience-title"
            className="mt-8 font-serif text-[38px] font-normal leading-[1.18] text-[#f5efe4] sm:text-6xl lg:text-7xl"
          >
            <span className="block whitespace-nowrap">오늘 바다에서</span>
            <span className="block whitespace-nowrap">무엇을 만날까요</span>
          </h2>

          <p className="mt-7 max-w-md text-base leading-8 text-white/68 sm:text-lg">
            실제 조황, 추천 어종,
            <br />
            출조 포인트를 확인하고
            <br />
            오늘의 낚시를 시작하세요.
          </p>

          <Link
            href="/fishing-spots"
            className="mt-9 inline-flex min-h-12 items-center gap-5 border border-[#e2bd7d]/65 bg-[#e8c58a] px-6 text-sm font-semibold text-[#07111b] shadow-[0_16px_42px_rgba(0,0,0,0.24)] transition hover:bg-[#f0d39f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0d39f]"
          >
            오늘 조황 보기
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        {/* Future: bind verified catch, FishSpecies, fishingSpot and marine data here. */}
        <div className="relative z-10 mt-12 grid grid-cols-2 gap-2 sm:max-w-xl sm:gap-3 lg:absolute lg:right-12 lg:top-1/2 lg:mt-0 lg:w-[250px] lg:-translate-y-1/2 lg:grid-cols-1 lg:gap-4">
          {fishingHighlights.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.eyebrow}
                className={`border border-white/18 bg-[#06111d]/82 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5 ${index === 2 ? "col-span-2 lg:col-span-1" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 shrink-0 text-[#e2bd7d]" size={20} strokeWidth={1.45} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold tracking-[0.18em] text-[#d5b477]">{item.eyebrow}</p>
                    <p className="mt-2 font-serif text-xl text-[#f4f0e8]">{item.label}</p>
                    <p className="mt-1 text-[11px] text-white/48">{item.detail}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
