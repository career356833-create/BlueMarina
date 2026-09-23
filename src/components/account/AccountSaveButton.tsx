"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AccountSavedEntityType } from "@/lib/account/types";

type Props = { entityType: AccountSavedEntityType; entityId: string; label: string; href: string };

export function AccountSaveButton(props: Props) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "auth" | "unavailable">("idle");

  useEffect(() => {
    const client = createClient();
    if (!client) { setState("unavailable"); return; }
    client.auth.getSession().then(({ data }) => setState(data.session ? "idle" : "auth"));
  }, []);

  async function save() {
    const client = createClient();
    if (!client) { setState("unavailable"); return; }
    const { data } = await client.auth.getSession();
    if (!data.session) { setState("auth"); return; }
    setState("saving");
    const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(props) });
    setState(response.ok ? "saved" : response.status === 401 ? "auth" : "unavailable");
  }

  return <button type="button" onClick={save} disabled={state === "saving" || state === "saved"} aria-pressed={state === "saved"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#79C9D6]/45 bg-[#071827]/85 px-4 text-sm font-black text-[#D7F4F7] disabled:opacity-70">
    <Bookmark size={17} fill={state === "saved" ? "currentColor" : "none"} />
    {state === "saved" ? "저장됨" : state === "saving" ? "저장 중" : state === "auth" ? "로그인 후 저장" : state === "unavailable" ? "저장 기능 준비 중" : "내 계정에 저장"}
  </button>;
}
