import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "낚시 포인트",
  description: "출처와 좌표 검토 상태를 보존한 낚시 포인트 정보를 확인합니다."
};

export default function FishingSpotsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
