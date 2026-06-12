import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatContentType(type: string) {
  const names: Record<string, string> = {
    notice: "알림장",
    newsletter: "가정통신문",
    homepage: "홈페이지 게시글",
    blog: "블로그",
    instagram: "인스타그램"
  };

  return names[type] ?? type;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
