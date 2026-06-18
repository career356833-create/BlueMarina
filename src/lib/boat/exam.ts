import {
  DEFAULT_LICENSE_TYPE,
  getAllQuestions,
  getMockExamQuestions,
  getRandomQuestions,
  type LicenseType,
  type Question
} from "@/lib/boat/questions";

export function shuffleQuestions(pool: Question[] = getAllQuestions(DEFAULT_LICENSE_TYPE)) {
  return [...pool].sort(() => Math.random() - 0.5);
}

export function pickRandomQuestions(count: number, pool?: Question[]) {
  if (pool) return shuffleQuestions(pool).slice(0, Math.min(count, pool.length));
  return getRandomQuestions(DEFAULT_LICENSE_TYPE, count);
}

export function pickMockExamQuestions(licenseType: LicenseType = DEFAULT_LICENSE_TYPE, count = 50) {
  return getMockExamQuestions(licenseType, count);
}

export function scoreExam(total: number, correct: number) {
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  return {
    score,
    firstClassPassed: score >= 70,
    secondClassPassed: score >= 60,
    label: score >= 70 ? "1급 합격 가능" : score >= 60 ? "2급 합격 가능" : "추가 학습 필요"
  };
}
