"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Search,
  ShieldAlert,
  Ship,
  Waves
} from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import type { FishingSpot, FishingSpotType } from "@/data/fishing-spots";
import { fishingSpotTypes, getFishingSpotTypeLabel } from "@/data/fishing-spots";

type TypeFilter = FishingSpotType | "all";
type RegionFilter = string | "all";

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

function getSourceLabel(sourceType: string) {
  if (sourceType.includes("official")) return "공식 자료";
  if (sourceType.includes("public")) return "공공 데이터";
  return "원천 자료";
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <span className="text-[#6E8299]">{children}</span>;
}

type FishingSpotsClientProps = {
  spots: FishingSpot[];
  regions: string[];
};

export function FishingSpotsClient({ spots, regions }: FishingSpotsClientProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const boatSpotCount = spots.filter((spot) => spot.type === "boat-fishing-point").length;
  const rockSpotCount = spots.filter((spot) => spot.type === "rock-fishing-point").length;
  const totalCoordinateCount = spots.filter((spot) => hasCompleteCoordinates(spot.lat, spot.lng)).length;

  const getTypeCount = (targetType: FishingSpotType) => spots.filter((spot) => spot.type === targetType).length;

  const filteredSpots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return spots.filter((spot) => {
      const matchesType = type === "all" || spot.type === type;
      const matchesRegion = region === "all" || spot.region === region;
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
      <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-24 lg:space-y-5 lg:pb-10">
        <section className="overflow-hidden rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(180deg,#0F3355_0%,#0A1E30_100%)] p-4 text-white sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#00D3C7] ring-1 ring-white/10">
                <MapPin size={26} />
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#9FB3C8]">Blue Marina Spots</p>
              <h1 className="mt-2 text-[28px] font-black tracking-tight text-white sm:text-4xl">출조거점 찾기</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D7E4F6] sm:text-base sm:leading-7">
                선상낚시와 갯바위·방파제 포인트를 지역, 유형, 어종 기준으로 빠르게 찾습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              {[
                { label: "전체 포인트", value: spots.length.toLocaleString() },
                { label: "선상낚시", value: boatSpotCount.toLocaleString() },
                { label: "갯바위·방파제", value: rockSpotCount.toLocaleString() },
                { label: "좌표 확인", value: totalCoordinateCount.toLocaleString() }
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#9FB3C8]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href="/fishing-safety"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-white px-5 text-sm font-black text-[#071827] transition hover:bg-sky-50"
            >
              <ShieldAlert size={18} />
              출조 안전 가이드
            </Link>
            <Link
              href="/sea-info"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Waves size={18} />
              오늘의 바다 확인
            </Link>
          </div>
        </section>

        <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-3 sm:p-4 lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_0.72fr_0.72fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-white">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-[#2E8BFF]" />
                포인트 검색
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPage();
                }}
                placeholder="감성돔, 제주, 방파제, 항구..."
                className="min-h-12 rounded-[18px] border border-[#1F3A50] bg-[#0E2233] px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#6E8299] focus:border-[#2E8BFF]"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-white">
              <span className="flex items-center gap-2">
                <Ship size={18} className="text-[#2E8BFF]" />
                유형
              </span>
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as TypeFilter);
                  resetPage();
                }}
                className="min-h-12 rounded-[18px] border border-[#1F3A50] bg-[#0E2233] px-4 text-sm font-bold text-white outline-none transition focus:border-[#2E8BFF]"
              >
                <option value="all">전체 유형</option>
                {fishingSpotTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({getTypeCount(item.value).toLocaleString()})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-black text-white">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-[#2E8BFF]" />
                지역
              </span>
              <select
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  resetPage();
                }}
                className="min-h-12 rounded-[18px] border border-[#1F3A50] bg-[#0E2233] px-4 text-sm font-bold text-white outline-none transition focus:border-[#2E8BFF]"
              >
                <option value="all">전체 지역</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-3 sm:p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#2E8BFF]">
                <Anchor size={16} />
                Fishing Spot Results
              </p>
              <h2 className="mt-1 text-xl font-black text-white">검색 결과 {filteredSpots.length.toLocaleString()}개</h2>
              <p className="mt-1 text-xs font-bold text-[#9FB3C8]">
                좌표 확인 {completeCoordinateCount.toLocaleString()}개 / 현장 확인 필요{" "}
                {(filteredSpots.length - completeCoordinateCount).toLocaleString()}개
              </p>
            </div>
            <p className="text-xs font-bold text-[#9FB3C8]">1페이지 {PAGE_SIZE}개씩 표시</p>
          </div>

          {filteredSpots.length === 0 ? (
            <div className="rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-6 text-center">
              <p className="text-base font-black text-white">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-[#9FB3C8]">다른 지역, 어종, 유형으로 다시 찾아보세요.</p>
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
                    <article
                      key={spot.id}
                      className="min-w-0 rounded-[24px] border border-[#1F3A50] bg-[#0E2233] p-4 transition hover:border-[#2E8BFF]/45 hover:bg-[#11293C]"
                    >
                      <button type="button" onClick={() => setOpenId(isOpen ? null : spot.id)} className="w-full text-left">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#2E8BFF]/15 px-3 py-1 text-[11px] font-black text-[#2E8BFF]">
                                {getFishingSpotTypeLabel(spot.type)}
                              </span>
                              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-black text-[#9FB3C8]">{spot.region}</span>
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black ${
                                  coordinateReady ? "bg-[#35D07F]/15 text-[#35D07F]" : "bg-[#FFB020]/15 text-[#FFB020]"
                                }`}
                              >
                                {coordinateReady ? "좌표 확인" : "현장 확인 필요"}
                              </span>
                            </div>
                            <h3 className="mt-3 break-words text-lg font-black leading-6 text-white">{spot.name}</h3>
                            <p className="mt-2 break-words text-sm font-bold text-[#9FB3C8]">{spot.address || "주소 정보 없음"}</p>
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#D7E4F6]">{spot.description}</p>
                          </div>
                          <ChevronDown className={`mt-1 shrink-0 text-[#2E8BFF] transition ${isOpen ? "rotate-180" : ""}`} size={22} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {primaryFish.map((fish) => (
                            <span
                              key={`${spot.id}-${fish}`}
                              className="rounded-full border border-[#1F3A50] bg-[#071827] px-2.5 py-1 text-[11px] font-black text-[#D7E4F6]"
                            >
                              {fish}
                            </span>
                          ))}
                          {targetFish.length > primaryFish.length ? (
                            <span className="rounded-full border border-[#1F3A50] bg-[#071827] px-2.5 py-1 text-[11px] font-black text-[#6E8299]">
                              +{targetFish.length - primaryFish.length}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="mt-4 space-y-3 rounded-[22px] border border-[#1F3A50] bg-[#071827] p-4">
                          <div className="grid gap-2 text-sm font-semibold leading-6 text-[#D7E4F6]">
                            <p>
                              <span className="font-black text-white">대상어:</span>{" "}
                              {targetFish.length > 0 ? targetFish.join(", ") : <EmptyText>공식 원본 미기재</EmptyText>}
                            </p>
                            <p>
                              <span className="font-black text-white">물때:</span> {spot.tideNote || <EmptyText>공식 원본 미기재</EmptyText>}
                            </p>
                            <p>
                              <span className="font-black text-white">수심:</span> {spot.depthNote || <EmptyText>공식 원본 미기재</EmptyText>}
                            </p>
                            <p>
                              <span className="font-black text-white">바닥:</span> {spot.bottomNote || <EmptyText>공식 원본 미기재</EmptyText>}
                            </p>
                            <p>
                              <span className="font-black text-white">채비/방법:</span>{" "}
                              {spot.methodNote || <EmptyText>공식 원본 미기재</EmptyText>}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
                              <p className="text-xs font-black text-[#00D3C7]">시설·접근 정보</p>
                              <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-[#9FB3C8]">
                                {spot.facilities.length > 0 ? (
                                  spot.facilities.map((item) => <li key={`${spot.id}-facility-${item}`}>- {item}</li>)
                                ) : (
                                  <li>공식 원본 미기재</li>
                                )}
                              </ul>
                            </div>
                            <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3">
                              <p className="flex items-center gap-2 text-xs font-black text-[#FFB020]">
                                <ShieldAlert size={15} />
                                출조 전 확인
                              </p>
                              <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-[#9FB3C8]">
                                {spot.cautions.length > 0 ? (
                                  spot.cautions.map((item) => <li key={`${spot.id}-caution-${item}`}>- {item}</li>)
                                ) : (
                                  <li>기상, 통제, 선사 공지를 확인하세요.</li>
                                )}
                              </ul>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-[#1F3A50] bg-[#0E2233] p-3 text-xs font-semibold leading-5 text-[#9FB3C8]">
                            <p>
                              <span className="font-black text-white">출처:</span> {spot.sourceName || getSourceLabel(spot.sourceType)}
                            </p>
                            <p>
                              <span className="font-black text-white">검증일:</span> {spot.sourceCheckedAt}
                            </p>
                            <p className="mt-1">{spot.note}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-[22px] border border-[#1F3A50] bg-[#0E2233] p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-[#D7E4F6]">
                  {currentPage} / {pageCount} 페이지
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#1F3A50] bg-[#071827] px-4 text-sm font-black text-white transition enabled:hover:border-[#2E8BFF] disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2E8BFF] px-4 text-sm font-black text-white transition enabled:hover:bg-[#5aa4ff] disabled:opacity-40"
                  >
                    다음
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-[#FFB020]/35 bg-[#FFB020]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-[#FFB020]">
            <Waves size={18} />
            안내
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#F7DCA2]">
            이 페이지는 공식 출조 포인트 원본을 Blue Marina 서비스 필드로 정리한 1차 데이터입니다. 실제 낚시 가능 여부,
            출입 통제, 선박 운항, 기상 위험은 출조 전 공식 안내와 현장 상황을 반드시 확인하세요.
          </p>
          <Link
            href="/fishing-safety"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#FFB020] px-4 text-sm font-black text-[#071827] transition hover:bg-[#ffc45c]"
          >
            안전 체크리스트 보기
          </Link>
        </section>
      </div>
    </AppFrame>
  );
}
