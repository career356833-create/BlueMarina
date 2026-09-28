import { Suspense, type PropsWithChildren } from "react";
import { BottomNav } from "@/components/boat/BottomNav";
import { InformationFooterLinks } from "@/components/boat/InformationNavigation";

type PageFamily = "default" | "discovery" | "content" | "detail" | "utility";

export function AppFrame({ children, family = "default" }: PropsWithChildren<{ family?: PageFamily }>) {
  return (
    <div className="bm-frame min-h-[calc(100svh-var(--bm-header-height))] overflow-x-hidden" data-page-family={family}>
      <main className="bm-frame-main mx-auto min-h-[calc(100vh-var(--bm-header-height))] w-full overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <footer className="bm-frame-main mx-auto hidden items-center justify-center gap-4 px-4 pb-8 text-xs font-semibold text-marine-secondary lg:flex">
        <span>운영: Blue Marina</span>
        <InformationFooterLinks />
      </footer>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
