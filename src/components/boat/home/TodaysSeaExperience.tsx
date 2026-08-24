import Link from "next/link";
import { Anchor, ArrowRight, Compass } from "lucide-react";
import { SeaInterestCard } from "@/components/boat/home/SeaInterestCard";

export const TODAYS_SEA_VIDEO_PATH = "/media/blue-marina-todays-sea.mp4";

function TripBriefingCard() {
  return (
    <aside className="border border-white/20 bg-[#06111f]/72 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d5b477]">Trip briefing</p>
          <h2 className="mt-2 text-lg font-semibold">오늘의 출조 브리핑</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          조석 확인
        </span>
      </div>

      <dl className="divide-y divide-white/12 text-sm">
        <div className="grid grid-cols-[110px_1fr] gap-3 py-4">
          <dt className="text-white/55">최적 출항 시간</dt>
          <dd className="text-right font-medium text-white/90">관심 해역에서 확인</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 py-4">
          <dt className="text-white/55">주의 사항</dt>
          <dd className="text-right font-medium text-white/90">출항 전 공식 예보 확인</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 py-4">
          <dt className="text-white/55">추천 포인트</dt>
          <dd className="text-right font-medium text-white/90">공식 출조거점 탐색</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 py-4">
          <dt className="text-white/55">추천 서비스</dt>
          <dd className="text-right font-medium text-white/90">출조 안전 가이드</dd>
        </div>
      </dl>

      <Link
        href="/fishing-spots"
        className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-white/30 px-4 text-sm font-semibold text-white transition hover:border-[#d5b477] hover:text-[#f3d49a]"
      >
        상세 브리핑 보기
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}

type TodaysSeaExperienceProps = {
  showHeader?: boolean;
};

export function TodaysSeaExperience({ showHeader = true }: TodaysSeaExperienceProps) {
  return (
    <section
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-[#030b15] text-white"
      aria-labelledby="todays-sea-title"
    >
      <div className="absolute inset-0 -z-30 bg-[#030b15]" />
      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={TODAYS_SEA_VIDEO_PATH} type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,10,20,0.96)_0%,rgba(3,13,25,0.8)_36%,rgba(3,13,25,0.38)_70%,rgba(3,10,18,0.52)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,8,16,0.66)_0%,transparent_30%,rgba(2,8,16,0.32)_58%,rgba(2,8,16,0.94)_100%)]" />

      {showHeader ? (
        <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#050f19]/20 backdrop-blur-sm">
          <div className="mx-auto flex h-20 w-full max-w-[1540px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-3 text-[#f3ead9]">
              <Anchor size={25} strokeWidth={1.35} className="text-[#d5b477]" aria-hidden="true" />
              <div>
                <p className="font-serif text-[14px] tracking-[0.28em] sm:text-base">BLUE MARINA</p>
                <p className="mt-1 text-[9px] tracking-[0.2em] text-white/45">TODAY&apos;S SEA</p>
              </div>
            </Link>
            <Link
              href="/sea"
              className="inline-flex min-h-10 items-center gap-2 border border-white/20 px-3 text-xs font-semibold text-white/75 transition hover:border-[#d5b477] hover:text-[#f3d49a] sm:px-4"
            >
              <Compass size={16} aria-hidden="true" />
              바다 탐색
            </Link>
          </div>
        </header>
      ) : null}

      <div
        className={`relative z-10 mx-auto flex w-full max-w-[1540px] flex-1 flex-col justify-center px-5 pb-24 sm:px-8 sm:pb-28 lg:px-12 lg:pb-12 ${showHeader ? "pt-28 lg:pt-32" : "pt-20 lg:pt-24"}`}
      >
        <div className="grid items-end gap-6 xl:grid-cols-[0.72fr_1.28fr_0.82fr] xl:gap-0">
          <div className="pb-2 xl:pr-12">
            <div className="flex items-center gap-3 text-[#d5b477]">
              <Anchor size={19} strokeWidth={1.3} aria-hidden="true" />
              <p className="text-[11px] font-semibold tracking-[0.28em]">TODAY&apos;S SEA</p>
            </div>
            <div className="mt-5 h-px w-16 bg-[#d5b477]" />

            <h1
              id="todays-sea-title"
              className="mt-8 font-serif text-5xl font-normal leading-[1.12] text-[#f4f0e8] sm:text-6xl lg:text-7xl"
            >
              오늘의 바다를
              <br />
              읽다
            </h1>
            <p className="mt-6 max-w-sm text-sm font-medium leading-7 text-white/62 sm:text-base">
              변화하는 바다의 신호를 실시간으로 분석합니다.
              <br />
              조위 데이터로 안전한 출조를 계획하세요.
            </p>
            <Link
              href="/sea"
              className="mt-8 inline-flex items-center gap-4 border-b border-[#d5b477] pb-2 text-sm font-semibold text-[#e4c389] transition hover:text-[#fff0cf]"
            >
              바다 지도 보기
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <SeaInterestCard />
          <TripBriefingCard />
        </div>

        <div className="mt-8 hidden items-center justify-center border-t border-white/15 pt-7 text-center lg:flex">
          <div>
            <p className="text-xs tracking-[0.28em] text-[#d5b477]">데이터가 만든 안전, 경험이 만든 가치</p>
            <p className="mt-3 font-serif text-[11px] tracking-[0.42em] text-white/65">BLUE MARINA</p>
          </div>
        </div>
      </div>
    </section>
  );
}
