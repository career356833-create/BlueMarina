"use client";
import { useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/boat/AppFrame";
import { createClient } from "@/lib/supabase/client";

export default function AccountLoginPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const client = createClient();
    if (!client) { setMessage("현재 환경에 인증 설정이 없습니다."); return; }
    const data = new FormData(event.currentTarget);
    const { error } = await client.auth.signInWithPassword({ email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") });
    if (error) { setMessage("로그인 정보를 확인해 주세요."); return; }
    window.location.assign("/account");
  }
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[#29465D] bg-[#0A2031] px-3 text-sm font-semibold text-white outline-none focus:border-[#79C9D6]";
  return <AppFrame><div className="mx-auto max-w-md py-10"><Link href="/account" className="text-sm font-black text-[#79C9D6]">← 계정으로</Link><form onSubmit={submit} className="mt-5 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><h1 className="text-3xl font-black">로그인</h1><p className="mt-2 text-sm font-semibold text-[#9FB3C8]">Supabase Auth에 등록된 Blue Marina 계정을 사용합니다.</p><label className="mt-6 block text-xs font-black text-[#9FB3C8]">이메일<input name="email" type="email" required autoComplete="email" className={inputClass}/></label><label className="mt-4 block text-xs font-black text-[#9FB3C8]">비밀번호<input name="password" type="password" required autoComplete="current-password" className={inputClass}/></label><button className="mt-6 min-h-12 w-full rounded-2xl bg-[#2E8BFF] font-black">로그인</button>{message ? <p role="alert" className="mt-4 text-sm font-bold text-amber-100">{message}</p> : null}</form></div></AppFrame>;
}
