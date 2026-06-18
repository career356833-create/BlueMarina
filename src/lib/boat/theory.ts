import { theories, type TheoryItem } from "@/data/theories";
import { getAllQuestions, normalizeLicenseType, type LicenseType, type Question } from "@/lib/boat/questions";

export function getTheoryByTag(tag: string) {
  const decodedTag = decodeURIComponent(tag);
  return theories.find((theory) => theory.tag === decodedTag || theory.title === decodedTag || theory.subTags?.includes(decodedTag));
}

export function getRelatedQuestionsForTheory(theory: TheoryItem, licenseType: LicenseType): Question[] {
  const normalizedLicenseType = normalizeLicenseType(licenseType);

  if (!theory.licenseTypes.includes(normalizedLicenseType)) {
    return [];
  }

  if (theory.relatedQuestionIds.length > 0) {
    const relatedIds = new Set(theory.relatedQuestionIds);
    return getAllQuestions(normalizedLicenseType).filter((question) => relatedIds.has(question.id));
  }

  const theoryTags = new Set([theory.tag, ...(theory.subTags ?? [])]);
  return getAllQuestions(normalizedLicenseType).filter((question) => question.tags.some((tag) => theoryTags.has(tag)));
}

export function getTheoryQuestionCount(theory: TheoryItem, licenseType: LicenseType) {
  return getRelatedQuestionsForTheory(theory, licenseType).length;
}

export function hasTheoryForTag(tag: string) {
  return Boolean(getTheoryByTag(tag));
}
