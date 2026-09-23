import Image from "next/image";
import Link from "next/link";
import { MessageCircle, PenLine, Search, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { filterCommunityPosts, parseCommunityFilters } from "@/lib/community/filters";
import { productionCommunityDataset } from "@/lib/community/registry";
import { communityExcerpt, communityPostTypeLabels } from "@/lib/community/route-helpers";
import { COMMUNITY_POST_TYPES, COMMUNITY_SORTS } from "@/lib/community/types";

type Query = Record<string, string | string[] | undefined>;
const sortLabels = { NEWEST: "최신순", OLDEST: "오래된순" } as const;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Query> }) {
  const filters = parseCommunityFilters(await searchParams);
  const posts = filterCommunityPosts(productionCommunityDataset.posts, filters);
  return <AppFrame><section className="mx-auto max-w-6xl py-5 sm:py-10">
    <div className="overflow-hidden rounded-[30px] border border-[#1F3A50] bg-[radial-gradient(circle_at_85%_15%,rgba(0,211,199,.18),transparent_30%),linear-gradient(135deg,#071827,#0C2B3C)] p-6 sm:p-10">
      <p className="text-xs font-black tracking-[.22em] text-[#79C9D6]">BLUE MARINA COMMUNITY</p>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black sm:text-4xl">바다 경험을 안전하게 나누는 공간</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#B8CBDD]">조황, 출조 후기, 지역 정보와 질문을 기록하고 Blue Marina의 어종·포인트·출조·마켓 정보에 명시적으로 연결할 수 있습니다.</p></div><Link href="/community/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2E8BFF] px-5 text-sm font-black"><PenLine size={17}/>글 작성</Link></div>
    </div>
    <form className="mt-6 grid gap-3 rounded-[24px] border border-[#1F3A50] bg-[#071827] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_160px_auto]">
      <label className="relative"><span className="sr-only">검색</span><Search className="absolute left-3 top-3.5 text-[#6E8299]" size={17}/><input name="q" defaultValue={filters.q} placeholder="제목·본문 검색" className="min-h-11 w-full rounded-xl border border-[#29465D] bg-[#050F19] pl-10 pr-3 text-sm"/></label>
      <select name="type" defaultValue={filters.type??""} aria-label="글 유형" className="min-h-11 rounded-xl border border-[#29465D] bg-[#050F19] px-3 text-sm"><option value="">전체 유형</option>{COMMUNITY_POST_TYPES.map(type=><option key={type} value={type}>{communityPostTypeLabels[type]}</option>)}</select>
      <input name="region" defaultValue={filters.region??""} placeholder="시·도 / 시·군·구" aria-label="지역" className="min-h-11 rounded-xl border border-[#29465D] bg-[#050F19] px-3 text-sm"/>
      <select name="sort" defaultValue={filters.sort} aria-label="정렬" className="min-h-11 rounded-xl border border-[#29465D] bg-[#050F19] px-3 text-sm">{COMMUNITY_SORTS.map(sort=><option key={sort} value={sort}>{sortLabels[sort]}</option>)}</select>
      <button className="min-h-11 rounded-xl bg-[#123A57] px-5 text-sm font-black">적용</button>
    </form>
    {posts.length===0?<div className="mt-6 rounded-[26px] border border-dashed border-[#29465D] bg-[#071827] px-6 py-12 text-center sm:py-16"><MessageCircle className="mx-auto text-[#79C9D6]" size={34}/><h2 className="mt-4 text-xl font-black">등록된 커뮤니티 글이 없습니다</h2><p className="mt-2 text-sm font-semibold text-[#9FB3C8]">실제 사용자가 제출하고 검토된 글만 이 피드에 표시됩니다. 작성 내용은 서버 게시 전 로컬 초안으로만 준비됩니다.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/community/new" className="inline-flex min-h-11 items-center rounded-full bg-[#2E8BFF] px-5 text-sm font-black">글 초안 만들기</Link><Link href="/fishing-spots" className="inline-flex min-h-11 items-center rounded-full border border-[#29465D] px-5 text-sm font-black">낚시 포인트 보기</Link></div></div>:<div className="mt-6 grid gap-4 sm:grid-cols-2">{posts.map(post=><article key={post.id} className="min-w-0 overflow-hidden rounded-[24px] border border-[#1F3A50] bg-[#071827]">{post.images[0]?<Image src={post.images[0].url} alt={post.images[0].alt??post.title} width={900} height={560} sizes="(max-width: 640px) 100vw, 50vw" unoptimized className="aspect-[16/10] w-full object-cover"/>:null}<div className="p-5"><p className="text-xs font-black text-[#79C9D6]">{communityPostTypeLabels[post.type]}{post.region?` · ${post.region.province} ${post.region.district??""}`:""}</p><h2 className="mt-2 break-words text-xl font-black">{post.title}</h2><p className="mt-3 break-words text-sm leading-6 text-[#B8CBDD]">{communityExcerpt(post.body)}</p><div className="mt-4 flex items-center justify-between gap-3"><time className="text-xs text-[#6E8299]" dateTime={post.createdAt}>{post.createdAt.slice(0,10)}</time><Link href={`/community/${encodeURIComponent(post.id)}`} className="inline-flex min-h-11 items-center px-2 text-sm font-black text-[#79C9D6]">상세보기</Link></div></div></article>)}</div>}
    <div className="mt-6 flex gap-3 rounded-2xl border border-[#79C9D6]/20 bg-[#79C9D6]/8 p-4 text-sm font-semibold leading-6 text-[#B8CBDD]"><ShieldCheck className="mt-0.5 shrink-0 text-[#79C9D6]" size={18}/><p>게시물은 자동 안전·법률 판정 대상이 아닙니다. 위험하거나 불법으로 의심되는 내용은 공식 기관과 현장 안내를 우선 확인하세요.</p></div>
  </section></AppFrame>;
}
