"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartNoAxesCombined, FileText, FolderOpen, LogOut, Menu, Newspaper, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "대시보드", icon: ChartNoAxesCombined },
  { href: "/create", label: "통합생성", icon: Sparkles },
  { href: "/saved", label: "저장", icon: FolderOpen },
  { href: "/newsletter", label: "통신문", icon: Newspaper },
  { href: "/blog", label: "블로그", icon: FileText },
  { href: "/settings", label: "설정", icon: Settings }
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem("kidsauto.demoUser");
    if (raw) {
      const user = JSON.parse(raw) as { email?: string };
      setEmail(user.email ?? "");
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
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2 text-sm font-black">
          <Menu size={18} />
          KidsAuto
        </div>
        <button type="button" className="flex max-w-[180px] items-center gap-2 truncate text-xs font-semibold text-muted" onClick={logout}>
          <span className="truncate">{email || "게스트"}</span>
          <LogOut size={15} />
        </button>
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
