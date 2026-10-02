"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunityPost } from "@/lib/community/types";
import { CommunityInteractions } from "./community-interactions";

export function CommunityPrivatePost({postId}:{postId:string}) {
  const [post,setPost]=useState<CommunityPost|null>(null),[message,setMessage]=useState("내 글을 확인하는 중입니다."),[title,setTitle]=useState(""),[body,setBody]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    const token=(await createClient()?.auth.getSession())?.data.session?.access_token;
    if(!token){setMessage("로그인 후 본인 글을 볼 수 있습니다.");return}
    try{const response=await fetch(`/api/community/posts/${encodeURIComponent(postId)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const result=await response.json() as {post?:CommunityPost};if(!response.ok||!result.post){setMessage("글을 찾을 수 없거나 접근 권한이 없습니다.");return}
      setPost(result.post);setTitle(result.post.title);setBody(result.post.body);setMessage("");
    }catch{setMessage("네트워크 문제로 글을 확인하지 못했습니다.")}
  },[postId]);
  useEffect(()=>{void load()},[load]);
  const save=async()=>{
    if(!post||busy)return;setBusy(true);setMessage("");
    try{const token=(await createClient()?.auth.getSession())?.data.session?.access_token;if(!token){setMessage("로그인이 필요합니다.");return}
      const response=await fetch(`/api/community/posts/${encodeURIComponent(postId)}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({type:post.type,title,body,province:post.region?.province??"",district:post.region?.district??null,images:[],linkedSpeciesIds:post.linkedSpeciesIds,linkedFishingSpotIds:post.linkedFishingSpotIds,linkedCharterIds:post.linkedCharterIds,linkedMarketListingIds:post.linkedMarketListingIds}),cache:"no-store"});
      if(!response.ok){setMessage("수정할 수 없습니다. 검토 상태를 확인해 주세요.");return}await load();setMessage("서버에 수정 내용을 저장했습니다.");
    }catch{setMessage("네트워크 문제로 수정 결과를 확인하지 못했습니다.")}finally{setBusy(false)}
  };
  return <article className="py-5 sm:py-10"><Link href="/community/new" className="inline-flex min-h-11 items-center text-sm font-bold text-[#AEE8EF]">← 내 글 목록</Link>
    {message?<p role="status" className="mt-4 break-words text-sm text-[#B8CBDD]">{message}</p>:null}
    {post?<><div className="mt-4 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-5 sm:p-8"><p className="text-xs font-black text-[#79C9D6]">내 글 · {post.status} / {post.moderationStatus} · 공개 전 검토 대기</p>
      <h1 className="mt-3 break-words text-3xl font-black">{post.title}</h1><p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p>
      {post.status==="SUBMITTED"?<div className="mt-6 grid gap-3"><label className="grid gap-2 text-sm">제목<input className="min-h-11 rounded-xl border border-[#29465D] bg-[#050F19] px-3" value={title} onChange={event=>setTitle(event.target.value)}/></label><label className="grid gap-2 text-sm">본문<textarea className="min-h-32 rounded-xl border border-[#29465D] bg-[#050F19] p-3" value={body} onChange={event=>setBody(event.target.value)}/></label><button type="button" disabled={busy} onClick={()=>void save()} className="min-h-11 rounded-xl bg-[#2E8BFF] px-4 font-bold disabled:opacity-50">{busy?"저장 중":"내 글 수정 저장"}</button></div>:null}
    </div><CommunityInteractions postId={post.id} isOwnPost/></>:null}</article>;
}
