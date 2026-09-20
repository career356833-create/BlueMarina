"use client";

import { useState } from "react";
import { Flag, Heart, MessageCircle } from "lucide-react";
import { communityReportReasonLabels } from "@/lib/community/route-helpers";
import { COMMUNITY_REPORT_REASONS } from "@/lib/community/types";
import { prepareCommunityReport, validateCommunityComment } from "@/lib/community/validation";

export function CommunityInteractions({ postId }: { postId: string }) {
  const [comment,setComment]=useState(""),[preparedComment,setPreparedComment]=useState<string|null>(null),[commentError,setCommentError]=useState<string|null>(null);
  const [liked,setLiked]=useState(false),[reason,setReason]=useState("SPAM"),[detail,setDetail]=useState(""),[reportPrepared,setReportPrepared]=useState(false);
  const prepareComment=()=>{const result=validateCommunityComment(comment);if(!result.valid){setCommentError(result.errors.join(" "));setPreparedComment(null);return}setCommentError(null);setPreparedComment(result.body)};
  const prepareReport=()=>{const report=prepareCommunityReport("POST",postId,reason,detail);setReportPrepared(Boolean(report))};
  return <div className="mt-5 space-y-5">
    <section className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="flex items-center gap-2 font-black"><MessageCircle size={18}/>댓글</h2><p className="mt-3 text-sm font-semibold text-[#9FB3C8]">아직 댓글이 없습니다</p><textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={1000} placeholder="댓글을 로컬 검토용으로 준비합니다." className="mt-4 min-h-28 w-full rounded-xl border border-[#29465D] bg-[#050F19] p-3 text-sm"/><button type="button" onClick={prepareComment} className="mt-3 min-h-11 rounded-xl bg-[#123A57] px-4 text-sm font-black">댓글 내용 준비</button>{commentError?<p className="mt-3 text-sm font-bold text-rose-200">{commentError}</p>:null}{preparedComment?<div className="mt-3 rounded-xl bg-[#0B2235] p-3 text-sm text-[#D7E4F6]"><strong>로컬 미리보기:</strong> {preparedComment}<p className="mt-2 text-xs text-[#9FB3C8]">서버에 저장되지 않았습니다.</p></div>:null}</section>
    <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="font-black">반응</h2><button type="button" aria-pressed={liked} onClick={()=>setLiked(value=>!value)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-4 text-sm font-black"><Heart size={17} fill={liked?"currentColor":"none"}/>{liked?"내 기기에서 표시됨":"도움이 됐어요"}</button><p className="mt-3 text-xs leading-5 text-[#9FB3C8]">누적 반응 수를 생성하거나 서버 저장을 주장하지 않습니다.</p></div>
    <div className="rounded-[24px] border border-[#1F3A50] bg-[#071827] p-5"><h2 className="flex items-center gap-2 font-black"><Flag size={17}/>신고 준비</h2><select value={reason} onChange={event=>setReason(event.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-[#29465D] bg-[#050F19] px-3 text-sm">{COMMUNITY_REPORT_REASONS.map(value=><option key={value} value={value}>{communityReportReasonLabels[value]}</option>)}</select><textarea value={detail} onChange={event=>setDetail(event.target.value)} maxLength={1000} placeholder="상세 내용 (선택)" className="mt-3 min-h-20 w-full rounded-xl border border-[#29465D] bg-[#050F19] p-3 text-sm"/><button type="button" onClick={prepareReport} className="mt-3 min-h-11 rounded-xl border border-[#79C9D6]/50 px-4 text-sm font-black">신고 내용 준비</button>{reportPrepared?<p className="mt-3 text-xs font-bold text-[#AEE8EF]">신고 내용이 이 화면에서 준비됐습니다. 서버 접수는 되지 않았습니다.</p>:null}</div></section>
  </div>;
}
