import { Suspense, type PropsWithChildren } from "react";
import { BottomNav } from "@/components/boat/BottomNav";
import { InformationFooterLinks } from "@/components/boat/InformationNavigation";

export function AppFrame({ children }: PropsWithChildren) {
  return (
    <div className="min-h-[calc(100svh-5rem)] overflow-x-hidden bg-[#050F19] text-white">
      <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-[1440px] overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <footer className="mx-auto hidden max-w-[1440px] items-center justify-center gap-4 px-4 pb-8 text-xs font-bold text-[#6E8299] lg:flex">
        <span>운영: Blue Marina</span>
        <InformationFooterLinks />
      </footer>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
