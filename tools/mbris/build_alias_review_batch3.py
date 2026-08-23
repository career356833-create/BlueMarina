#!/usr/bin/env python3
"""Batch3 검토: 복수후보 17건을 공식 출처 조사 결과로 판정한다.

자동 매핑·자동 승인 없음. 판정은 src/review_batch3_data.py에 사람이 공식 근거와 함께
직접 작성한 결과를 그대로 옮긴다 — 이 스크립트는 대상 로드 + 산출물 형식만 만든다.
원본 파일(fish-data.ts, Alias Registry, MBRIS 원본)은 읽기만 한다.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.review_batch3_data import DECISIONS, TARGET_NAMES, VALID_DECISIONS, VALID_CONFIDENCE

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def load_targets() -> dict:
    targets = json.loads((REPORTS / "fish-alias-batch3-targets.json").read_text(encoding="utf-8"))
    by_name = {t["sourceName"]: t for t in targets}
    assert set(by_name) == set(TARGET_NAMES), (
        f"targets 파일과 TARGET_NAMES가 다르다: {set(by_name) ^ set(TARGET_NAMES)}")
    return by_name


def build_records() -> list[dict]:
    targets = load_targets()
    records = []
    for name in TARGET_NAMES:
        t = targets[name]
        d = DECISIONS[name]
        assert d["decision"] in VALID_DECISIONS, f"{name}: 알 수 없는 decision {d['decision']}"
        assert d["confidence"] in VALID_CONFIDENCE, f"{name}: 알 수 없는 confidence {d['confidence']}"

        # approved는 internalId가 반드시 있어야 한다(승인 = 특정 MBRIS 종 확정).
        if d["decision"] == "approved":
            assert d["internalId"], f"{name}: approved인데 internalId가 없다"
            assert d["canonicalName"], f"{name}: approved인데 canonicalName이 없다"
            assert d["scientificName"], f"{name}: approved인데 scientificName이 없다"

        # aggregate_name/market_name은 특정 종으로 확정하지 않는다 — 자동 승인 방지.
        if d["decision"] in ("aggregate_name", "market_name"):
            assert d["internalId"] is None, f"{name}: {d['decision']}인데 internalId가 있다(자동 승인 금지)"

        records.append({
            "sourceName": name,
            "decision": d["decision"],
            "canonicalName": d["canonicalName"],
            "internalId": d["internalId"],
            "scientificName": d["scientificName"],
            "confidence": d["confidence"],
            "candidateBefore": t["candidates"],
            "evidence": d["evidence"],
            "conflicts": d["conflicts"],
            "reviewNote": d["reviewNote"],
        })
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["sourceName", "decision", "canonicalName", "internalId", "scientificName",
                    "confidence", "candidateBeforeCount", "candidateBeforeNames",
                    "evidenceCount", "evidenceSummary", "conflicts", "reviewNote"])
        for r in records:
            cand_names = " / ".join(c["koreanName"] for c in r["candidateBefore"])
            ev_summary = " | ".join(f"{e['organization']}:{e['value']}" for e in r["evidence"])
            w.writerow([r["sourceName"], r["decision"], r["canonicalName"] or "",
                        r["internalId"] or "", r["scientificName"] or "", r["confidence"],
                        len(r["candidateBefore"]), cand_names,
                        len(r["evidence"]), ev_summary,
                        " | ".join(r["conflicts"]), r["reviewNote"]])


def main() -> None:
    print("[1] 대상 17건 로드 및 판정 병합")
    records = build_records()
    for r in records:
        print(f"    {r['sourceName']:6s} -> {r['decision']:18s} "
              f"conf={r['confidence']:6s} canonical={r['canonicalName']}")

    (MAPPINGS / "fish-alias-review-batch3.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "fish-alias-review-batch3.csv", records)

    counts = Counter(r["decision"] for r in records)
    print(f"\n[2] 판정 분포: {dict(counts)}")
    print(f"    저장: {MAPPINGS / 'fish-alias-review-batch3.json'}")
    print(f"    저장: {MAPPINGS / 'fish-alias-review-batch3.csv'}")


if __name__ == "__main__":
    main()
