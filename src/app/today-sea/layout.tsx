import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "오늘의 바다",
  description: "물때, 조석, 해상 날씨 등 오늘의 바다 정보를 확인합니다."
};

export default function TodaySeaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
