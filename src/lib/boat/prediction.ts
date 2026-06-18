import type { ExamHistoryRecord } from "@/lib/boat/storage";

export type PassPrediction = {
  expectedScore: number;
  passRate: number;
  verdict: "합격 가능" | "주의 필요" | "추가 학습 필요";
  recentAverageScore: number;
  bestScore: number;
  grade1PassRisk: "낮음" | "보통" | "높음";
  grade2PassRisk: "낮음" | "보통" | "높음";
  recommendedWeakTags: string[];
  message: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRisk(score: number, passScore: number): "낮음" | "보통" | "높음" {
  if (score >= passScore + 8) return "낮음";
  if (score >= passScore) return "보통";
  return "높음";
}

export function getExamScoreStats(history: ExamHistoryRecord[]) {
  const scores = history.map((record) => record.score);
  const recent = scores[0] ?? 0;
  const best = scores.length === 0 ? 0 : Math.max(...scores);
  const average = scores.length === 0 ? 0 : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  return { recent, best, average };
}

export function predictPass(history: ExamHistoryRecord[], recommendedWeakTags: string[] = []): PassPrediction {
  const recentFive = history.slice(0, 5);
  const recentAverageScore =
    recentFive.length === 0
      ? 0
      : Math.round(recentFive.reduce((sum, record) => sum + record.score, 0) / recentFive.length);
  const bestScore = history.length === 0 ? 0 : Math.max(...history.map((record) => record.score));
  const trendBonus = recentFive.length >= 2 && recentFive[0].score > recentFive[recentFive.length - 1].score ? 4 : 0;
  const passRate = recentAverageScore === 0 ? 0 : clamp(Math.round(recentAverageScore * 1.08 + trendBonus), 25, 96);
  const verdict = recentAverageScore >= 70 ? "합격 가능" : recentAverageScore >= 60 ? "주의 필요" : "추가 학습 필요";

  return {
    expectedScore: recentAverageScore,
    passRate,
    verdict,
    recentAverageScore,
    bestScore,
    grade1PassRisk: getRisk(recentAverageScore, 70),
    grade2PassRisk: getRisk(recentAverageScore, 60),
    recommendedWeakTags,
    message:
      recentAverageScore === 0
        ? "모의고사를 1회 이상 응시하면 합격예측이 활성화됩니다."
        : recommendedWeakTags.length > 0
          ? `최근 ${recentFive.length}회 모의고사 기준 ${verdict} 상태입니다. 취약 태그를 우선 복습하세요.`
          : `최근 ${recentFive.length}회 모의고사 기준 ${verdict} 상태입니다.`
  };
}
