from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ALLOWED_CATEGORIES = {"법규", "항해·기상", "선박운용", "기관", "안전·응급처치"}
REQUIRED_FIELDS = ("id", "category", "subCategory", "detailCategory", "tags")


def normalize_tags(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(tag).strip() for tag in value if str(tag).strip()]
    if isinstance(value, str):
        separators = [",", "|", ";", "#"]
        text = value.strip()
        for separator in separators:
            text = text.replace(separator, ",")
        return [tag.strip() for tag in text.split(",") if tag.strip()]
    return [str(value).strip()] if str(value).strip() else []


def load_json(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(data, dict):
        for key in ("questions", "items", "mappings", "data"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
    if not isinstance(data, list):
        raise ValueError("JSON mapping must be a list or contain one of questions/items/mappings/data lists.")
    return [dict(item) for item in data]


def load_delimited(path: Path, delimiter: str) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return [dict(row) for row in csv.DictReader(file, delimiter=delimiter)]


def load_mapping(path: Path) -> list[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return load_json(path)
    if suffix == ".csv":
        return load_delimited(path, ",")
    if suffix in {".tsv", ".txt"}:
        return load_delimited(path, "\t")
    raise ValueError("Supported mapping formats: .json, .csv, .tsv")


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, list):
        return len(normalize_tags(value)) == 0
    return str(value).strip() == ""


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python work/validate_question_mapping.py <mapping.json|mapping.csv|mapping.tsv>")
        return 2

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Mapping file not found: {path}")
        return 2

    rows = load_mapping(path)
    ids: list[int] = []
    invalid_ids: list[Any] = []
    blank_fields: dict[str, list[int | str]] = {field: [] for field in REQUIRED_FIELDS if field != "id"}
    invalid_categories: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    tag_counts: Counter[str] = Counter()

    for row_index, row in enumerate(rows, start=1):
        raw_id = row.get("id")
        try:
            question_id = int(str(raw_id).strip())
            ids.append(question_id)
        except (TypeError, ValueError):
            invalid_ids.append(raw_id if raw_id is not None else f"row:{row_index}")
            question_id = f"row:{row_index}"

        for field in ("category", "subCategory", "detailCategory"):
            if is_blank(row.get(field)):
                blank_fields[field].append(question_id)

        tags = normalize_tags(row.get("tags"))
        if not tags:
            blank_fields["tags"].append(question_id)
        tag_counts.update(tags)

        category = str(row.get("category", "")).strip()
        if category:
            category_counts[category] += 1
            if category not in ALLOWED_CATEGORIES:
                invalid_categories[category] += 1

    id_counts = Counter(ids)
    duplicate_ids = sorted([question_id for question_id, count in id_counts.items() if count > 1])
    missing_ids = [question_id for question_id in range(1, 701) if question_id not in id_counts]
    extra_ids = sorted([question_id for question_id in id_counts if question_id < 1 or question_id > 700])

    passed = (
        len(rows) == 700
        and not invalid_ids
        and not duplicate_ids
        and not missing_ids
        and not extra_ids
        and all(not ids for ids in blank_fields.values())
        and not invalid_categories
    )

    print(f"검증 파일: {path}")
    print(f"총 행 수: {len(rows)}")
    print(f"id 1~700 존재: {'PASS' if not missing_ids and not extra_ids and not invalid_ids else 'FAIL'}")
    print(f"중복 id 없음: {'PASS' if not duplicate_ids else 'FAIL'}")
    print(f"category 빈 값 없음: {'PASS' if not blank_fields['category'] else 'FAIL'}")
    print(f"subCategory 빈 값 없음: {'PASS' if not blank_fields['subCategory'] else 'FAIL'}")
    print(f"detailCategory 빈 값 없음: {'PASS' if not blank_fields['detailCategory'] else 'FAIL'}")
    print(f"tags 빈 값 없음: {'PASS' if not blank_fields['tags'] else 'FAIL'}")
    print(f"허용 category만 사용: {'PASS' if not invalid_categories else 'FAIL'}")

    if invalid_ids:
        print(f"잘못된 id: {invalid_ids[:30]}")
    if missing_ids:
        print(f"누락 id: {missing_ids[:50]}")
    if duplicate_ids:
        print(f"중복 id: {duplicate_ids[:50]}")
    if extra_ids:
        print(f"범위 밖 id: {extra_ids[:50]}")
    for field, values in blank_fields.items():
        if values:
            print(f"{field} 빈 값 id: {values[:50]}")
    if invalid_categories:
        print("허용되지 않은 category:")
        for category, count in invalid_categories.most_common():
            print(f"- {category}: {count}")

    print()
    print("카테고리 통계:")
    for category in sorted(ALLOWED_CATEGORIES):
        print(f"{category} {category_counts.get(category, 0)}문항")

    print()
    print(f"태그 수: {len(tag_counts)}개")
    print("상위 태그:")
    for tag, count in tag_counts.most_common(20):
        print(f"{tag} {count}문항")

    print()
    print(f"최종 결과: {'PASS' if passed else 'FAIL'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
