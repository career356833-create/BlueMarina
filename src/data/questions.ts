import { generalQuestions } from "./general-questions";
import { yachtQuestions } from "./yacht-questions";

export type LicenseType = "general" | "yacht";

export type Question = {
  id: number;
  licenseType: LicenseType;
  question: string;
  choices: string[];
  answer: number;
  explanation?: string;

  category?: string;
  subCategory?: string;
  detailCategory?: string;
  tags?: string[];
};

export const questions: Question[] = [...yachtQuestions, ...generalQuestions];
