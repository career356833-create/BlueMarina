import Link from "next/link";
import { ArrowRight, MessageCircle, PackageSearch, Plus, Search, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { parseMarketFilters } from "@/lib/market/filters";
import { readPublicMarketListings } from "@/lib/market/backend/public-reader";
import { categoryLabels, conditionLabels, formatMarketPrice, priceTypeLabels, transactionLabels } from "@/lib/market/route-helpers";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, MARKET_PRICE_TYPES, MARKET_SORTS } from "@/lib/market/types";

type MarketQuery = Record<string, string | string[] | undefined>;
const sortLabels = { NEWEST: "최신순", PRICE_LOW: "낮은 가격순", PRICE_HIGH: "높은 가격순" } as const;

export default async function MarketPage({ searchParams }: { searchParams: Promise<MarketQuery> }) {
  const filters = parseMarketFilters(await searchParams);
  const listings = await readPublicMarketListings(filters);
  return <AppFrame><section className="mx-auto max-w-6xl py-5 sm:py-10">
    <div className="rounded-[30px] border border-[#1F3A50] bg-[linear-gradient(135deg,#071827,#0C2B3C)] p-6 sm:p-10">
      <p className="text-xs font-black tracking-[.22em] text-[#79C9D6]">BLUE MARINA MARKET</p>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">바다 장비를 가까운 곳에서</h1><p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#B8CBDD]">낚시장비와 보트용품을 지역·상태·거래 방식으로 살펴보는 중고거래 공간입니다. 결제와 거래 보증은 제공하지 않습니다.</p></div>
        <Link href="/market/new" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#E6B86A] px-6 text-sm font-black text-[#102333]"><Plus size={18}/>판매글 등록</Link>
      </div>
    </div>

    <form className="mt-6 grid gap-3 rounded-[24px] border border-[#1F3A50] bg-[#071827] p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-6" action="/market">
      <label className="relative sm:col-span-2"><span className="sr-only">검색</span><Search className="pointer-events-none absolute left-4 top-3.5 text-[#7890A5]" size={18}/><input name="q" defaultValue={filters.q} placeholder="상품명 또는 설명 검색" className="control w-full pl-11"/></label>
      <label><span className="sr-only">카테고리</span><select name="category" defaultValue={filters.category ?? ""} className="control w-full"><option value="">전체 카테고리</option>{MARKET_CATEGORIES.map((value)=><option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
      <label><span className="sr-only">지역</span><input name="region" defaultValue={filters.region ?? ""} placeholder="시·도 또는 시·군·구" className="control w-full"/></label>
      <label><span className="sr-only">상품 상태</span><select name="condition" defaultValue={filters.condition ?? ""} className="control w-full"><option value="">전체 상태</option>{MARKET_CONDITIONS.map((value)=><option key={value} value={value}>{conditionLabels[value]}</option>)}</select></label>
      <label><span className="sr-only">가격 유형</span><select name="priceType" defaultValue={filters.priceType ?? ""} className="control w-full"><option value="">전체 가격</option>{MARKET_PRICE_TYPES.map((value)=><option key={value} value={value}>{priceTypeLabels[value]}</option>)}</select></label>
      <label className="sm:col-span-2 lg:col-span-1"><span className="sr-only">정렬</span><select name="sort" defaultValue={filters.sort} className="control w-full">{MARKET_SORTS.map((value)=><option key={value} value={value}>{sortLabels[value]}</option>)}</select></label>
      <button className="min-h-12 rounded-[18px] bg-[#2E8BFF] px-5 text-sm font-black text-white sm:col-span-2 lg:col-span-1">필터 적용</button>
    </form>

    {listings.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing)=><article key={listing.id} className="min-w-0 overflow-hidden rounded-[24px] border border-[#1F3A50] bg-[#071827]">
      <div role="img" aria-label={listing.images[0]?.alt ?? `${listing.title} 대표 이미지`} className="aspect-[4/3] bg-[#0C2638] bg-cover bg-center" style={listing.images[0] ? {backgroundImage:`url(${listing.images[0].url})`} : undefined}>{listing.images.length ? null : <div className="flex h-full items-center justify-center text-[#67839A]"><PackageSearch size={38}/></div>}</div>
      <div className="p-5"><p className="text-xs font-black text-[#79C9D6]">{categoryLabels[listing.category]}</p><h2 className="mt-2 break-words text-lg font-black">{listing.title}</h2><p className="mt-3 break-words text-xl font-black text-[#F1D29C]">{formatMarketPrice(listing)}</p><p className="mt-2 text-sm text-[#AFC1D4]">{conditionLabels[listing.condition]} · {listing.region.province}{listing.region.district ? ` ${listing.region.district}` : ""}</p><p className="mt-2 flex flex-wrap gap-2 text-xs text-[#91A8BC]">{listing.transactionMethods.map((method)=><span key={method}>{transactionLabels[method]}</span>)}</p><time className="mt-3 block text-xs text-[#6E8299]" dateTime={listing.createdAt}>{new Date(listing.createdAt).toLocaleDateString("ko-KR")}</time><Link href={`/market/${encodeURIComponent(listing.id)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#AEE8EF]">상세보기 <ArrowRight size={16}/></Link></div>
    </article>)}</div> : <div className="mt-7 rounded-[28px] border border-dashed border-[#29465D] bg-[#071827] p-8 text-center sm:p-12"><PackageSearch className="mx-auto text-[#79C9D6]" size={36}/><h2 className="mt-4 text-xl font-black">등록된 판매글이 없습니다</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#9FB3C8]">운영 데이터로 검토된 판매글만 여기에 표시됩니다. 검색 조건을 초기화하거나 로컬 검토 초안을 만들 수 있습니다.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/market" className="inline-flex min-h-11 items-center rounded-full border border-[#29465D] px-5 text-sm font-black">필터 초기화</Link><Link href="/market/new" className="inline-flex min-h-11 items-center rounded-full bg-[#2E8BFF] px-5 text-sm font-black">판매글 초안 만들기</Link><Link href="/community" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-5 text-sm font-black"><MessageCircle size={16}/>커뮤니티 보기</Link></div></div>}

    <div className="mt-7 flex gap-3 rounded-[22px] border border-[#315064] bg-[#0A1E2C] p-5 text-sm font-semibold leading-6 text-[#B8CBDD]"><ShieldCheck className="mt-0.5 shrink-0 text-[#79C9D6]" size={20}/><p>Blue Marina는 V1에서 결제, 에스크로, 배송 추적, 판매자 인증을 제공하지 않습니다. 거래 전 물품 상태와 연락 상대를 직접 확인하세요.</p></div>
  </section></AppFrame>;
}
