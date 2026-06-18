import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_TS = ROOT / "src" / "data" / "questions.ts"
V3_CSV = ROOT / "src" / "data" / "question-category-map-v3.csv"
VALIDATION_JSON = ROOT / "work" / "question-category-map-v3-apply-validation.json"

ALLOWED = [
    "기상 및 해양환경",
    "조석·조류·해류",
    "항해·해도·항로표지",
    "선박 조종술 및 운용",
    "기관 및 정비",
    "구명·조난·소방",
    "응급처치·인명구조",
    "법규·행정",
]


def load_questions():
    source = QUESTIONS_TS.read_text(encoding="utf-8")
    prefix = source.split("export const questions: Question[] = ", 1)[0]
    array_text = source.split("export const questions: Question[] = ", 1)[1].rsplit("\n];", 1)[0] + "\n]"
    return prefix, json.loads(array_text)


def load_mapping():
    with V3_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    mapping = {}
    for row in rows:
        mapping[int(row["id"])] = {
            "category": row["category"].strip(),
            "subCategory": row["subCategory"].strip(),
            "detailCategory": row["detailCategory"].strip(),
            "tags": [tag.strip() for tag in row["tags"].split("|") if tag.strip()],
        }
    return rows, mapping


def validate_rows(rows):
    ids = [int(row["id"]) for row in rows]
    errors = []
    if len(rows) != 700:
        errors.append(f"row count {len(rows)} != 700")
    if sorted(ids) != list(range(1, 701)):
        errors.append("ids are not exactly 1..700")
    if len(ids) != len(set(ids)):
        errors.append("duplicate ids exist")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [row["id"] for row in rows if not str(row[field]).strip()]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")
    invalid = [row for row in rows if row["category"] not in ALLOWED]
    if invalid:
        errors.append(f"invalid category: {invalid[:5]}")
    return errors


def main():
    prefix, questions = load_questions()
    rows, mapping = load_mapping()
    errors = validate_rows(rows)
    if errors:
        VALIDATION_JSON.write_text(json.dumps({"errors": errors}, ensure_ascii=False, indent=2), encoding="utf-8")
        raise SystemExit("\n".join(errors))

    for question in questions:
        qid = int(question["id"])
        m = mapping[qid]
        question["category"] = m["category"]
        question["subCategory"] = m["subCategory"]
        question["detailCategory"] = m["detailCategory"]
        question["tags"] = m["tags"]

    rendered = prefix + "export const questions: Question[] = " + json.dumps(questions, ensure_ascii=False, indent=2) + ";\n"
    QUESTIONS_TS.write_text(rendered, encoding="utf-8")

    counts = {}
    for row in rows:
        counts[row["category"]] = counts.get(row["category"], 0) + 1

    VALIDATION_JSON.write_text(
        json.dumps(
            {
                "errors": [],
                "rows": len(rows),
                "idsOk": sorted(int(row["id"]) for row in rows) == list(range(1, 701)),
                "categoryCounts": counts,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"rows": len(rows), "categoryCounts": counts, "errors": []}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
