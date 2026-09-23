"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, BookOpen, Compass, Fish, Home, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlatformNavItemActive, mobileNavigation } from "@/lib/platform/navigation";

const icons = { home: Home, sea: Compass, charter: Anchor, fishing: MapPin, fish: Fish, market: ShoppingBag, guide: BookOpen } as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1F3A50] bg-[#071827]/96 text-white backdrop-blur lg:hidden">
      <div className="mx-auto grid h-[64px] max-w-[420px] grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {mobileNavigation.map((item) => {
          const Icon = icons[item.id as keyof typeof icons];
          const active = isPlatformNavItemActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#9FB3C8] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#79C9D6]",
                active && "text-[#2E8BFF]"
              )}
            >
              <Icon size={19} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
