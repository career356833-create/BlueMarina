import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/release/site-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, ArrowLeft, ExternalLink, Fish, MapPin, Navigation2, ShieldAlert, Waves } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { AccountSaveButton } from "@/components/account/AccountSaveButton";
import { RecentlyViewedTracker } from "@/components/account/RecentlyViewedTracker";
import { fishingSpots, getFishingSpotTypeLabel } from "@/data/fishing-spots";
import {
  buildFishingConditionHref,
  buildFishingSpotMapHref,
  findFishingSpot,
  getFishingSpotSpeciesProjection,
} from "@/lib/fishing-condition/fishing-spot-integration";
import {
  getSpotCoordinateSafetyPolicy,
  MAP_WARNING_NOTICE,
  NAVIGATION_HOLD_NOTICE,
} from "@/lib/fishing-spots/coordinate-safety";
import {
  buildNavigationHref,
  navigationDestinationFromFishingSpot,
} from "@/lib/marine-navigation/adapters/navigation-destination-adapter";

type PageProps = { params: Promise<{ id: string }> };

// This checked-in catalog is the complete route set. Reject misses before streaming.
export const dynamicParams = false;

export function generateStaticParams() {
  return fishingSpots.map(({ id }) => ({ id }));
}

function requireFishingSpot(id: string) {
  // Next already decodes route params; a second decode can throw or change identity.
  const spot = findFishingSpot(id);
  if (!spot) notFound();
  return spot;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const spot = requireFishingSpot((await params).id);
  return { ...canonicalMetadata(`/fishing-spots/${encodeURIComponent(spot.id)}`), title: spot.name, description: `${spot.region} ${spot.city} 출조 포인트 상세 정보` };
}

function SourceMissing({ children }: { children: React.ReactNode }) {
  return <span className="text-[#71889D]">{children}</span>;
}

