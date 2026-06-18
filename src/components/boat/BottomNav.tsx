"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, ClipboardList, Home, RotateCcw, Trophy } from "lucide-react";
import { normalizeLicenseType, type LicenseType } from "@/lib/boat/questions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/study", label: "학습", icon: BookOpenCheck },
  { href: "/random", label: "랜덤", icon: RotateCcw },
  { href: "/exam", label: "모의", icon: ClipboardList },
  { href: "/analysis", label: "분석", icon: BarChart3 },
  { href: "/progress", label: "진도", icon: Trophy }
];

export function BottomNav() {
  const pathname = usePathname();
  const [licenseType, setLicenseType] = useState<LicenseType>("yacht");

  useEffect(() => {
    setLicenseType(normalizeLicenseType(new URLSearchParams(window.location.search).get("license")));
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sky-100 bg-white/95 shadow-[0_-10px_30px_rgba(15,45,82,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const href = item.href === "/" ? "/" : `${item.href}?license=${licenseType}`;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500",
                active && "text-sky-700"
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
