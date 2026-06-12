"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  FileText,
  FolderOpen,
  Home,
  Instagram,
  LogOut,
  Newspaper,
  Sparkles,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "대시보드", icon: ChartNoAxesCombined },
  { href: "/create", label: "통합 콘텐츠 생성", icon: Sparkles },
  { href: "/saved", label: "저장 목록", icon: FolderOpen },
  { href: "/notice", label: "알림장", icon: Bell },
  { href: "/newsletter", label: "가정통신문", icon: Newspaper },
  { href: "/homepage", label: "홈페이지 게시글", icon: Home },
  { href: "/blog", label: "블로그", icon: FileText },
  { href: "/instagram", label: "인스타그램", icon: Instagram },
  { href: "/settings", label: "설정", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("게스트");

  useEffect(() => {
    const raw = window.localStorage.getItem("kidsauto.demoUser");
    if (raw) {
      const user = JSON.parse(raw) as { email?: string };
      if (user.email) setEmail(user.email);
    }

    const supabase = createClient();
    void supabase?.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email);
        window.localStorage.setItem("kidsauto.demoUser", JSON.stringify({ id: data.user.id, email: data.user.email, role: "teacher" }));
      }
    });
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    window.localStorage.removeItem("kidsauto.demoUser");
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 border-r border-line bg-white px-4 py-5 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-white">
          <Building2 size={20} />
        </div>
        <div>
          <p className="text-base font-black text-ink">KidsAuto</p>
          <p className="text-xs font-medium text-muted">AI 콘텐츠 운영실</p>
        </div>
      </Link>

      <nav className="mt-8 flex-1 space-y-1">
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

      <div className="border-t border-line pt-4">
        <p className="truncate text-xs font-semibold text-muted">{email}</p>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink"
          onClick={logout}
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
