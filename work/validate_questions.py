from __future__ import annotations

import json
from pathlib import Path


JSON_PATH = Path("work/questions.json")


def main() -> None:
    questions = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    ids = [item.get("id") for item in questions]
    duplicate_ids = sorted({item_id for item_id in ids if ids.count(item_id) > 1})
    expected_ids = list(range(1, 701))
    missing_ids = [item_id for item_id in expected_ids if item_id not in ids]
    extra_ids = [item_id for item_id in ids if item_id not in expected_ids]
    bad_choices = [item.get("id") for item in questions if len(item.get("choices", [])) != 4]
    bad_answers = [
        item.get("id")
        for item in questions
        if not isinstance(item.get("answer"), int) or item.get("answer") not in [0, 1, 2, 3]
    ]
    empty_questions = [item.get("id") for item in questions if not str(item.get("question", "")).strip()]
    explanation_count = sum(1 for item in questions if str(item.get("explanation", "")).strip())

    print(f"total={len(questions)}")
    print(f"continuous_ids={ids == expected_ids}")
    print(f"duplicate_ids={duplicate_ids}")
    print(f"missing_ids={missing_ids}")
    print(f"extra_ids={extra_ids}")
    print(f"bad_choices={bad_choices}")
    print(f"bad_answers={bad_answers}")
    print(f"empty_questions={empty_questions}")
    print(f"explanation_count={explanation_count}")

    failed = any([len(questions) != 700, ids != expected_ids, duplicate_ids, missing_ids, extra_ids, bad_choices, bad_answers, empty_questions])
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
