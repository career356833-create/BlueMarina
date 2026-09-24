import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { RecentlyViewedTracker } from "@/components/account/RecentlyViewedTracker";
import { getCommunityPost } from "@/lib/community/registry";
import { communityPostTypeLabels, linkedCommunityHref } from "@/lib/community/route-helpers";
import { CommunityInteractions } from "./community-interactions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "커뮤니티 글", robots: { index: false, follow: false } };

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const post = getCommunityPost((await params).id);
  if (!post) notFound();
  const links = [
    ...post.linkedSpeciesIds.map(id=>({id,label:`어종 ${id}`,href:linkedCommunityHref.species(id)})),
    ...post.linkedFishingSpotIds.map(id=>({id,label:`포인트 ${id}`,href:linkedCommunityHref.fishingSpot(id)})),
    ...post.linkedCharterIds.map(id=>({id,label:`출조 ${id}`,href:linkedCommunityHref.charter(id)})),
    ...post.linkedMarketListingIds.map(id=>({id,label:`마켓 ${id}`,href:linkedCommunityHref.market(id)})),
  ];
  return <AppFrame><RecentlyViewedTracker item={{entityType:"COMMUNITY_POST",entityId:post.id,label:post.title,href:`/community/${encodeURIComponent(post.id)}`}}/><article className="mx-auto max-w-4xl py-5 sm:py-10">
    <Link href="/community" className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#AEE8EF]"><ArrowLeft size={17}/>커뮤니티</Link>
    <div className="mt-4 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-8"><p className="text-xs font-black text-[#79C9D6]">{communityPostTypeLabels[post.type]}</p><h1 className="mt-3 break-words text-3xl font-black">{post.title}</h1>{post.region?<p className="mt-3 text-sm font-bold text-[#9FB3C8]">{post.region.province} {post.region.district}</p>:null}<p className="mt-7 whitespace-pre-wrap break-words text-[15px] font-medium leading-8 text-[#D7E4F6]">{post.body}</p></div>
    {post.images.length?<div className="mt-5 grid gap-3 sm:grid-cols-2">{post.images.map(image=><Image key={image.id} src={image.url} alt={image.alt??post.title} width={900} height={700} sizes="(max-width: 640px) 100vw, 50vw" unoptimized className="aspect-[4/3] w-full rounded-2xl object-cover"/>)}</div>:null}
    {links.length?<section className="mt-5 rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="font-black">연결된 Blue Marina 정보</h2><div className="mt-3 flex flex-wrap gap-2">{links.map(link=><Link key={`${link.href}-${link.id}`} href={link.href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-4 text-xs font-black text-[#AEE8EF]">{link.label}<ExternalLink size={14}/></Link>)}</div></section>:null}
    <CommunityInteractions postId={post.id}/>
    <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4 text-sm font-semibold leading-6 text-amber-50"><ShieldAlert className="mt-0.5 shrink-0" size={18}/><p>게시물의 조황·안전·거래 내용은 작성자 경험입니다. 항행, 출입 통제, 법규와 거래 조건은 공식 출처에서 별도로 확인하세요.</p></div>
  </article></AppFrame>;
}
