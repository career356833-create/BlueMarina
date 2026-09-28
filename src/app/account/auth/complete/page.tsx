"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/boat/AppFrame";
import { createClient } from "@/lib/supabase/client";
import { SOCIAL_AUTH_RETURN_KEY, socialAuthReturnTo } from "@/lib/account/social-auth";

export default function AccountAuthCompletePage() {
  const [message, setMessage] = useState("로그인 세션을 확인하고 있습니다.");

  useEffect(() => {
    let active = true;
    async function complete() {
      const client = createClient();
      if (!client) { setMessage("현재 환경에 인증 설정이 없습니다."); return; }
      try {
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        if (error || !data.session) {
          setMessage("로그인 세션을 확인하지 못했습니다. 다시 시도해 주세요.");
          return;
        }
        let returnTo = "/account";
        try {
          returnTo = socialAuthReturnTo(window.sessionStorage.getItem(SOCIAL_AUTH_RETURN_KEY));
          window.sessionStorage.removeItem(SOCIAL_AUTH_RETURN_KEY);
        } catch {
          // Storage may be unavailable; the account home remains the fallback.
        }
        window.location.replace(returnTo);
      } catch {
        if (active) setMessage("인증 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
    void complete();
    return () => { active = false; };
  }, []);

  return <AppFrame family="utility"><div className="mx-auto max-w-md py-10"><div role="status" className="rounded-[28px] border border-[#1F3A50] bg-[#071827] p-6 sm:p-8"><h1 className="text-2xl font-black">계정 연결</h1><p className="mt-3 text-sm font-semibold text-[#B8CBDD]">{message}</p><Link href="/account/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-black text-[#79C9D6]">로그인으로 돌아가기</Link></div></div></AppFrame>;
}
