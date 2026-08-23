"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Compass, Home, LayoutGrid, MessageCircle, Ship } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: Home, activePath: "/" },
  { href: "/sea", label: "바다", icon: Compass, activePath: "/sea" },
  { href: "/fish", label: "낚시", icon: MessageCircle, activePath: "/fish" },
  {
    href: "/coming-soon?section=%EB%A7%88%EC%BC%93&feature=%EB%A7%88%EC%BC%93",
    label: "마켓",
    icon: Ship,
    activePath: "/coming-soon",
    activeSection: "마켓"
  },
  {
    href: "/license-guide",
    label: "MY",
    icon: LayoutGrid,
    activePath: "/license-guide"
  }
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1F3A50] bg-[#071827]/96 text-white backdrop-blur lg:hidden">
      <div className="mx-auto grid h-[64px] max-w-[420px] grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.activePath &&
            (item.activePath !== "/coming-soon" || searchParams.get("section") === item.activeSection);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#9FB3C8] transition",
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
