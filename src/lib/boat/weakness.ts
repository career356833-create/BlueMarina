import { DEFAULT_LICENSE_TYPE, getQuestionsByTag, type LicenseType } from "@/lib/boat/questions";
import { readAnswerHistory, type AnswerHistoryRecord } from "@/lib/boat/storage";

export type WeaknessItem = {
  key: string;
  label: string;
  attempts: number;
  wrong: number;
  wrongRate: number;
  recentWrong: boolean;
  message: string;
};

export type WeaknessAnalysis = {
  status: "ready" | "pending";
  message: string;
  items: WeaknessItem[];
};

function buildPendingAnalysis(target: "태그" | "카테고리"): WeaknessAnalysis {
  return {
    status: "pending",
    message: `문제를 더 풀면 ${target}별 약점 분석이 활성화됩니다.`,
    items: []
  };
}

function analyzeByKey(
  answerHistory: AnswerHistoryRecord[],
  getKeys: (record: AnswerHistoryRecord) => string[],
  labelSuffix: "태그" | "카테고리"
): WeaknessAnalysis {
  const bucket = new Map<string, { attempts: number; wrong: number; recentWrong: boolean }>();

  answerHistory.forEach((record, index) => {
    getKeys(record)
      .filter(Boolean)
      .forEach((key) => {
        const current = bucket.get(key) ?? { attempts: 0, wrong: 0, recentWrong: false };
        bucket.set(key, {
          attempts: current.attempts + 1,
          wrong: current.wrong + (record.correct ? 0 : 1),
          recentWrong: current.recentWrong || (!record.correct && index < 10)
        });
      });
  });

  if (bucket.size === 0) return buildPendingAnalysis(labelSuffix);

  const items = Array.from(bucket.entries())
    .map(([key, value]) => {
      const wrongRate = Math.round((value.wrong / value.attempts) * 100);
      return {
        key,
        label: key,
        attempts: value.attempts,
        wrong: value.wrong,
        wrongRate,
        recentWrong: value.recentWrong,
        message: `${key} ${labelSuffix}가 취약합니다.`
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrong - a.wrong || b.attempts - a.attempts);

  return {
    status: "ready",
    message: "약점 분석이 준비되었습니다.",
    items
  };
}

export function analyzeWeaknessByTags(answerHistory: AnswerHistoryRecord[]): WeaknessAnalysis {
  return analyzeByKey(answerHistory, (record) => record.tags ?? [], "태그");
}

export function analyzeWeaknessByCategory(answerHistory: AnswerHistoryRecord[]): WeaknessAnalysis {
  return analyzeByKey(answerHistory, (record) => [record.category ?? ""], "카테고리");
}

export function getTopWeakTags(limit = 5, licenseType: LicenseType = DEFAULT_LICENSE_TYPE): WeaknessAnalysis {
  const analysis = analyzeWeaknessByTags(readAnswerHistory(licenseType));
  return { ...analysis, items: analysis.items.slice(0, limit) };
}

export function getTopWeakCategories(limit = 5, licenseType: LicenseType = DEFAULT_LICENSE_TYPE): WeaknessAnalysis {
  const analysis = analyzeWeaknessByCategory(readAnswerHistory(licenseType));
  return { ...analysis, items: analysis.items.slice(0, limit) };
}

export function getRecommendedReviewQuestions(limit = 10, licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  const topTag = getTopWeakTags(1, licenseType).items[0]?.label;
  if (!topTag) return [];
  return getQuestionsByTag(licenseType, topTag).slice(0, limit);
}
