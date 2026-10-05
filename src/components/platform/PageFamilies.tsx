import { Suspense, type ReactNode } from "react";
import { LearningNavigation } from "./LearningNavigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export function DetailFrame({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "reading" }) {
  return <AppFrame family="detail"><div className={`bm-detail-page mx-auto w-full ${width === "wide" ? "max-w-[1180px]" : "max-w-4xl"}`}>{children}</div></AppFrame>;
}

export function DetailBackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="bm-detail-back inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold"><ArrowLeft size={17} aria-hidden="true" />{children}</Link>;
}

export function DetailSection({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`bm-detail-section p-5 sm:p-7 ${className}`}><h2 className="text-xl font-bold sm:text-2xl">{title}</h2>{children}</section>;
}

export function LearningFrame({ children }: { children: ReactNode }) {
  return <AppFrame family="content"><div className="bm-learning-page mx-auto w-full max-w-[var(--bm-content-reading)] p-4 sm:p-7 lg:p-9"><LearningNav />{children}</div></AppFrame>;
}

export function LearningNav() {
  return <Suspense fallback={<nav aria-label="학습 빠른 이동"><Link href="/license-guide" className="inline-flex min-h-11 items-center px-4">학습 안내</Link></nav>}><LearningNavigation /></Suspense>;
}

export function FormFrame({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "reading" | "narrow" }) {
  const maxWidth = width === "narrow" ? "max-w-md" : width === "reading" ? "max-w-4xl" : "max-w-6xl";
  return <AppFrame family="utility"><div className={`bm-form-page mx-auto w-full ${maxWidth}`}>{children}</div></AppFrame>;
}

export function StatusNotice({ tone, title, children }: { tone: "info" | "success" | "warning" | "danger" | "blocked" | "limited"; title: string; children?: ReactNode }) {
  return <aside className="bm-status-notice p-4 sm:p-5" data-tone={tone} role={tone === "danger" || tone === "blocked" ? "alert" : "note"}><p className="font-bold">{title}</p>{children ? <div className="mt-2 text-sm leading-6">{children}</div> : null}</aside>;
}

export function DetailUnavailable({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return <DetailFrame width="reading"><section className="bm-empty-state my-6 px-6 py-12 text-center sm:my-12 sm:px-10 sm:py-16">
    <p className="bm-eyebrow">Information unavailable</p>
    <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
    <p className="bm-lede mx-auto mt-4 max-w-xl text-sm">{description}</p>
    <Link href={href} className="bm-action mt-7 px-6">{action}</Link>
  </section></DetailFrame>;
}
