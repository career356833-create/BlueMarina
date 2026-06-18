from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


PDF_PATH = Path(r"C:\Users\USER\Downloads\(25년) 일반조종면허 문제은행 700제.pdf")
TS_OUT = Path("src/data/general-questions.ts")
REPORT_OUT = Path("work/general-questions-validation.json")

ANSWER_TO_INDEX = {"갑": 0, "을": 1, "병": 2, "정": 3}
CHOICE_LABELS = ["갑", "을", "병", "정"]


def normalize_space(text: str) -> str:
    text = text.replace("\r", "")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def read_pages() -> list[str]:
    reader = PdfReader(str(PDF_PATH))
    return [(page.extract_text() or "").replace("\r", "") for page in reader.pages]


def answer_matches(text: str) -> list[re.Match[str]]:
    return list(re.finditer(r"(?<!\d)([1-9]\d{0,2})\.\s*([갑을병정])", text))


def split_page_answers(text: str) -> tuple[str, list[tuple[int, int]]]:
    matches = answer_matches(text)
    if not matches:
        return text, []

    last_explanation = max(text.rfind("[해설]"), text.rfind("[해 설]"))
    candidates = [match for match in matches if match.start() > last_explanation]
    if not candidates:
        candidates = [match for match in matches if match.start() > max(0, len(text) - 700)]

    # Keep the final ascending answer run. This avoids accidental matches in
    # law references or explanatory numbered lists.
    best_run: list[re.Match[str]] = []
    for start in range(len(candidates)):
        run = [candidates[start]]
        previous = int(candidates[start].group(1))
        for match in candidates[start + 1 :]:
            current = int(match.group(1))
            if current == previous + 1:
                run.append(match)
                previous = current
        if len(run) >= len(best_run):
            best_run = run

    if not best_run:
        return text, []

    body = text[: best_run[0].start()]
    answers = [(int(match.group(1)), ANSWER_TO_INDEX[match.group(2)]) for match in best_run]
    return body, answers


def find_question_positions(body: str, ids: list[int], page_number: int) -> list[tuple[int, int]]:
    positions: list[tuple[int, int]] = []
    cursor = 0
    for question_id in ids:
        pattern = re.compile(rf"(?<!\d){question_id}\.\s*")
        match = pattern.search(body, cursor)
        if not match:
            raise ValueError(f"question {question_id} not found on page {page_number}")
        positions.append((question_id, match.start()))
        cursor = match.end()
    return positions


def split_blocks(body: str, ids: list[int], page_number: int) -> dict[int, str]:
    positions = find_question_positions(body, ids, page_number)
    blocks: dict[int, str] = {}
    for index, (question_id, start) in enumerate(positions):
        end = positions[index + 1][1] if index + 1 < len(positions) else len(body)
        blocks[question_id] = body[start:end].strip()
    return blocks


def find_choice_markers(block: str, question_id: int) -> list[tuple[str, int, int]]:
    markers: list[tuple[str, int, int]] = []
    cursor = 0
    for label in CHOICE_LABELS:
        match = re.search(rf"{label}\.", block[cursor:])
        if not match:
            raise ValueError(f"choice marker {label}. not found in question {question_id}")
        start = cursor + match.start()
        end = cursor + match.end()
        markers.append((label, start, end))
        cursor = end
    return markers


def split_explanation(text: str) -> tuple[str, str]:
    match = re.search(r"\[해\s*설\]", text)
    if not match:
        return text.strip(), ""
    return text[: match.start()].strip(), text[match.end() :].strip()


def parse_question_block(question_id: int, block: str, answer: int) -> dict[str, Any]:
    block = re.sub(rf"^\s*{question_id}\.\s*", "", block).strip()
    block = block.replace("〈", "<").replace("〉", ">")
    markers = find_choice_markers(block, question_id)

    question_text = block[: markers[0][1]].strip()
    choices: list[str] = []
    for index, (_, _, marker_end) in enumerate(markers):
        end = markers[index + 1][1] if index + 1 < len(markers) else len(block)
        choices.append(block[marker_end:end].strip())

    choices[-1], explanation = split_explanation(choices[-1])

    return {
        "id": question_id,
        "licenseType": "general",
        "question": normalize_space(question_text),
        "choices": [normalize_space(choice) for choice in choices],
        "answer": answer,
        "explanation": normalize_space(explanation),
        "category": "",
        "subCategory": "",
        "detailCategory": "",
        "tags": [],
    }


