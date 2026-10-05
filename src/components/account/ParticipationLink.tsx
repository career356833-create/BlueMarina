"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeAuthReturnTo } from "@/lib/account/auth-return";

/** Login first for a new participant; retain the exact, internal action context. */
export function ParticipationLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const target = safeAuthReturnTo(href), login = `/account/login?returnTo=${encodeURIComponent(target)}`;
  return <Link href={login} className={className} aria-busy={pending} onClick={async event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); if (pending) return; setPending(true);
    // A cached session can survive expiry, revocation or QA account suspension.
    // Validate with Auth before skipping the login entry.
    try { const result = await createClient()?.auth.getUser(); router.push(result?.data.user && !result.error ? target : login); }
    catch { router.push(login); }
    finally { setPending(false); }
  }}>{children}</Link>;
}
