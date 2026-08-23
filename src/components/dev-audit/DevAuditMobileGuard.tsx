"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type DevAuditMobileGuardProps = {
  children: ReactNode;
};

export function DevAuditMobileGuard({ children }: DevAuditMobileGuardProps) {
  const router = useRouter();
  const [desktopAllowed, setDesktopAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateAccess = () => {
      const allowed = mediaQuery.matches;
      setDesktopAllowed(allowed);
      if (!allowed) router.replace("/");
    };

    updateAccess();
    mediaQuery.addEventListener("change", updateAccess);
    return () => mediaQuery.removeEventListener("change", updateAccess);
  }, [router]);

  if (desktopAllowed !== true) {
    return (
      <main className="min-h-screen bg-[#050F19] p-6 text-center text-sm font-bold text-[#9FB3C8]">
        접근 환경을 확인하는 중입니다.
      </main>
    );
  }

  return <>{children}</>;
}
