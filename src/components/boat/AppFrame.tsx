import type { PropsWithChildren } from "react";
import Link from "next/link";
import { Anchor, Bell, Menu } from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

const desktopNav = [
  { href: "/", label: "홈" },
  { href: "/study?license=yacht", label: "면허학습" },
  { href: "/license-guide", label: "면허취득" },
  { href: "/centers", label: "시험장안내" },
  { href: "/official-links", label: "공식신청" },
  { href: "/analysis?license=yacht", label: "학습분석" },
  { href: "/progress?license=yacht", label: "진도율" }
];

export function AppFrame({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-sky-900/10 bg-[#06224a]/95 text-white shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
              <Anchor size={23} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight">Blue Marina</p>
              <p className="truncate text-xs font-semibold text-sky-100">바다로 가는 가장 쉬운 길</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {desktopNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-black text-sky-50 transition hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full text-sky-50 transition hover:bg-white/10 sm:flex" aria-label="알림">
              <Bell size={20} />
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-sky-50 transition hover:bg-white/10 lg:hidden" aria-label="메뉴">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>

      <footer className="mx-auto hidden max-w-6xl items-center justify-center gap-4 px-4 pb-8 text-xs font-bold text-slate-500 lg:flex">
        <span>운영: 암행漁사</span>
        <Link href="/privacy" className="hover:text-sky-700">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="hover:text-sky-700">
          이용약관
        </Link>
        <Link href="/contact" className="hover:text-sky-700">
          문의하기
        </Link>
      </footer>

      <BottomNav />
    </div>
  );
}
