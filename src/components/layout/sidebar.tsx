"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  FileText,
  Home,
  Instagram,
  Newspaper,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "대시보드", icon: ChartNoAxesCombined },
  { href: "/notice", label: "알림장", icon: Bell },
  { href: "/newsletter", label: "가정통신문", icon: Newspaper },
  { href: "/homepage", label: "홈페이지 게시글", icon: Home },
  { href: "/blog", label: "블로그", icon: FileText },
  { href: "/instagram", label: "인스타그램", icon: Instagram },
  { href: "/settings", label: "설정", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 border-r border-line bg-white px-4 py-5 lg:block">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-white">
          <Building2 size={20} />
        </div>
        <div>
          <p className="text-base font-black text-ink">KidsAuto</p>
          <p className="text-xs font-medium text-muted">AI 콘텐츠 운영실</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink",
                active && "bg-brand-50 text-brand-700"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
