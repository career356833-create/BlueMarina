"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const destinations = [
  ["/license-guide", "학습 안내"], ["/study", "문제은행"],
  ["/theory", "이론·용어"], ["/exam", "모의고사"],
  ["/wrong", "오답 복습"], ["/progress", "학습 진도"],
  ["/analysis", "학습 분석"], ["/practice", "실기학습"],
] as const;

export function LearningNavigation() {
  const pathname = usePathname();
  const query = useSearchParams();
  const license = query.get("license") === "yacht" ? "yacht" : "general";
  return <nav aria-label="학습 빠른 이동" className="bm-learning-nav mb-6 flex flex-wrap gap-2">
    {destinations.map(([href, label]) => <Link key={href}
      href={`${href}?license=${license}`} aria-current={pathname === href ? "page" : undefined}
      className="inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bm-brand-accent)]">{label}</Link>)}
  </nav>;
}
