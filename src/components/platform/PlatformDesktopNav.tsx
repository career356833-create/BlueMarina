"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { desktopNavigation, isPlatformNavItemActive } from "@/lib/platform/navigation";

export function PlatformDesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 lg:flex xl:gap-9" aria-label="주요 메뉴">
      {desktopNavigation.map((item) => {
        const active = isPlatformNavItemActive(pathname, item);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`text-sm font-medium tracking-[0.08em] transition hover:text-[#f3d49a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b477] ${active ? "text-[#f3d49a]" : "text-white/70"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
