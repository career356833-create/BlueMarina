import Image from "next/image";
import Link from "next/link";
import { Anchor, ArrowRight, Fish } from "lucide-react";
import { fishingSpots } from "@/data/fishing-spots";
import { getFishingConditionProfileSpecies } from "@/lib/fishing-condition/profile-registry";
import { buildFishingJourneyConditionsHref } from "@/lib/fishing-spots/journey";
import { FishingWaterTemperatureCard } from "./FishingWaterTemperatureCard";

// This is an editorial choice among source-backed records, not a live catch or suitability ranking.
const featuredSpot = fishingSpots.find((spot) =>
  spot.city === "통영시" && spot.name.includes("매물도")
  && spot.sourceType === "MOF_SHARED_BOAT_FISHING_POINT" && spot.sourceUrl && spot.targetFish
);
const conditionSpecies = getFishingConditionProfileSpecies();
const featuredSpecies = featuredSpot?.targetFish.split("|")
  .map((name) => conditionSpecies.find((species) => species.name === name.trim()))
  .find((species) => species !== undefined);

const fishingHighlights = [
  ...(featuredSpecies ? [{ eyebrow: "원본 대상어", label: featuredSpecies.name, detail: "어종 환경 근거 보기", href: buildFishingJourneyConditionsHref({ spotId: featuredSpot?.id, speciesId: featuredSpecies.id, source: "fishing-spots" }), icon: Fish }] : []),
  ...(featuredSpot ? [{ eyebrow: "공식 포인트", label: featuredSpot.name, detail: "출조 전 현장 확인", href: `/fishing-spots/${encodeURIComponent(featuredSpot.id)}`, icon: Anchor }] : []),
];

export function FishingExperienceSection() {
  return (
    <section
      id="fishing-experience"
      className="relative isolate flex min-h-[590px] overflow-hidden bg-[#050f19] text-[#f4f0e8] lg:min-h-[660px]"
      aria-labelledby="fishing-experience-title"
    >
      <Image
        src="/media/blue-marina-fishing-experience.png"
        alt="해 뜨는 바다에서 선상 낚시를 즐기는 두 사람"
        fill
        priority
        sizes="100vw"
        className="-z-30 object-cover object-[66%_center] sm:object-[62%_center] lg:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[#03101b]/18" />
      <div className="absolute inset-0 -z-10 [background-image:linear-gradient(90deg,rgba(3,12,23,0.97)_0%,rgba(3,12,23,0.88)_29%,rgba(3,12,23,0.38)_53%,rgba(3,12,23,0.08)_76%),linear-gradient(180deg,rgba(3,10,18,0.36)_0%,rgba(3,10,18,0.04)_48%,rgba(3,10,18,0.78)_100%)] max-lg:[background-image:linear-gradient(90deg,rgba(3,12,23,0.94)_0%,rgba(3,12,23,0.62)_62%,rgba(3,12,23,0.2)_100%),linear-gradient(180deg,rgba(3,10,18,0.35)_0%,rgba(3,10,18,0.18)_45%,rgba(3,10,18,0.88)_100%)]" />

      <div className="mx-auto flex min-h-[590px] w-full max-w-[1540px] flex-col justify-center px-5 pb-20 pt-14 sm:px-8 lg:min-h-[660px] lg:px-12 lg:py-20">
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
            공식 포인트 원본과 대상어 자료,
            <br />
            관측소별 수온을 확인하고
            <br />
            오늘의 낚시를 시작하세요.
          </p>

          <Link
            href="#fishing-spot-results"
            className="mt-9 inline-flex min-h-12 items-center gap-5 border border-[#e2bd7d]/65 bg-[#e8c58a] px-6 text-sm font-semibold text-[#07111b] shadow-[0_16px_42px_rgba(0,0,0,0.24)] transition hover:bg-[#f0d39f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0d39f]"
          >
            낚시 포인트 보기
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-2 gap-2 sm:max-w-xl sm:gap-3 lg:absolute lg:right-12 lg:top-1/2 lg:mt-0 lg:w-[250px] lg:-translate-y-1/2 lg:grid-cols-1 lg:gap-4">
          {fishingHighlights.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.eyebrow}
                href={item.href}
                className="min-h-28 border border-white/18 bg-[#06111d]/82 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-[#e2bd7d]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2bd7d] sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 shrink-0 text-[#e2bd7d]" size={20} strokeWidth={1.45} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold tracking-[0.18em] text-[#d5b477]">{item.eyebrow}</p>
                    <p className="mt-2 break-all font-serif text-sm leading-snug text-[#f4f0e8] sm:text-lg">{item.label}</p>
                    <p className="mt-1 text-[11px] text-white/48">{item.detail}</p>
                  </div>
                </div>
              </Link>
            );
          })}
          <FishingWaterTemperatureCard />
        </div>
      </div>
    </section>
  );
}
