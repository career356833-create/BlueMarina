"use client";

import { categories, DEFAULT_LICENSE_TYPE, getQuestionById, normalizeLicenseType, type LicenseType, type Question } from "@/lib/boat/questions";

const storagePrefix = "blue-marina";

function storageKey(licenseType: LicenseType, name: "wrong" | "progress" | "exam-history" | "answer-history") {
  return `${storagePrefix}:${licenseType}:${name}`;
}

export type ProgressRecord = {
  totalAttempts: number;
  solvedIds: number[];
  correctIds: number[];
  wrongIds: number[];
  categorySolved: Record<string, number[]>;
};

export type ExamHistoryRecord = {
  id: string;
  total: number;
  correct: number;
  score: number;
  firstClassPassed: boolean;
  secondClassPassed: boolean;
  createdAt: string;
};

export type AnswerHistoryRecord = {
  questionId: number;
  licenseType: LicenseType;
  category: string;
  subCategory: string;
  detailCategory: string;
  tags: string[];
  correct: boolean;
  answeredAt: string;
};

function createEmptyProgress(): ProgressRecord {
  return {
    totalAttempts: 0,
    solvedIds: [],
    correctIds: [],
    wrongIds: [],
    categorySolved: Object.fromEntries(categories.map((category) => [category, []]))
  };
}

function uniq(values: number[]) {
  return Array.from(new Set(values));
}

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<number | string>;
    return parsed.map(Number).filter((id) => Number.isInteger(id));
  } catch {
    return [];
  }
}

export function readWrongIds(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return [];
  return parseIds(window.localStorage.getItem(storageKey(licenseType, "wrong")));
}

export function saveWrongQuestion(questionId: number, licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(licenseType, "wrong"), JSON.stringify(uniq([questionId, ...readWrongIds(licenseType)])));
}

export function removeWrongQuestion(questionId: number, licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(licenseType, "wrong"), JSON.stringify(readWrongIds(licenseType).filter((id) => id !== questionId)));
}

export function readWrongQuestions(licenseType: LicenseType = DEFAULT_LICENSE_TYPE): Question[] {
  return readWrongIds(licenseType)
    .map((id) => getQuestionById(id, licenseType))
    .filter((question): question is Question => Boolean(question));
}

export function readProgress(licenseType: LicenseType = DEFAULT_LICENSE_TYPE): ProgressRecord {
  const emptyProgress = createEmptyProgress();
  if (typeof window === "undefined") return emptyProgress;

  const raw = window.localStorage.getItem(storageKey(licenseType, "progress"));
  if (!raw) return emptyProgress;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressRecord>;
    return {
      ...emptyProgress,
      ...parsed,
      totalAttempts: parsed.totalAttempts ?? parsed.solvedIds?.length ?? 0,
      solvedIds: (parsed.solvedIds ?? []).map(Number),
      correctIds: (parsed.correctIds ?? []).map(Number),
      wrongIds: (parsed.wrongIds ?? []).map(Number),
      categorySolved: {
        ...emptyProgress.categorySolved,
        ...(parsed.categorySolved ?? {})
      }
    };
  } catch {
    return emptyProgress;
  }
}

export function recordAnswer(question: Question, isCorrect: boolean) {
  if (typeof window === "undefined") return;
  const licenseType = normalizeLicenseType(question.licenseType);
  const progress = readProgress(licenseType);
  const next: ProgressRecord = {
    totalAttempts: progress.totalAttempts + 1,
    solvedIds: uniq([...progress.solvedIds, question.id]),
    correctIds: isCorrect ? uniq([...progress.correctIds, question.id]) : progress.correctIds.filter((id) => id !== question.id),
    wrongIds: isCorrect ? progress.wrongIds.filter((id) => id !== question.id) : uniq([...progress.wrongIds, question.id]),
    categorySolved: {
      ...progress.categorySolved,
      [question.category]: uniq([...(progress.categorySolved[question.category] ?? []), question.id])
    }
  };

  window.localStorage.setItem(storageKey(licenseType, "progress"), JSON.stringify(next));

  if (isCorrect) {
    removeWrongQuestion(question.id, licenseType);
  } else {
    saveWrongQuestion(question.id, licenseType);
  }

  saveAnswerHistory({
    questionId: question.id,
    licenseType,
    category: question.category,
    subCategory: question.subCategory,
    detailCategory: question.detailCategory,
    tags: question.tags,
    correct: isCorrect,
    answeredAt: new Date().toISOString()
  }, licenseType);
}

export function readAnswerHistory(licenseType: LicenseType = DEFAULT_LICENSE_TYPE): AnswerHistoryRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(licenseType, "answer-history"));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AnswerHistoryRecord[];
  } catch {
    return [];
  }
}

export function saveAnswerHistory(record: AnswerHistoryRecord, licenseType: LicenseType = record.licenseType ?? DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(licenseType, "answer-history"), JSON.stringify([record, ...readAnswerHistory(licenseType)].slice(0, 1000)));
}

export function readExamHistory(licenseType: LicenseType = DEFAULT_LICENSE_TYPE): ExamHistoryRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(licenseType, "exam-history"));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ExamHistoryRecord[];
  } catch {
    return [];
  }
}

export function saveExamHistory(record: Omit<ExamHistoryRecord, "id" | "createdAt">, licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return;
  const next: ExamHistoryRecord = {
    ...record,
    id: `${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(storageKey(licenseType, "exam-history"), JSON.stringify([next, ...readExamHistory(licenseType)].slice(0, 20)));
}

export function resetProgress(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(licenseType, "progress"));
  window.localStorage.removeItem(storageKey(licenseType, "wrong"));
  window.localStorage.removeItem(storageKey(licenseType, "exam-history"));
  window.localStorage.removeItem(storageKey(licenseType, "answer-history"));
}
