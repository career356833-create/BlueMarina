import { questions as rawQuestions, type LicenseType, type Question as RawQuestion } from "@/data/questions";

export type Question = RawQuestion & {
  licenseType: LicenseType;
  category: string;
  subCategory: string;
  detailCategory: string;
  tags: string[];
};

export type { LicenseType };

export const DEFAULT_LICENSE_TYPE: LicenseType = "yacht";
export const DEFAULT_CATEGORY = "전체";
export const DEFAULT_CATEGORY_LABEL = "전체 문제은행";
export const V3_CATEGORIES = [
  "기상 및 해양환경",
  "조석·조류·해류",
  "항해·해도·항로표지",
  "선박 조종술 및 운용",
  "기관 및 정비",
  "구명·조난·소방",
  "응급처치·인명구조",
  "법규·행정"
] as const;

function normalizeQuestion(question: RawQuestion): Question {
  return {
    ...question,
    licenseType: question.licenseType ?? DEFAULT_LICENSE_TYPE,
    category: question.category?.trim() || DEFAULT_CATEGORY,
    subCategory: question.subCategory?.trim() || "",
    detailCategory: question.detailCategory?.trim() || "",
    tags: question.tags ?? []
  };
}

export const questions: Question[] = rawQuestions.map(normalizeQuestion);
export const categories = [DEFAULT_CATEGORY, ...V3_CATEGORIES];

export function normalizeLicenseType(licenseType?: string | null): LicenseType {
  return licenseType === "general" || licenseType === "yacht" ? licenseType : DEFAULT_LICENSE_TYPE;
}

export function getLicenseLabel(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  return licenseType === "general" ? "일반조종면허" : "요트조종면허";
}

function forLicense(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  return questions.filter((question) => question.licenseType === licenseType);
}

export function getAllQuestions(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  return forLicense(licenseType);
}

export function getTotalQuestionCount(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  return getAllQuestions(licenseType).length;
}

export function getQuestionById(id: number | string, licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  const numericId = typeof id === "string" ? Number(id) : id;
  return getAllQuestions(licenseType).find((question) => question.id === numericId);
}

export function getQuestionsByCategory(licenseType: LicenseType, category: string): Question[];
export function getQuestionsByCategory(category: string): Question[];
export function getQuestionsByCategory(first: LicenseType | string, second?: string) {
  const licenseType = second ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const category = second ?? first;
  const pool = getAllQuestions(licenseType);
  if (category === DEFAULT_CATEGORY) return pool;
  return pool.filter((question) => question.category === category);
}

export function getQuestionsBySubCategory(licenseType: LicenseType, subCategory: string): Question[];
export function getQuestionsBySubCategory(subCategory: string): Question[];
export function getQuestionsBySubCategory(first: LicenseType | string, second?: string) {
  const licenseType = second ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const subCategory = second ?? first;
  return getAllQuestions(licenseType).filter((question) => question.subCategory === subCategory);
}

export function getQuestionsByDetailCategory(licenseType: LicenseType, detailCategory: string): Question[];
export function getQuestionsByDetailCategory(detailCategory: string): Question[];
export function getQuestionsByDetailCategory(first: LicenseType | string, second?: string) {
  const licenseType = second ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const detailCategory = second ?? first;
  return getAllQuestions(licenseType).filter((question) => question.detailCategory === detailCategory);
}

export function getQuestionsByTag(licenseType: LicenseType, tag: string): Question[];
export function getQuestionsByTag(tag: string): Question[];
export function getQuestionsByTag(first: LicenseType | string, second?: string) {
  const licenseType = second ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const tag = second ?? first;
  return getAllQuestions(licenseType).filter((question) => question.tags.includes(tag));
}

export function getAvailableCategories() {
  return categories;
}

export function getAvailableTags(licenseType: LicenseType = DEFAULT_LICENSE_TYPE) {
  return Array.from(new Set(getAllQuestions(licenseType).flatMap((question) => question.tags))).sort((a, b) => a.localeCompare(b, "ko"));
}

export function getRandomQuestions(licenseType: LicenseType, count: number): Question[];
export function getRandomQuestions(count: number): Question[];
export function getRandomQuestions(first: LicenseType | number, second?: number) {
  const licenseType = typeof first === "string" ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const count = typeof first === "number" ? first : second ?? getTotalQuestionCount(licenseType);
  const pool = getAllQuestions(licenseType);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

export function getMockExamQuestions(licenseType: LicenseType, count?: number): Question[];
export function getMockExamQuestions(count?: number): Question[];
export function getMockExamQuestions(first: LicenseType | number = DEFAULT_LICENSE_TYPE, second = 50) {
  const licenseType = typeof first === "string" ? normalizeLicenseType(first) : DEFAULT_LICENSE_TYPE;
  const count = typeof first === "number" ? first : second;
  return getRandomQuestions(licenseType, count);
}
