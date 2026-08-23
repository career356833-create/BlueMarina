#!/usr/bin/env python3
"""Taxonomy Gap Registry 생성 — Blue Marina 후보 분류(fish/cephalopod/crustacean/
gastropod/bivalve)에 없는 극피동물문(Echinodermata) 3건(불가사리/성게/해삼)을
Alias Registry와 완전히 분리해서 별도 관리한다.

Batch3 검토에서 이 3건은 전부 rejected로 판정됐다(제시된 후보가 전부 wrong-organism
매칭이었기 때문) — 그 rejected 판정 근거를 relatedCandidates로 그대로 옮겨온다.
극피동물 카테고리 자체를 자동으로 추가하지 않는다(§제한사항) — 이 파일은 "무엇이
빠져있는지"를 기록하는 계획 문서일 뿐이다.
"""
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NOW = datetime.now(timezone.utc).isoformat()

BATCH3_PATH = MAPPINGS / "fish-alias-review-batch3.json"
GAP_TARGETS = ["불가사리", "성게", "해삼"]


def load_gap_source_records() -> dict[str, dict]:
    batch3 = json.loads(BATCH3_PATH.read_text(encoding="utf-8"))
    by_name = {r["sourceName"]: r for r in batch3 if r["sourceName"] in GAP_TARGETS}
    assert set(by_name) == set(GAP_TARGETS), f"batch3에서 극피동물 3건을 찾지 못함: {set(GAP_TARGETS) - set(by_name)}"
    return by_name


def build_records() -> list[dict]:
    source = load_gap_source_records()
    records = []
    for i, name in enumerate(sorted(GAP_TARGETS), start=1):
        r = source[name]
        records.append({
            "gapId": f"GAP-{i:06d}",
            "group": "Echinodermata",
            "koreanName": name,
            "issueType": "taxonomy_missing",
            "reason": "현재 Blue Marina 후보 분류 범위에 없음",
            "status": "planned",
            "relatedCandidates": [
                {**c, "note": "wrong-organism — 대상 생물이 아니라 이름을 딴/기생·공생하는 별개 분류군"}
                for c in r["candidateBefore"]
            ],
            "sourceReviewBatch": "batch3",
            "sourceDecision": r["decision"],
            "createdAt": NOW,
            "updatedAt": NOW,
        })
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["gapId", "group", "koreanName", "issueType", "reason", "status",
                    "relatedCandidateCount", "relatedCandidateNames", "sourceReviewBatch",
                    "sourceDecision", "createdAt", "updatedAt"])
        for r in records:
            names = " / ".join(c["koreanName"] for c in r["relatedCandidates"])
            w.writerow([r["gapId"], r["group"], r["koreanName"], r["issueType"], r["reason"],
                        r["status"], len(r["relatedCandidates"]), names,
                        r["sourceReviewBatch"], r["sourceDecision"], r["createdAt"], r["updatedAt"]])


def main() -> None:
    records = build_records()
    print(f"[1] Taxonomy Gap {len(records)}건 생성")
    for r in records:
        print(f"    {r['gapId']} {r['koreanName']:6s} group={r['group']} "
              f"relatedCandidates={len(r['relatedCandidates'])}")

    (MAPPINGS / "taxonomy-gap-registry.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "taxonomy-gap-registry.csv", records)

    print(f"\n✅ 저장: {MAPPINGS / 'taxonomy-gap-registry.json'}")
    print(f"✅ 저장: {MAPPINGS / 'taxonomy-gap-registry.csv'}")


if __name__ == "__main__":
    main()
