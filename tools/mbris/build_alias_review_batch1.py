#!/usr/bin/env python3
"""Batch1 검토: manual_review 큐의 '단일후보+분류군일치' 10건을 사람이 판정한다.

자동 승인 없음. approved/rejected/keep_manual_review는 src/review_batch1_data.py에
사람이 직접 근거를 달아 판정한 결과를 그대로 옮긴다 — 이 스크립트는 그 판정에
로컬 데이터(충돌 검사)를 덧붙여 산출물로 만들기만 한다.
"""
import csv, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.review_batch1_data import DECISIONS, APPROVED, REJECTED, KEEP_MANUAL_REVIEW
from build_fish_data_alias_candidates import parse_fish_data_rows

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NORM = ROOT / "data" / "mbris" / "normalized"
REPORTS = ROOT / "data" / "mbris" / "reports"
QUEUE_PATH = MAPPINGS / "fish-data-manual-review-queue.json"
RESOLVED_PATH = MAPPINGS / "fish-data-link-resolved.json"
CANDIDATES_PATH = MAPPINGS / "fish-data-alias-candidates.json"
FISH_DATA_TS = ROOT / "src" / "data" / "fish-data.ts"

TARGET_BUCKET = "single_same_group"
# batch1이 실제로 판정한 10건 — src/review_batch1_data.py의 DECISIONS가 원 목록이다.
# 이후 승인 라운드가 이 중 일부(예: 쭈꾸미)를 manual_review 큐에서 제거해도, batch1은
# 이미 확정된 과거 산출물이므로 그 변화에 흔들리지 않고 항상 이 10건을 재현해야 한다.
TARGET_NAMES = list(DECISIONS.keys())


def load_target_10() -> list[dict]:
    """batch1 대상 10건을 불변 원본(fish-data-alias-candidates.json)에서 가져온다.

    manual-review-queue.json은 이후 승인 라운드가 항목을 제거하는 가변 파일이라
    여기서 다시 읽지 않는다 — queue 재구성에는 여전히 쓰이지만(§원본 대조용),
    batch1 재현의 진실 공급원은 아니다.
    """
    assert len(TARGET_NAMES) == 10, f"DECISIONS 대상이 10건이 아니다: {len(TARGET_NAMES)}건"
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    by_name = {r["sourceName"]: r for r in candidates}
    target = []
    for name in TARGET_NAMES:
        rec = by_name[name]
        target.append({"sourceName": name, "category": rec["category"],
                       "candidates": rec["candidates"]})
    return target


def check_conflicts(source_name: str, candidate: dict, resolved: list[dict],
                    ko_to_sci: dict) -> list[str]:
    conflicts = []
    if source_name in {r["sourceName"] for r in resolved}:
        conflicts.append("already_in_resolved_mapping")
    sci_set = ko_to_sci.get(candidate["koreanName"], set())
    if len(sci_set) > 1:
        conflicts.append(f"same_korean_name_multiple_scientific_names({len(sci_set)})")
    return conflicts


def build_records() -> list[dict]:
    target = load_target_10()
    rows = parse_fish_data_rows(FISH_DATA_TS.read_text(encoding="utf-8"))
    resolved = json.loads(RESOLVED_PATH.read_text(encoding="utf-8"))
    master = json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))

    ko_to_sci: dict[str, set] = {}
    for m in master:
        if m["koreanName"]:
            ko_to_sci.setdefault(m["koreanName"], set()).add(m["scientificNameRaw"])

    records = []
    for item in target:
        name = item["sourceName"]
        cand = item["candidates"][0]
        row = rows.get(name, {})
        decision = DECISIONS[name]

        auto_conflicts = check_conflicts(name, cand, resolved, ko_to_sci)

        records.append({
            "sourceName": name,
            "category": item["category"],
            "description": row.get("description"),
            "relatedFish": row.get("relatedFish", []),
            "candidateInternalId": cand["internalId"],
            "candidateKoreanName": cand["koreanName"],
            "candidateScientificName": cand["scientificName"],
            "candidateTaxonomy": cand["taxonomy"],
            "candidateOrganismGroup": cand["organismGroup"],
            "matchMethod": cand["matchMethod"],
            "similarityScore": cand["similarityScore"],
            "decision": decision["decision"],
            "confidence": decision["confidence"],
            "evidence": decision["evidence"],
            "conflicts": decision["conflicts"] + auto_conflicts,
            "reviewNote": decision["reviewNote"],
        })
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["sourceName", "category", "candidateInternalId", "candidateKoreanName",
                    "candidateScientificName", "decision", "confidence",
                    "evidence", "conflicts", "reviewNote"])
        for r in records:
            w.writerow([r["sourceName"], r["category"], r["candidateInternalId"],
                        r["candidateKoreanName"], r["candidateScientificName"],
                        r["decision"], r["confidence"], " | ".join(r["evidence"]),
                        " | ".join(r["conflicts"]), r["reviewNote"]])


def main() -> None:
    print("[1] 대상 10건 추출 및 판정 병합")
    records = build_records()
    for r in records:
        print(f"    {r['sourceName']:10s} -> {r['candidateKoreanName']:8s} "
              f"[{r['decision']:18s}] conf={r['confidence']}")

    (MAPPINGS / "fish-data-alias-review-batch1.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "fish-data-alias-review-batch1.csv", records)

    from collections import Counter
    counts = Counter(r["decision"] for r in records)
    print(f"\n[2] 판정 분포: {dict(counts)}")
    print(f"    저장: {MAPPINGS / 'fish-data-alias-review-batch1.json'}")


if __name__ == "__main__":
    main()
