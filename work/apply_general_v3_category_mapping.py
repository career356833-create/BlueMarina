from __future__ import annotations

import csv
import json
import re
from pathlib import Path


QUESTIONS_TS = Path("src/data/general-questions.ts")
MAP_CSV = Path("src/data/question-category-map-general-v3.csv")
REPORT = Path("work/general-v3-apply-validation.json")


def load_questions() -> list[dict]:
    text = QUESTIONS_TS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\[.*\]);\s*$", text, re.S)
    if not match:
        raise ValueError("generalQuestions array not found")
    return json.loads(match.group(1))


def to_ts(questions: list[dict]) -> str:
    json_text = json.dumps(questions, ensure_ascii=False, indent=2)
    return f'import type {{ Question }} from "./questions";\n\nexport const generalQuestions: Question[] = {json_text};\n'


def main() -> None:
    questions = load_questions()
    before = {
        item["id"]: {
            "question": item["question"],
            "choices": item["choices"],
            "answer": item["answer"],
            "explanation": item.get("explanation", ""),
            "licenseType": item["licenseType"],
        }
        for item in questions
    }

    with MAP_CSV.open(encoding="utf-8-sig", newline="") as file:
        mapping = {int(row["id"]): row for row in csv.DictReader(file)}

    for item in questions:
        row = mapping[item["id"]]
        item["category"] = row["category"]
        item["subCategory"] = row["subCategory"]
        item["detailCategory"] = row["detailCategory"]
        item["tags"] = [tag for tag in row["tags"].split("|") if tag]

    after = {
        item["id"]: {
            "question": item["question"],
            "choices": item["choices"],
            "answer": item["answer"],
            "explanation": item.get("explanation", ""),
            "licenseType": item["licenseType"],
        }
        for item in questions
    }

    errors: list[str] = []
    ids = [item["id"] for item in questions]
    if len(questions) != 700:
        errors.append(f"question count {len(questions)}")
    if ids != list(range(1, 701)):
        errors.append("ids are not 1..700")
    if before != after:
        errors.append("protected fields changed")
    if set(mapping) != set(ids):
        errors.append("mapping ids do not match questions")
    if any(item["licenseType"] != "general" for item in questions):
        errors.append("non-general licenseType found")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [item["id"] for item in questions if not item.get(field)]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")

    if errors:
        raise SystemExit("\n".join(errors))

    QUESTIONS_TS.write_text(to_ts(questions), encoding="utf-8")
    report = {
        "merged": True,
        "question_count": len(questions),
        "protected_fields_unchanged": before == after,
        "license_general_count": sum(1 for item in questions if item["licenseType"] == "general"),
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
