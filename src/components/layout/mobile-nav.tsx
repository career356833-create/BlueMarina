"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartNoAxesCombined, FileText, Instagram, Menu, Newspaper, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "대시보드", icon: ChartNoAxesCombined },
  { href: "/notice", label: "알림장", icon: Bell },
  { href: "/newsletter", label: "통신문", icon: Newspaper },
  { href: "/blog", label: "블로그", icon: FileText },
  { href: "/instagram", label: "인스타", icon: Instagram },
  { href: "/settings", label: "설정", icon: Settings }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2 text-sm font-black">
          <Menu size={18} />
          KidsAuto
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-6 border-t border-line bg-white lg:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted",
                active && "text-brand-700"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