def extract_questions() -> list[dict[str, Any]]:
    pages = read_pages()
    answers_by_id: dict[int, int] = {}
    blocks_by_id: dict[int, str] = {}

    for page_index in range(2, 164):
        body, answers = split_page_answers(pages[page_index])
        if not answers:
            continue
        ids = [question_id for question_id, _ in answers]
        for question_id, answer in answers:
            answers_by_id[question_id] = answer
        blocks_by_id.update(split_blocks(body, ids, page_index + 1))

    questions: list[dict[str, Any]] = []
    for question_id in range(1, 701):
        if question_id not in blocks_by_id:
            raise ValueError(f"missing question block: {question_id}")
        if question_id not in answers_by_id:
            raise ValueError(f"missing answer: {question_id}")
        questions.append(parse_question_block(question_id, blocks_by_id[question_id], answers_by_id[question_id]))
    return questions


def suspicious_choice_ids(questions: list[dict[str, Any]]) -> list[int]:
    suspicious: list[int] = []
    label_pattern = re.compile(r"[갑을병정]\.")
    for question in questions:
        choices = question["choices"]
        if len(choices) != 4 or any(not choice for choice in choices):
            suspicious.append(question["id"])
            continue
        if any(label_pattern.search(choice) for choice in choices):
            suspicious.append(question["id"])
            continue
        if any(len(choice) > 350 for choice in choices):
            suspicious.append(question["id"])
    return suspicious


def validate(questions: list[dict[str, Any]]) -> dict[str, Any]:
    ids = [question["id"] for question in questions]
    duplicate_ids = sorted({question_id for question_id in ids if ids.count(question_id) > 1})
    missing_ids = [question_id for question_id in range(1, 701) if question_id not in ids]
    explanation_missing = [question["id"] for question in questions if not question.get("explanation")]
    answer_missing = [question["id"] for question in questions if question.get("answer") not in {0, 1, 2, 3}]
    empty_questions = [question["id"] for question in questions if not question.get("question")]
    bad_choice_count = [question["id"] for question in questions if len(question.get("choices", [])) != 4]
    empty_choices = [
        question["id"]
        for question in questions
        if len(question.get("choices", [])) == 4 and any(not choice for choice in question["choices"])
    ]
    wrong_license = [question["id"] for question in questions if question.get("licenseType") != "general"]
    suspicious_choices = suspicious_choice_ids(questions)

    return {
        "total": len(questions),
        "id_continuous": ids == list(range(1, 701)),
        "missing_ids": missing_ids,
        "duplicate_ids": duplicate_ids,
        "bad_choice_count": bad_choice_count,
        "empty_choices": empty_choices,
        "answer_missing": answer_missing,
        "empty_questions": empty_questions,
        "wrong_license": wrong_license,
        "explanation_missing_count": len(explanation_missing),
        "explanation_missing_ids": explanation_missing,
        "suspicious_choice_ids": suspicious_choices,
    }


def to_ts(questions: list[dict[str, Any]]) -> str:
    json_text = json.dumps(questions, ensure_ascii=False, indent=2)
    return f'import type {{ Question }} from "./questions";\n\nexport const generalQuestions: Question[] = {json_text};\n'


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(PDF_PATH)

    questions = extract_questions()
    report = validate(questions)

    TS_OUT.write_text(to_ts(questions), encoding="utf-8")
    REPORT_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(
        [
            report["total"] != 700,
            not report["id_continuous"],
            report["missing_ids"],
            report["duplicate_ids"],
            report["bad_choice_count"],
            report["empty_choices"],
            report["answer_missing"],
            report["empty_questions"],
            report["wrong_license"],
        ]
    ):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
