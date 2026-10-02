"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { communityReportReasonLabels } from "@/lib/community/route-helpers";
import { COMMUNITY_REPORT_REASONS } from "@/lib/community/types";
import { validateCommunityComment } from "@/lib/community/validation";

type Comment = { id:string; body:string; author_id:string; created_at:string };
const bearer = async () => (await createClient()?.auth.getSession())?.data.session?.access_token ?? null;
const request = async (path:string,token:string|null,method="GET",body?:unknown) => {
  const response=await fetch(path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const result=await response.json() as {code?:string;comments?:Comment[];count?:number;mine?:string[]};
  if(!response.ok)throw new Error(result.code??"요청에 실패했습니다.");return result;
};

export function CommunityInteractions({postId,isOwnPost=false}:{postId:string;isOwnPost?:boolean}) {
  const [comment,setComment]=useState(""),[comments,setComments]=useState<Comment[]>([]),[commentError,setCommentError]=useState<string|null>(null);
  const [liked,setLiked]=useState(false),[count,setCount]=useState(0),[reason,setReason]=useState("SPAM"),[detail,setDetail]=useState(""),[reportMessage,setReportMessage]=useState("");
  const [actorId,setActorId]=useState<string|null>(null),[message,setMessage]=useState("");
  const refresh=useCallback(async()=>{const session=(await createClient()?.auth.getSession())?.data.session;
    setActorId(session?.user.id??null);
    try{const [commentResult,reactionResult]=await Promise.all([request(`/api/community/posts/${postId}/comments`,session?.access_token??null),request(`/api/community/posts/${postId}/reactions`,session?.access_token??null)]);
      setComments(commentResult.comments??[]);setCount(reactionResult.count??0);setLiked(Boolean(reactionResult.mine?.includes("HELPFUL")));setMessage(session?"":"로그인 후 댓글·반응을 작성할 수 있습니다.");
    }catch{setMessage("서버 데이터를 읽을 수 없습니다. 임의의 댓글·반응 수를 표시하지 않습니다.")}
  },[postId]);
  useEffect(()=>{void refresh()},[refresh]);
  const submitComment=async()=>{const result=validateCommunityComment(comment);if(!result.valid){setCommentError(result.errors.join(" "));return}
    const token=await bearer();if(!token){setCommentError("로그인이 필요합니다.");return}try{await request(`/api/community/posts/${postId}/comments`,token,"POST",{body:result.body});setComment("");setCommentError(null);await refresh()}catch(error){setCommentError(error instanceof Error?error.message:"댓글 저장 실패")}};
  const deleteComment=async(id:string)=>{const token=await bearer();if(!token)return;try{await request(`/api/community/comments/${id}`,token,"DELETE");await refresh()}catch{setCommentError("댓글 삭제 실패")}};
  const toggle=async()=>{const token=await bearer();if(!token){setMessage("로그인이 필요합니다.");return}try{await request(`/api/community/posts/${postId}/reactions`,token,liked?"DELETE":"POST",{type:"HELPFUL"});await refresh()}catch{setMessage("반응을 저장할 수 없습니다.")}};
  const submitReport=async()=>{if(isOwnPost){setReportMessage("본인 글은 신고할 수 없습니다.");return}const token=await bearer();if(!token){setReportMessage("로그인이 필요합니다. 서버 접수는 되지 않았습니다.");return}
    try{await request(`/api/community/posts/${postId}/reports`,token,"POST",{reason,detail});setReportMessage("신고가 서버에 접수되었습니다.")}catch(error){setReportMessage(error instanceof Error?error.message:"서버 접수는 되지 않았습니다.")}};
  return <div className="mt-5 space-y-5">
    {message?<p role="status" className="text-sm text-[#B8CBDD]">{message}</p>:null}
    <section className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="flex items-center gap-2 font-black"><MessageCircle size={18}/>댓글</h2>
      {comments.length===0?<p className="mt-3 text-sm font-semibold text-[#9FB3C8]">아직 댓글이 없습니다</p>:<ul className="mt-3 space-y-3">{comments.map(item=><li key={item.id} className="min-w-0 rounded-xl bg-[#0B2235] p-3 text-sm"><p className="whitespace-pre-wrap break-words">{item.body}</p><time className="mt-2 block text-xs text-[#9FB3C8]">{item.created_at.slice(0,10)}</time>{actorId===item.author_id?<button type="button" onClick={()=>void deleteComment(item.id)} className="min-h-11 text-xs text-[#AEE8EF]">내 댓글 삭제</button>:null}</li>)}</ul>}
      <textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={1000} placeholder="댓글을 입력하세요." className="mt-4 min-h-28 w-full rounded-xl border border-[#29465D] bg-[#050F19] p-3 text-sm"/><button type="button" onClick={()=>void submitComment()} className="mt-3 min-h-11 rounded-xl bg-[#123A57] px-4 text-sm font-black">댓글 서버 저장</button>{commentError?<p role="alert" className="mt-3 text-sm font-bold text-rose-200">{commentError}</p>:null}
    </section>
    <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="font-black">반응</h2><button type="button" aria-pressed={liked} onClick={()=>void toggle()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-4 text-sm font-black"><Heart size={17} fill={liked?"currentColor":"none"}/>도움이 됐어요</button><p className="mt-3 text-xs text-[#9FB3C8]">서버에서 확인된 반응 {count}개</p></div>
    <div className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="flex items-center gap-2 font-black"><Flag size={17}/>신고</h2><select value={reason} onChange={event=>setReason(event.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-[#29465D] bg-[#050F19] px-4 text-sm">{COMMUNITY_REPORT_REASONS.map(value=><option key={value} value={value}>{communityReportReasonLabels[value]}</option>)}</select><textarea value={detail} onChange={event=>setDetail(event.target.value)} maxLength={1000} placeholder="상세 내용 (선택)" className="mt-3 min-h-20 w-full rounded-xl border border-[#29465D] bg-[#050F19] p-3 text-sm"/><button type="button" disabled={isOwnPost} onClick={()=>void submitReport()} className="mt-3 min-h-11 rounded-xl border border-[#79C9D6]/50 px-4 text-sm font-black disabled:opacity-50">신고 내용 준비·제출</button>{isOwnPost?<p className="mt-2 text-xs text-[#9FB3C8]">본인 글은 신고할 수 없습니다.</p>:null}{reportMessage?<p role="status" className="mt-3 text-xs text-[#AEE8EF]">{reportMessage}</p>:null}</div></section>
  </div>;
}
