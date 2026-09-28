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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-marine-border bg-marine-background/95 text-marine-foreground shadow-[0_-12px_30px_rgba(0,0,0,.18)] backdrop-blur lg:hidden" aria-label="모바일 주요 메뉴">
      <div className="mx-auto grid h-[calc(var(--bm-bottom-nav-height)+env(safe-area-inset-bottom))] max-w-[420px] grid-cols-5 pb-[env(safe-area-inset-bottom)]">
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
                "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-marine-secondary transition hover:text-marine-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-marine-accent",
                active && "border-t-2 border-marine-accent bg-white/[.04] text-marine-accent"
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
