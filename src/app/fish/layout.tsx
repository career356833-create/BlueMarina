import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "어종 도감",
  description: "바다낚시와 해양레저에서 만나는 어종을 제철, 서식지, 낚시 팁과 주의사항 중심으로 확인합니다."
};

export default function FishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
