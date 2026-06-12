"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("teacher@kidsauto.kr");
  const [password, setPassword] = useState("password1234");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    if (!supabase) {
      window.localStorage.setItem("kidsauto.demoUser", JSON.stringify({ email, role: "teacher" }));
      router.push("/dashboard");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.localStorage.setItem("kidsauto.demoUser", JSON.stringify({ email, role: "teacher" }));
    router.push("/dashboard");
  }

  async function loginWithGoogle() {
    const supabase = createClient();
    if (!supabase) {
      window.localStorage.setItem("kidsauto.demoUser", JSON.stringify({ email: "google-demo@kidsauto.kr", role: "teacher" }));
      router.push("/dashboard");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="rounded-md border border-line bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-black text-brand-700">KidsAuto</p>
          <h1 className="mt-2 text-2xl font-black text-ink">교사용 로그인</h1>
          <p className="mt-2 text-sm text-muted">Supabase Auth 이메일/비밀번호 로그인을 사용합니다.</p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Mail size={16} />
              이메일
            </span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
              <LockKeyhole size={16} />
              비밀번호
            </span>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>

          {message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p>}

          <Button className="w-full" onClick={login} disabled={loading}>
            <LogIn size={17} />
            로그인
          </Button>

          <Button className="w-full" variant="secondary" onClick={loginWithGoogle} disabled={loading}>
            <Chrome size={17} />
            Google로 계속하기
          </Button>
        </div>
      </div>
    </div>
  );
}
