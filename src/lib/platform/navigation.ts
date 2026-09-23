export type PlatformNavItem = {
  id: "home" | "sea" | "fishing" | "fish" | "market" | "guide" | "charter";
  label: string;
  href: string;
  activePaths: readonly string[];
};

export type PlatformServiceEntry = {
  id: "today-sea" | "sea" | "fishing" | "charter" | "fish" | "market" | "community" | "guide";
  title: string;
  description: string;
  href: string;
  availability: "ACTIVE" | "BACKEND_LIMITED";
  priority: "PRIMARY" | "SECONDARY";
};

export const desktopNavigation: readonly PlatformNavItem[] = [
  { id: "home", label: "HOME", href: "/", activePaths: ["/"] },
  { id: "sea", label: "SEA", href: "/sea", activePaths: ["/sea", "/today-sea"] },
  {
    id: "fishing",
    label: "FISHING",
    href: "/fishing-spots",
    activePaths: ["/fishing-spots", "/charters", "/reservations"]
  },
  { id: "fish", label: "FISH", href: "/fish", activePaths: ["/fish"] },
  { id: "market", label: "MARKET", href: "/market", activePaths: ["/market"] },
  {
    id: "guide",
    label: "GUIDE",
    href: "/license-guide",
    activePaths: [
      "/license-guide",
      "/exam-guide",
      "/safety-guide",
      "/license-issue",
      "/leisure-report",
      "/official-links",
      "/centers",
      "/study",
      "/theory",
      "/exam",
      "/random",
      "/wrong",
      "/progress",
      "/analysis",
      "/practice",
      "/past"
    ]
  }
] as const;

export const mobileNavigation: readonly PlatformNavItem[] = [
  { id: "home", label: "홈", href: "/", activePaths: ["/"] },
  { id: "sea", label: "바다", href: "/sea", activePaths: ["/sea", "/today-sea"] },
  { id: "charter", label: "출조", href: "/charters", activePaths: ["/charters", "/reservations"] },
  { id: "fish", label: "어종", href: "/fish", activePaths: ["/fish"] },
  {
    id: "guide",
    label: "가이드",
    href: "/license-guide",
    activePaths: ["/license-guide", "/exam-guide", "/safety-guide", "/license-issue", "/leisure-report", "/official-links", "/centers", "/study", "/theory", "/exam", "/random", "/wrong", "/progress", "/analysis", "/practice", "/past"]
  }
] as const;

export const platformServiceEntries: readonly PlatformServiceEntry[] = [
  { id: "today-sea", title: "오늘의 바다", description: "물때와 해양 기상", href: "/today-sea", availability: "ACTIVE", priority: "PRIMARY" },
  { id: "sea", title: "바다 지도", description: "해역과 거점 탐색", href: "/sea", availability: "ACTIVE", priority: "PRIMARY" },
  { id: "fishing", title: "낚시 포인트", description: "지역과 어종별 포인트", href: "/fishing-spots", availability: "ACTIVE", priority: "PRIMARY" },
  { id: "charter", title: "출조 찾기", description: "검증된 출조 정보 탐색", href: "/charters", availability: "BACKEND_LIMITED", priority: "PRIMARY" },
  { id: "fish", title: "어종 도감", description: "어종 정보와 조건", href: "/fish", availability: "ACTIVE", priority: "PRIMARY" },
  { id: "market", title: "마켓", description: "지역 기반 해양 장비", href: "/market", availability: "BACKEND_LIMITED", priority: "PRIMARY" },
  { id: "community", title: "커뮤니티", description: "바다 경험과 질문", href: "/community", availability: "BACKEND_LIMITED", priority: "SECONDARY" },
  { id: "guide", title: "면허·가이드", description: "면허와 안전 학습", href: "/license-guide", availability: "ACTIVE", priority: "SECONDARY" }
] as const;

function matchesPath(pathname: string, target: string) {
  return target === "/" ? pathname === "/" : pathname === target || pathname.startsWith(`${target}/`);
}

export function isPlatformNavItemActive(pathname: string, item: PlatformNavItem) {
  return item.activePaths.some((path) => matchesPath(pathname, path));
}
