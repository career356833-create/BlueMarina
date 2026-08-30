"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Fish, Waves } from "lucide-react";
import { fishCategories, fishItems } from "@/data/fish-data";

const featuredFishNames = ["참돔", "갈치", "문어", "우럭", "광어"] as const;

function getFeaturedFish() {
  return featuredFishNames
    .map((name) => fishItems.find((item) => item.name === name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function FishEncyclopediaSection() {
  const featuredFish = useMemo(() => getFeaturedFish(), []);
  const [activeFishId, setActiveFishId] = useState(featuredFish[0]?.id ?? "");
  const activeFish = featuredFish.find((item) => item.id === activeFishId) ?? featuredFish[0];

  return (
    <section
      id="fish-encyclopedia"
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#03101b] text-[#f4f0e8] lg:min-h-[850px]"
      aria-labelledby="fish-encyclopedia-title"
    >
      <Image
        src="/media/blue-marina-fish-encyclopedia.png"
        alt="깊은 바다 암초 사이를 유영하는 참돔과 한국 연안 어종"
        fill
        sizes="100vw"
        className="-z-30 object-cover object-[62%_center] sm:object-[66%_center] lg:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[#03101b]/22" />
      <div className="absolute inset-0 -z-10 [background-image:linear-gradient(90deg,rgba(3,12,23,0.97)_0%,rgba(3,12,23,0.88)_34%,rgba(3,12,23,0.38)_62%,rgba(3,12,23,0.16)_100%),linear-gradient(180deg,rgba(3,10,18,0.28)_0%,rgba(3,10,18,0.02)_44%,rgba(3,10,18,0.82)_100%)] max-lg:[background-image:linear-gradient(90deg,rgba(3,12,23,0.95)_0%,rgba(3,12,23,0.7)_66%,rgba(3,12,23,0.38)_100%),linear-gradient(180deg,rgba(3,10,18,0.28)_0%,rgba(3,10,18,0.22)_42%,rgba(3,10,18,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1540px] items-center gap-10 px-5 pb-24 pt-20 sm:px-8 lg:min-h-[850px] lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:px-12 lg:py-24">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-4 text-[#d5b477]">
            <span className="h-px w-12 bg-current" />
            <p className="text-[11px] font-semibold tracking-[0.28em]">FISH ENCYCLOPEDIA</p>
          </div>

          <h2
            id="fish-encyclopedia-title"
            className="mt-8 font-serif text-[40px] font-normal leading-[1.16] text-[#f5efe4] sm:text-6xl lg:text-7xl"
          >
            바다의 생물을
            <br />
            발견하다
          </h2>

          <p className="mt-7 max-w-md text-base leading-8 text-white/68 sm:text-lg">
            우리 바다에 사는 다양한 어종의 특징과
            <br className="hidden sm:block" />
            서식지, 시즌 정보를 확인하세요.
          </p>

          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Link
              href="/fish"
              className="inline-flex min-h-12 items-center gap-5 border border-[#e2bd7d]/62 bg-[#e8c58a] px-6 text-sm font-semibold text-[#07111b] shadow-[0_16px_42px_rgba(0,0,0,0.24)] transition hover:bg-[#f0d39f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0d39f]"
            >
              어종 도감으로 이동
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/fish"
              className="inline-flex min-h-10 items-center border-b border-[#d5b477]/65 pb-1 text-sm font-semibold text-[#e4c389] transition hover:text-[#fff0cf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477]"
            >
              내가 만난 어종 기록하기
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-8 border-y border-white/10 py-5 text-sm text-white/56">
            <div>
              <p className="font-serif text-3xl text-[#f4f0e8]">{fishItems.length}</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">LOCAL FISH ITEMS</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-[#f4f0e8]">{fishCategories.length}</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">CATEGORIES</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[430px] flex-col justify-end lg:min-h-[680px]">
          <div className="ml-auto w-full max-w-[390px] border border-white/16 bg-[#06111d]/76 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d5b477]">BLUE MARINA SPECIES INDEX</p>
              <Fish size={19} className="shrink-0 text-[#e2bd7d]" strokeWidth={1.35} aria-hidden="true" />
            </div>

            {activeFish ? (
              <div className="mt-7 motion-safe:transition-opacity motion-safe:duration-300">
                <p className="text-xs font-semibold text-white/45">대표 어종</p>
                <h3 className="mt-2 font-serif text-4xl text-[#f5efe4]">{activeFish.name}</h3>
                <p className="mt-2 text-sm text-white/45">Scientific name · 공식 정보 없음</p>

                <dl className="mt-7 grid gap-4 border-y border-white/10 py-5">
                  <div>
                    <dt className="text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">서식지</dt>
                    <dd className="mt-1 text-sm leading-6 text-white/76">{activeFish.habitat}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">주요 시즌</dt>
                      <dd className="mt-1 text-sm text-white/76">{activeFish.season}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">평균 크기</dt>
                      <dd className="mt-1 text-sm text-white/76">공식 정보 없음</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold tracking-[0.18em] text-[#d5b477]">습성</dt>
                    <dd className="mt-1 text-sm leading-6 text-white/68">{activeFish.shortDescription}</dd>
                  </div>
                </dl>

                <p className="mt-5 flex items-center gap-2 text-xs leading-6 text-white/48">
                  <BookOpen size={15} className="text-[#d5b477]" strokeWidth={1.45} aria-hidden="true" />
                  개인 도감 활성화는 사용자 확정 어종 기준으로 처리됩니다.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 w-full overflow-x-auto pb-2">
            <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap sm:justify-end">
              {featuredFish.map((item) => {
                const selected = item.id === activeFish?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveFishId(item.id)}
                    className={`group min-h-11 min-w-24 border px-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477] ${
                      selected
                        ? "border-[#d5b477]/75 bg-[#e8c58a] text-[#07111b]"
                        : "border-white/16 bg-[#06111d]/72 text-[#f4f0e8] backdrop-blur-xl hover:border-[#d5b477]/45"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="block text-[9px] font-semibold tracking-[0.16em] opacity-65">SPECIMEN</span>
                    <span className="mt-1 block font-serif text-lg">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute right-0 top-8 hidden items-center gap-3 text-[10px] tracking-[0.2em] text-white/35 lg:flex">
            <Waves size={15} strokeWidth={1.3} aria-hidden="true" />
            KOREAN COASTAL SPECIES
          </div>
        </div>
      </div>
    </section>
  );
}
