export type FishAchievementStatus = "locked" | "in_progress" | "earned";

export type FishAchievementTone = "approved" | "warning" | "info" | "draft";

export type FishAchievementKey =
  | "first_discovery"
  | "first_verified_species"
  | "ten_species"
  | "fifty_species"
  | "region_collector"
  | "record_breaker";

export type FishAchievement = {
  id: FishAchievementKey;
  title: string;
  description: string;
  status: FishAchievementStatus;
  tone: FishAchievementTone;
  progress: number;
  target: number;
  earnedAt?: string | null;
  note?: string | null;
};

export type FishAchievementInput = {
  discoveredSpeciesCount: number;
  verifiedSpeciesCount: number;
  regionCount: number;
  bestLength?: number | null;
  bestWeight?: number | null;
  firstDiscoveryAt?: string | null;
  firstVerifiedAt?: string | null;
  now?: string;
};

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildMilestone(
  id: FishAchievementKey,
  title: string,
  description: string,
  achieved: number,
  target: number,
  tone: FishAchievementTone,
  earnedAt?: string | null,
  note?: string | null,
): FishAchievement {
  const progress = target <= 0 ? 0 : clampProgress(Math.round((achieved / target) * 100));
  return {
    id,
    title,
    description,
    status: achieved >= target ? "earned" : achieved > 0 ? "in_progress" : "locked",
    tone,
    progress,
    target,
    earnedAt: achieved >= target ? earnedAt ?? null : null,
    note,
  };
}

export function buildFishAchievements(input: FishAchievementInput): FishAchievement[] {
  const { discoveredSpeciesCount, verifiedSpeciesCount, regionCount, bestLength, bestWeight, firstDiscoveryAt, firstVerifiedAt } = input;

  return [
    buildMilestone(
      "first_discovery",
      "첫 어종 발견",
      "처음으로 도감에 어종을 기록했다.",
      discoveredSpeciesCount,
      1,
      "approved",
      firstDiscoveryAt,
    ),
    buildMilestone(
      "first_verified_species",
      "확정 기록",
      "사용자 확인 또는 전문가 확인으로 도감이 활성화됐다.",
      verifiedSpeciesCount,
      1,
      "info",
      firstVerifiedAt,
    ),
    buildMilestone(
      "ten_species",
      "10종 달성",
      "도감에 10종의 어종을 모았다.",
      discoveredSpeciesCount,
      10,
      "warning",
    ),
    buildMilestone(
      "fifty_species",
      "50종 달성",
      "도감에 50종의 어종을 모았다.",
      discoveredSpeciesCount,
      50,
      "warning",
    ),
    buildMilestone(
      "region_collector",
      "지역 도감가",
      "3개 이상의 지역에서 어종을 기록했다.",
      regionCount,
      3,
      "draft",
    ),
    buildMilestone(
      "record_breaker",
      "최고 기록",
      "최대 크기 또는 최대 무게 기록이 등록됐다.",
      bestLength || bestWeight ? 1 : 0,
      1,
      "approved",
      bestLength || bestWeight ? firstDiscoveryAt ?? null : null,
      bestLength || bestWeight ? "최고 기록이 갱신됐다." : null,
    ),
  ];
}