export default async function FishingSpotDetailPage({ params }: PageProps) {
  const spot = requireFishingSpot((await params).id);

  const species = getFishingSpotSpeciesProjection(spot);
  const coordinatePolicy = getSpotCoordinateSafetyPolicy(spot.id);
  const mapBlocked = coordinatePolicy.mapPolicy === "MAP_DISPLAY_BLOCKED";
  const mapWarning = coordinatePolicy.mapPolicy === "MAP_DISPLAY_WITH_WARNING";
  const navigationBlocked = coordinatePolicy.navigationPolicy === "NAVIGATION_BLOCKED_PENDING_REVIEW";
  const mapHref = buildFishingSpotMapHref(spot);
  const navigationHref = navigationBlocked ? null : buildNavigationHref(navigationDestinationFromFishingSpot(spot));

  return <AppFrame>
    <RecentlyViewedTracker item={{ entityType: "FISHING_SPOT", entityId: spot.id, label: spot.name, href: `/fishing-spots/${encodeURIComponent(spot.id)}` }} />
    <main className="mx-auto w-full max-w-[1180px] space-y-5 pb-24 max-sm:pr-6 lg:space-y-7 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/fishing-spots" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#1F3A50] px-4 text-sm font-black text-[#D7E4F6] transition hover:bg-white/8">
          <ArrowLeft size={16} /> 출조거점 목록
        </Link>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#71889D]">Fishing spot detail</span>
      </div>

      <header className="overflow-hidden rounded-[28px] border border-[#1F3A50] bg-[linear-gradient(135deg,#102C46_0%,#071827_74%)] p-5 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#2E8BFF]/15 px-3 py-1 text-[11px] font-black text-[#79B6FF]">{getFishingSpotTypeLabel(spot.type)}</span>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-black text-[#B8CBDD]">{spot.region} · {spot.city}</span>
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.26em] text-[#EBC27D]"><Anchor size={15} /> Blue Marina Point</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">{spot.name}</h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#B8CBDD] sm:text-base">{spot.description || "포인트 설명이 원본 자료에 없습니다."}</p>
        <div className="mt-5"><AccountSaveButton entityType="FISHING_SPOT" entityId={spot.id} label={spot.name} href={`/fishing-spots/${encodeURIComponent(spot.id)}`} /></div>
      </header>

      {navigationBlocked ? <aside role="note" className="rounded-[22px] border border-[#6A5735] bg-[#201B13] p-4" aria-labelledby="coordinate-review-title">
        <p id="coordinate-review-title" className="text-sm font-black text-[#F1D9A8]">좌표 검토 중</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#D9C49A]">{coordinatePolicy.reason}</p>
      </aside> : null}

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#2E8BFF]">Target species</p>
            <h2 className="mt-1 text-2xl font-black text-white">대상 어종</h2>
            {species.canonical.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {species.canonical.map((item) => <div key={item.id} className="rounded-[18px] border border-[#29465D] bg-[#0A2031] p-3">
                <span className="inline-flex items-center gap-2 text-sm font-black text-white"><Fish size={17} className="text-[#79C9D6]" />{item.name}</span>
                <div className="mt-3 flex flex-wrap gap-2"><Link href={buildFishingConditionHref(spot, item.id)} aria-label={`${item.name} 조건 분석`} className="inline-flex min-h-10 items-center rounded-full border border-[#EBC27D]/50 px-3 text-xs font-black text-[#F1D9A8] transition hover:bg-[#EBC27D]/10">조건 보기</Link><AccountSaveButton entityType="FISH" entityId={item.id} label={item.name} href={buildFishingConditionHref(spot, item.id)} /></div>
              </div>)}
            </div> : <div className="mt-5 rounded-[18px] border border-dashed border-[#29465D] bg-[#081C2B] p-4">
              <p className="text-sm font-black text-[#D7E4F6]">연결 가능한 대상 어종 정보가 없습니다.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#8FA7BC]">조건 분석 화면에서 canonical 어종을 직접 선택할 수 있습니다.</p>
              <Link href={buildFishingConditionHref(spot)} className="mt-3 inline-flex min-h-10 items-center text-sm font-black text-[#EBC27D]">조건 분석에서 직접 선택 →</Link>
            </div>}

            {species.unmapped.length > 0 ? <div className="mt-5 border-t border-[#1F3A50] pt-4">
              <p className="text-xs font-black text-[#8FA7BC]">원본에 함께 기재된 어종</p>
              <div className="mt-2 flex flex-wrap gap-2">{species.unmapped.map((name) => <span key={name} className="rounded-full border border-[#1F3A50] px-3 py-1 text-[11px] font-bold text-[#9FB3C8]">{name}</span>)}</div>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-[#71889D]">canonical 10종과 정확히 연결되지 않은 명칭은 자동 추론하지 않습니다.</p>
            </div> : null}
          </section>

          <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">포인트 정보</h2>
            <dl className="mt-4 grid gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
              <div><dt className="font-black text-[#8FA7BC]">주소</dt><dd className="mt-1 font-semibold leading-6 text-[#D7E4F6]">{spot.address || <SourceMissing>원본 미기재</SourceMissing>}</dd></div>
              <div><dt className="font-black text-[#8FA7BC]">물때</dt><dd className="mt-1 font-semibold leading-6 text-[#D7E4F6]">{spot.tideNote || <SourceMissing>원본 미기재</SourceMissing>}</dd></div>
              <div><dt className="font-black text-[#8FA7BC]">수심</dt><dd className="mt-1 font-semibold leading-6 text-[#D7E4F6]">{spot.depthNote || <SourceMissing>원본 미기재</SourceMissing>}</dd></div>
              <div><dt className="font-black text-[#8FA7BC]">바닥</dt><dd className="mt-1 font-semibold leading-6 text-[#D7E4F6]">{spot.bottomNote || <SourceMissing>원본 미기재</SourceMissing>}</dd></div>
              <div className="sm:col-span-2"><dt className="font-black text-[#8FA7BC]">채비·방법</dt><dd className="mt-1 font-semibold leading-6 text-[#D7E4F6]">{spot.methodNote || <SourceMissing>원본 미기재</SourceMissing>}</dd></div>
            </dl>
          </section>
        </div>

        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[26px] border border-[#29465D] bg-[#071827] p-5 sm:p-6">
            <div aria-hidden="true" className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(121,201,214,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(121,201,214,.12)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#79C9D6]"><MapPin size={15} /> Location context</p>
              <h2 className="mt-2 text-xl font-black text-white">{spot.region} {spot.city}</h2>
              <p className="mt-1 font-mono text-sm text-[#B8CBDD]">{Number(spot.lat).toFixed(6)}, {Number(spot.lng).toFixed(6)}</p>
              {mapWarning ? <p role="note" className="mt-4 rounded-[14px] border border-[#6A5735] bg-[#201B13] px-3 py-2 text-xs font-black text-[#F1D9A8]">{MAP_WARNING_NOTICE}</p> : null}
              <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {mapBlocked
                  ? <button type="button" disabled aria-describedby="map-hold-reason" className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-[16px] bg-white/35 px-4 text-sm font-black text-[#B8CBDD]"><MapPin size={17} />지도에서 보기</button>
                  : <Link href={mapHref} aria-label={`${spot.name} 바다 지도에서 보기`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-4 text-sm font-black text-[#071827] transition hover:bg-[#EAF2FF]"><MapPin size={17} />지도에서 보기</Link>}
                {navigationHref
                  ? <Link href={navigationHref} aria-label={`${spot.name} 항법 목적지로 보기`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[#EBC27D]/55 bg-[#EBC27D]/10 px-4 text-sm font-black text-[#F1D9A8] transition hover:bg-[#EBC27D]/20"><Navigation2 size={17} />항법에서 보기</Link>
                  : <button type="button" disabled aria-describedby="navigation-hold-reason" className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-[16px] border border-[#6A5735] bg-[#201B13] px-4 text-sm font-black text-[#D9C49A]"><Navigation2 size={17} />항법에서 보기</button>}
              </div>
              {mapBlocked ? <p id="map-hold-reason" className="mt-3 text-xs font-semibold leading-5 text-[#D9C49A]">좌표 검토 중이라 지도 표시가 제한됩니다.</p> : null}
              {navigationBlocked ? <p id="navigation-hold-reason" className="mt-1 text-xs font-semibold leading-5 text-[#D9C49A]">{NAVIGATION_HOLD_NOTICE}</p> : null}
              <p className="mt-4 text-xs font-semibold leading-5 text-[#8FA7BC]">표시된 직선과 거리는 안전 항로를 의미하지 않습니다. 현장 항행 정보와 통제 구역을 별도로 확인하세요.</p>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">접근·출항 확인</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div><p className="text-xs font-black text-[#79C9D6]">시설·접근</p><ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{spot.facilities.length ? spot.facilities.map((item) => <li key={item}>- {item}</li>) : <li>원본 미기재</li>}</ul></div>
              <div><p className="flex items-center gap-2 text-xs font-black text-[#EBC27D]"><ShieldAlert size={15} />출조 전 확인</p><ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-[#9FB3C8]">{spot.cautions.length ? spot.cautions.map((item) => <li key={item}>- {item}</li>) : <li>기상, 통제, 선사 공지를 확인하세요.</li>}</ul></div>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">데이터 출처</h2>
            <p className="mt-3 text-sm font-black text-[#D7E4F6]">{spot.sourceName || "출처 정보 미확인"}</p>
            <p className="mt-1 text-xs font-semibold text-[#8FA7BC]">확인일 {spot.sourceCheckedAt}</p>
            {spot.sourceUrl ? <a href={spot.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-black text-[#79B6FF]">원본 자료 열기 <ExternalLink size={15} /></a> : null}
            {spot.note ? <p className="mt-3 text-xs font-semibold leading-5 text-[#8FA7BC]">{spot.note}</p> : null}
          </section>
        </div>
      </div>

      <section className="rounded-[24px] border border-[#6A5735] bg-[#201B13] p-5">
        <p className="flex items-center gap-2 text-sm font-black text-[#F1D9A8]"><Waves size={17} />관측 자료 선택 안내</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#D9C49A]">이 포인트의 좌표와 해양 관측 정점은 별도입니다. 조건 분석에서는 월·자료원·관측 정점·수심을 직접 선택해야 합니다.</p>
      </section>
    </main>
  </AppFrame>;
}
