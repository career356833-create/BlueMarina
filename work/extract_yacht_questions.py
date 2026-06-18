from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


PDF_PATH = Path(r"C:\Users\USER\Downloads\2026년 요트조종면허 문제은행 700제.pdf")
JSON_OUT = Path("work/questions.json")
TS_OUT = Path("src/data/questions.ts")

ANSWER_TO_INDEX = {"갑": 0, "을": 1, "병": 2, "정": 3}
INDEX_TO_ANSWER = {value: key for key, value in ANSWER_TO_INDEX.items()}


def normalize_space(text: str) -> str:
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def read_pdf_pages(pdf_path: Path) -> list[str]:
    reader = PdfReader(str(pdf_path))
    return [(page.extract_text() or "").replace("\r", "") for page in reader.pages]


def find_question_positions(full_text: str) -> dict[int, int]:
    positions: dict[int, int] = {}
    cursor = 0
    for question_id in range(1, 701):
      needle = f"{question_id}. "
      pos = full_text.find(needle, cursor)
      if pos < 0:
          # Some question numbers are attached to the previous choice text.
          compact_needle = f"{question_id}."
          pos = full_text.find(compact_needle, cursor)
      if pos < 0:
          raise ValueError(f"question start not found: {question_id}")
      positions[question_id] = pos
      cursor = pos + len(str(question_id)) + 1
    return positions


def extract_answer_key(pages: list[str]) -> dict[int, int]:
    answer_key: dict[int, int] = {}
    answer_chars = "".join(ANSWER_TO_INDEX.keys())

    # Page-bottom answer keys are compact and inconsistent:
    # "33정", "86. 병", "193 정", "633을", "695. 갑".
    for text in pages:
        for question_id in range(1, 701):
            pattern = re.compile(rf"(?<!\d){question_id}\s*\.?\s*([{answer_chars}])")
            matches = list(pattern.finditer(text))
            if not matches:
                continue

            # The real answer key appears near the end of a page. Prefer the
            # last match to avoid confusing a question number with body text.
            answer_char = matches[-1].group(1)
            answer_key[question_id] = ANSWER_TO_INDEX[answer_char]

    return answer_key


def remove_trailing_answer_key(text: str, question_id: int) -> str:
    # Remove page-bottom answer key material accidentally included in the final
    # question block of a page.
    answer_chars = "".join(ANSWER_TO_INDEX.keys())
    marker = re.search(rf"\s{max(1, question_id - 12)}\s*\.?\s*[{answer_chars}]", text)
    if marker:
        return text[: marker.start()].strip()

    # Fallback: if a dense answer sequence is present, cut from its beginning.
    dense = re.search(rf"\s\d{{1,3}}\s*\.?\s*[{answer_chars}](?:\s+\d{{1,3}}\s*\.?\s*[{answer_chars}]){{2,}}", text)
    if dense:
        return text[: dense.start()].strip()
    return text.strip()


def split_choices(block: str, question_id: int) -> tuple[str, list[str], str]:
    markers = []
    for label in ["갑", "을", "병", "정"]:
        match = re.search(rf"{label}\.", block)
        if not match:
            raise ValueError(f"choice marker {label}. not found in question {question_id}")
        markers.append((label, match.start(), match.end()))

    markers.sort(key=lambda item: item[1])
    question_text = block[: markers[0][1]].strip()
    choices: list[str] = []

    for idx, (_, _, marker_end) in enumerate(markers):
        end = markers[idx + 1][1] if idx + 1 < len(markers) else len(block)
        choices.append(block[marker_end:end].strip())

    return question_text, choices, ""


def split_explanation(choice_text: str) -> tuple[str, str]:
    marker = "[해설]"
    if marker not in choice_text:
        return choice_text.strip(), ""

    before, after = choice_text.split(marker, 1)
    return before.strip(), after.strip()


def clean_question_text(text: str) -> str:
    text = re.sub(r"^\d{1,3}\.\s*", "", text).strip()
    return normalize_space(text)


def clean_choice_text(text: str) -> str:
    return normalize_space(text)


def extract_questions() -> list[dict[str, Any]]:
    pages = read_pdf_pages(PDF_PATH)
    full_text = "\n".join(pages[2:])
    positions = find_question_positions(full_text)
    answer_key = extract_answer_key(pages)

    questions: list[dict[str, Any]] = []
    for question_id in range(1, 701):
        start = positions[question_id]
        end = positions[question_id + 1] if question_id < 700 else len(full_text)
        block = full_text[start:end].strip()
        block = remove_trailing_answer_key(block, question_id)
        block = normalize_space(block)

        question_text, choices, _ = split_choices(block, question_id)
        choices[-1], explanation = split_explanation(choices[-1])

        data = {
            "id": question_id,
            "question": clean_question_text(question_text),
            "choices": [clean_choice_text(choice) for choice in choices],
            "answer": answer_key.get(question_id),
            "explanation": normalize_space(explanation) if explanation else "",
            "category": "",
            "subCategory": "",
            "detailCategory": "",
            "tags": [],
        }
        questions.append(data)

    return questions


def to_ts(questions: list[dict[str, Any]]) -> str:
    json_text = json.dumps(questions, ensure_ascii=False, indent=2)
    return (
        "export type Question = {\n"
        "  id: number;\n"
        "  question: string;\n"
        "  choices: string[];\n"
        "  answer: number;\n"
        "  explanation?: string;\n"
        "  category?: string;\n"
        "  subCategory?: string;\n"
        "  detailCategory?: string;\n"
        "  tags?: string[];\n"
        "};\n\n"
        f"export const questions: Question[] = {json_text};\n"
    )


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(PDF_PATH)

    questions = extract_questions()
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)

    JSON_OUT.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    TS_OUT.write_text(to_ts(questions), encoding="utf-8")
    print(f"extracted={len(questions)}")
    print(f"json={JSON_OUT}")
    print(f"ts={TS_OUT}")


if __name__ == "__main__":
    main()
