from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_JSON = ROOT / "work" / "questions.json"
MAPPING_CSV = ROOT / "src" / "data" / "question-category-map.csv"
OUTPUT_TS = ROOT / "src" / "data" / "questions.ts"


def parse_tags(value: str) -> list[str]:
    text = value.strip()
    for separator in ("|", ";", "#"):
        text = text.replace(separator, ",")
    return [tag.strip() for tag in text.split(",") if tag.strip()]


def load_mapping() -> dict[int, dict[str, object]]:
    with MAPPING_CSV.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        mapping: dict[int, dict[str, object]] = {}
        for row in reader:
            question_id = int(row["id"])
            mapping[question_id] = {
                "category": row["category"].strip(),
                "subCategory": row["subCategory"].strip(),
                "detailCategory": row["detailCategory"].strip(),
                "tags": parse_tags(row["tags"]),
            }
        return mapping


def main() -> None:
    questions = json.loads(QUESTIONS_JSON.read_text(encoding="utf-8"))
    mapping = load_mapping()

    merged = []
    for question in questions:
        question_id = int(question["id"])
        if question_id not in mapping:
            raise ValueError(f"Missing mapping for question id {question_id}")
        # Preserve the extracted problem payload exactly, and replace only classification fields.
        merged.append(
            {
                "id": question["id"],
                "question": question["question"],
                "choices": question["choices"],
                "answer": question["answer"],
                "explanation": question.get("explanation", ""),
                **mapping[question_id],
            }
        )

    ts = [
        "export type Question = {",
        "  id: number;",
        "  question: string;",
        "  choices: string[];",
        "  answer: number;",
        "  explanation?: string;",
        "  category?: string;",
        "  subCategory?: string;",
        "  detailCategory?: string;",
        "  tags?: string[];",
        "};",
        "",
        f"export const questions: Question[] = {json.dumps(merged, ensure_ascii=False, indent=2)};",
        "",
    ]
    OUTPUT_TS.write_text("\n".join(ts), encoding="utf-8")
    print(f"merged={len(merged)}")
    print(f"output={OUTPUT_TS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
