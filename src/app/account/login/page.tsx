"use client";

import { useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/boat/AppFrame";
import { safeAuthReturnTo } from "@/lib/account/auth-return";
import { SOCIAL_AUTH_CALLBACK_PATH, SOCIAL_AUTH_RETURN_KEY } from "@/lib/account/social-auth";
import { createClient } from "@/lib/supabase/client";

export default function AccountLoginPage() {
  const kakaoReady = process.env.NEXT_PUBLIC_KAKAO_OAUTH_ENABLED === "true";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function continueWith(provider: "kakao" | "google") {
    if (pending) return;
    if (provider === "kakao" && !kakaoReady) return;
    const client = createClient();
    if (!client) { setMessage("현재 환경에 인증 설정이 없습니다."); return; }
    setPending(true);
    setMessage(null);
    try {
      const returnTo = safeAuthReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
      try {
        window.sessionStorage.setItem(SOCIAL_AUTH_RETURN_KEY, returnTo);
      } catch {
        // OAuth still works when browser storage is blocked; completion returns to /account.
      }
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${SOCIAL_AUTH_CALLBACK_PATH}` },
      });
      if (error) {
        try { window.sessionStorage.removeItem(SOCIAL_AUTH_RETURN_KEY); } catch { /* Storage is optional. */ }
        setMessage("소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setMessage("인증 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const client = createClient();
    if (!client) { setMessage("현재 환경에 인증 설정이 없습니다."); return; }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (password.length < 8) { setMessage("비밀번호는 8자 이상 입력해 주세요."); return; }
    setPending(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data: result, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/account/login` },
        });
        if (error) { setMessage("가입을 완료하지 못했습니다. 입력 정보와 잠시 후 재시도를 확인해 주세요."); return; }
        if (!result.session) { setMessage("가입 요청을 받았습니다. 이메일 확인이 필요한 설정이면 받은 편지함을 확인한 뒤 로그인해 주세요."); return; }
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) { setMessage("로그인 정보를 확인해 주세요."); return; }
      }
      window.location.assign(safeAuthReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
    } catch {
      setMessage("인증 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[#29465D] bg-[#0A2031] px-3 text-sm font-semibold text-white outline-none focus:border-[#79C9D6]";
  return <AppFrame><div className="mx-auto max-w-md py-10"><Link href="/account" className="text-sm font-black text-[#79C9D6]">← 계정으로</Link><div className="mt-5 rounded-[28px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><h1 className="text-3xl font-black">계속하기</h1><p className="mt-2 text-sm font-semibold text-[#9FB3C8]">Blue Marina 계정으로 저장한 콘텐츠와 내 활동을 관리합니다.</p><div className="mt-6 space-y-3"><button type="button" disabled={pending || !kakaoReady} onClick={() => void continueWith("kakao")} className="min-h-12 w-full rounded-2xl bg-[#FEE500] px-4 font-black text-[#191919] disabled:opacity-50">{kakaoReady ? "카카오로 계속하기" : "카카오 로그인 준비 중"}</button><button type="button" disabled={pending} onClick={() => void continueWith("google")} className="min-h-12 w-full rounded-2xl border border-[#527087] bg-white px-4 font-black text-[#1A2835] disabled:opacity-50">Google로 계속하기</button></div><div className="my-6 flex items-center gap-3 text-xs font-bold text-[#9FB3C8]"><span className="h-px flex-1 bg-[#29465D]"/>또는 이메일로 계속하기<span className="h-px flex-1 bg-[#29465D]"/></div><form onSubmit={submit}><h2 className="text-lg font-black">{mode === "signup" ? "이메일로 계정 만들기" : "이메일 로그인"}</h2><label className="mt-4 block text-xs font-black text-[#9FB3C8]">이메일<input name="email" type="email" required autoComplete="email" className={inputClass}/></label><label className="mt-4 block text-xs font-black text-[#9FB3C8]">비밀번호<input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={inputClass}/></label><button disabled={pending} className="mt-6 min-h-12 w-full rounded-2xl bg-[#2E8BFF] font-black disabled:opacity-50">{pending ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}</button><button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(null); }} className="mt-3 min-h-11 w-full rounded-xl border border-[#29465D] text-sm font-bold">{mode === "signup" ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 가입하기"}</button>{message ? <p role="status" className="mt-4 text-sm font-bold text-amber-100">{message}</p> : null}</form></div></div></AppFrame>;
}
