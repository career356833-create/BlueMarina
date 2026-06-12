import type { PropsWithChildren } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-surface">
      <MobileNav />
      <div className="mx-auto flex min-h-screen max-w-[1440px] bg-surface">
        <Sidebar />
        <main className="w-full px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
