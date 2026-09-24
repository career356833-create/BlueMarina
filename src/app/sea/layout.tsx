import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "바다 지도",
  description: "해양 정보와 낚시 포인트를 지도에서 확인합니다."
};

export default function SeaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
