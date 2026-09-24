import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "페이지를 찾을 수 없음", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <AppFrame>
      <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center py-10 text-center">
        <div className="w-full rounded-[28px] border border-dashed border-[#29465D] bg-[#071827] px-6 py-12 sm:px-10">
          <Compass className="mx-auto text-[#79C9D6]" size={38} aria-hidden="true" />
          <p className="mt-5 text-xs font-black tracking-[.2em] text-[#79C9D6]">ROUTE NOT FOUND</p>
          <h1 className="mt-3 text-3xl font-black">요청한 정보를 찾을 수 없습니다</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#9FB3C8]">주소가 올바른지 확인하거나 Blue Marina의 주요 서비스에서 다시 시작하세요.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2E8BFF] px-5 text-sm font-black"><Home size={16} />홈으로</Link>
            <Link href="/sea" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#29465D] px-5 text-sm font-black"><Compass size={16} />바다 지도</Link>
          </div>
        </div>
      </section>
    </AppFrame>
  );
}
