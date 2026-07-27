"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Anchor, ChevronDown, ChevronLeft, ChevronRight, Filter, MapPin, Search, ShieldAlert, Ship, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import type { FishingSpot, FishingSpotType } from "@/data/fishing-spots";
import { fishingSpotTypes, getFishingSpotTypeLabel } from "@/data/fishing-spots";

type TypeFilter = FishingSpotType | "전체";
type RegionFilter = string | "전체";

const PAGE_SIZE = 10;

function hasCompleteCoordinates(lat: string, lng: string) {
  return lat.trim().length > 0 && lng.trim().length > 0;
}

function splitList(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

type FishingSpotsClientProps = {
  spots: FishingSpot[];
  regions: string[];
};

export function FishingSpotsClient({ spots, regions }: FishingSpotsClientProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("전체");
  const [region, setRegion] = useState<RegionFilter>("전체");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const getTypeCount = (targetType: FishingSpotType) => spots.filter((spot) => spot.type === targetType).length;

  const filteredSpots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return spots.filter((spot) => {
      const matchesType = type === "전체" || spot.type === type;
      const matchesRegion = region === "전체" || spot.region === region;
      const searchable = [
        spot.name,
        spot.region,
        spot.city,
        spot.address,
        spot.targetFish,
        spot.tideNote,
        spot.depthNote,
        spot.bottomNote,
        spot.methodNote,
        spot.description
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchesType && matchesRegion && matchesQuery;
    });
  }, [query, region, spots, type]);

  const pageCount = Math.max(1, Math.ceil(filteredSpots.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedSpots = filteredSpots.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const completeCoordinateCount = filteredSpots.filter((spot) => hasCompleteCoordinates(spot.lat, spot.lng)).length;

  const resetPage = () => {
    setOpenId(null);
    setPage(1);
  };

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.36),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.42),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <MapPin size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Fishing Spots</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">출조거점 찾기</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                해양수산부 공공데이터 기반의 선상낚시 포인트와 갯바위·방파제 포인트를 검색합니다. 실제 출조 가능 여부는 기상, 현장 통제, 선사 운항 정보를 반드시 확인하세요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/fishing-safety" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#0F2D52] transition hover:bg-sky-50">
                  <ShieldAlert size={18} />
                  출조 안전 가이드
                </Link>
                <Link href="/sea-info" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700">
                  <Waves size={18} />
                  오늘의 바다 확인
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{spots.length.toLocaleString()}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">전체 포인트</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{getTypeCount("boat-fishing-point").toLocaleString()}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">선상낚시</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{getTypeCount("rock-fishing-point").toLocaleString()}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">갯바위·방파제</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{regions.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">지역</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr_0.75fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-sky-700" />
                포인트 검색
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPage();
                }}
                placeholder="감성돔, 우럭, 제주, 갯바위..."
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Ship size={18} className="text-sky-700" />
                유형
              </span>
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as TypeFilter);
                  resetPage();
                }}
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                <option value="전체">전체 유형</option>
                {fishingSpotTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({getTypeCount(item.value).toLocaleString()})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-sky-700" />
                지역
              </span>
              <select
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  resetPage();
                }}
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                <option value="전체">전체 지역</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
                <Anchor size={16} />
                Fishing Spot Results
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">검색 결과 {filteredSpots.length.toLocaleString()}개</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                좌표 확인 완료 {completeCoordinateCount.toLocaleString()}개 / 좌표 보강 필요 {(filteredSpots.length - completeCoordinateCount).toLocaleString()}개
              </p>
            </div>
            <p className="text-xs font-bold text-slate-500">1페이지 10개씩 표시합니다.</p>
          </div>

          {filteredSpots.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-base font-black text-slate-900">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">다른 지역, 어종, 유형으로 다시 찾아보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
                {pagedSpots.map((spot) => {
                  const coordinateReady = hasCompleteCoordinates(spot.lat, spot.lng);
                  const targetFish = splitList(spot.targetFish);
                  const primaryFish = targetFish.slice(0, 5);
                  const isOpen = openId === spot.id;

                  return (
                    <article key={spot.id} className="min-w-0 rounded-2xl border border-sky-100 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-white">
                      <button type="button" onClick={() => setOpenId(isOpen ? null : spot.id)} className="w-full text-left">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-800">{getFishingSpotTypeLabel(spot.type)}</span>
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-sky-100">{spot.region}</span>
                              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${coordinateReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                {coordinateReady ? "좌표 확인" : "좌표 보강 필요"}
                              </span>
                            </div>
                            <h3 className="mt-3 break-words text-lg font-black leading-6 text-slate-950">{spot.name}</h3>
                            <p className="mt-2 text-sm font-bold text-slate-500">{spot.address}</p>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{spot.description}</p>
                          </div>
                          <ChevronDown className={`mt-1 shrink-0 text-sky-700 transition ${isOpen ? "rotate-180" : ""}`} size={22} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {primaryFish.map((fish) => (
                            <span key={`${spot.id}-${fish}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-sky-100">
                              {fish}
                            </span>
                          ))}
                          {targetFish.length > primaryFish.length ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-400 ring-1 ring-sky-100">+{targetFish.length - primaryFish.length}</span>
                          ) : null}
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                          <div className="grid gap-2 text-sm font-semibold leading-6 text-slate-700">
                            <p>
                              <span className="font-black text-slate-950">대상어:</span> {targetFish.join(", ")}
                            </p>
                            <p>
                              <span className="font-black text-slate-950">물때:</span> {spot.tideNote || "공식 원본 미기재"}
                            </p>
                            <p>
                              <span className="font-black text-slate-950">수심:</span> {spot.depthNote || "공식 원본 미기재"}
                            </p>
                            <p>
                              <span className="font-black text-slate-950">바닥:</span> {spot.bottomNote || "공식 원본 미기재"}
                            </p>
                            <p>
                              <span className="font-black text-slate-950">채비/방법:</span> {spot.methodNote || "공식 원본 미기재"}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-sky-50 p-3">
                              <p className="text-xs font-black text-sky-800">시설·접근 정보</p>
                              <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                                {spot.facilities.map((item) => (
                                  <li key={`${spot.id}-facility-${item}`}>- {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-2xl bg-amber-50 p-3">
                              <p className="flex items-center gap-2 text-xs font-black text-amber-800">
                                <ShieldAlert size={15} />
                                출조 전 확인
                              </p>
                              <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600">
                                {spot.cautions.map((item) => (
                                  <li key={`${spot.id}-caution-${item}`}>- {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                            <p>
                              <span className="font-black text-slate-950">출처:</span> {spot.sourceName}
                            </p>
                            <p>
                              <span className="font-black text-slate-950">검증일:</span> {spot.sourceCheckedAt}
                            </p>
                            <p className="mt-1">{spot.note}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-sky-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-slate-700">
                  {currentPage} / {pageCount} 페이지
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-sky-100 transition enabled:hover:bg-sky-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-black text-white transition enabled:hover:bg-sky-800 disabled:opacity-40"
                  >
                    다음
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-black text-amber-900">
            <Waves size={18} />
            안내
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/80">
            이 페이지는 공식 출조 포인트 원본을 Blue Marina 서비스 필드로 정리한 1차 데이터입니다. 실제 낚시 가능 여부, 출입 통제, 선박 운항, 기상 위험은 출조 전 공식 안내와 현장 상황을 반드시 확인하세요.
          </p>
          <Link href="/fishing-safety" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700">
            안전 체크리스트 보기
          </Link>
        </section>
      </div>
    </AppFrame>
  );
}
