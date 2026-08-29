import { Suspense, type PropsWithChildren } from "react";
import Link from "next/link";
import { Anchor, Bell, Menu } from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

const desktopNav = [
  { href: "/", label: "HOME" },
  { href: "/sea", label: "SEA" },
  { href: "/fishing-spots", label: "FISHING" },
  { href: "/fish", label: "FISH" },
  { href: "/coming-soon?section=%EB%A7%88%EC%BC%93&feature=%EB%A7%88%EC%BC%93", label: "MARKET" },
  { href: "/license-guide", label: "GUIDE" }
];

export function AppFrame({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050F19] text-white">
      <header className="sticky top-0 z-40 border-b border-[#1F3A50] bg-[#071827]/96 text-white backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2E8BFF] text-white">
              <Anchor size={23} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight text-white">Blue Marina</p>
              <p className="truncate text-xs font-semibold text-[#9FB3C8]">바다 현장형 PWA</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {desktopNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-black text-[#D7E4F6] transition hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-[#D7E4F6] transition hover:bg-white/8 sm:flex"
              aria-label="알림"
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#D7E4F6] transition hover:bg-white/8 lg:hidden"
              aria-label="메뉴"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1440px] overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <footer className="mx-auto hidden max-w-[1440px] items-center justify-center gap-4 px-4 pb-8 text-xs font-bold text-[#6E8299] lg:flex">
        <span>운영: Blue Marina</span>
        <Link href="/privacy" className="hover:text-[#2E8BFF]">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="hover:text-[#2E8BFF]">
          이용약관
        </Link>
        <Link href="/contact" className="hover:text-[#2E8BFF]">
          문의하기
        </Link>
      </footer>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
