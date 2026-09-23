"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { desktopNavigation, isPlatformNavItemActive } from "@/lib/platform/navigation";
import { cn } from "@/lib/utils";

export function PlatformDesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="주요 메뉴">
      {desktopNavigation.map((item) => {
        const active = isPlatformNavItemActive(pathname, item);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-black text-[#D7E4F6] transition hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79C9D6]",
              active && "bg-[#2E8BFF]/16 text-[#79C9D6]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
