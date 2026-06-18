import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_TS = ROOT / "src" / "data" / "questions.ts"
YACHT_TS = ROOT / "src" / "data" / "yacht-questions.ts"
GENERAL_TS = ROOT / "src" / "data" / "general-questions.ts"


source = QUESTIONS_TS.read_text(encoding="utf-8")
array_text = source.split("export const questions: Question[] = ", 1)[1].rsplit("\n];", 1)[0] + "\n]"
questions = json.loads(array_text)

for question in questions:
    question["licenseType"] = "yacht"

YACHT_TS.write_text(
    'import type { Question } from "./questions";\n\n'
    "export const yachtQuestions: Question[] = "
    + json.dumps(questions, ensure_ascii=False, indent=2)
    + ";\n",
    encoding="utf-8",
)

GENERAL_TS.write_text(
    'import type { Question } from "./questions";\n\n'
    "export const generalQuestions: Question[] = [];\n",
    encoding="utf-8",
)

QUESTIONS_TS.write_text(
    'import { generalQuestions } from "./general-questions";\n'
    'import { yachtQuestions } from "./yacht-questions";\n\n'
    'export type LicenseType = "general" | "yacht";\n\n'
    "export type Question = {\n"
    "  id: number;\n"
    "  licenseType: LicenseType;\n"
    "  question: string;\n"
    "  choices: string[];\n"
    "  answer: number;\n"
    "  explanation?: string;\n\n"
    "  category?: string;\n"
    "  subCategory?: string;\n"
    "  detailCategory?: string;\n"
    "  tags?: string[];\n"
    "};\n\n"
    "export const questions: Question[] = [...yachtQuestions, ...generalQuestions];\n",
    encoding="utf-8",
)

print(f"wrote {YACHT_TS}")
print(f"wrote {GENERAL_TS}")
print(f"updated {QUESTIONS_TS}")
