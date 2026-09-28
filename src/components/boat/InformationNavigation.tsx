"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const informationPages = [
  ["/privacy", "개인정보처리방침"],
  ["/terms", "이용약관"],
  ["/contact", "문의하기"],
] as const;

function safeReturnPath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://blue-marina.invalid");
    if (url.origin !== "https://blue-marina.invalid" || /^\/(?:api|_next)(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function InformationFooterLinks() {
  const pathname = usePathname() || "/";
  return informationPages.map(([href, label]) => (
    <Link key={href} href={`${href}?from=${encodeURIComponent(pathname)}`} className="hover:text-[#2E8BFF]">
      {label}
    </Link>
  ));
}

export function PageBackButton() {
  const router = useRouter();

  function goBack() {
    const from = new URLSearchParams(window.location.search).get("from");
    const path = safeReturnPath(from);
    router.push(path && path.split("?", 1)[0] !== window.location.pathname ? path : "/");
  }

  return (
    <button type="button" onClick={goBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] bg-[#071827] px-4 text-sm font-black text-[#D7E4F6] transition hover:border-[#79C9D6] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79C9D6]">
      <ArrowLeft size={17} aria-hidden="true" /> 이전 화면으로
    </button>
  );
}
