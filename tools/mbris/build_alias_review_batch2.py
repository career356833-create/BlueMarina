#!/usr/bin/env python3
"""Batch2 검토: Batch1에서 keep_manual_review로 남은 6건을 공식 출처 조사 결과로 판정한다.

자동 매핑 없음. 판정은 src/review_batch2_data.py에 사람이 공식 근거와 함께 직접
작성한 결과를 그대로 옮긴다 — 이 스크립트는 산출물 형식만 만든다.
"""
import csv, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.review_batch2_data import DECISIONS, TARGET_NAMES, VALID_DECISIONS, VALID_CONFIDENCE
from build_fish_data_alias_candidates import parse_fish_data_rows

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
FISH_DATA_TS = ROOT / "src" / "data" / "fish-data.ts"


def load_target_6() -> dict:
    ts = FISH_DATA_TS.read_text(encoding="utf-8")
    rows = parse_fish_data_rows(ts)
    out = {}
    for name in TARGET_NAMES:
        assert name in rows, f"{name}이 fish-data.ts에 없다"
        out[name] = rows[name]
    return out


def build_records() -> list[dict]:
    rows = load_target_6()
    records = []
    for name in TARGET_NAMES:
        row = rows[name]
        d = DECISIONS[name]
        assert d["decision"] in VALID_DECISIONS, f"{name}: 알 수 없는 decision {d['decision']}"
        assert d["confidence"] in VALID_CONFIDENCE, f"{name}: 알 수 없는 confidence {d['confidence']}"

        records.append({
            "sourceName": name,
            "sourceDescription": row.get("description"),
            "sourceCategory": row.get("category"),
            "decision": d["decision"],
            "canonicalKoreanName": d["canonicalKoreanName"],
            "acceptedScientificName": d["acceptedScientificName"],
            "candidateInternalId": d["candidateInternalId"],
            "nameType": d["nameType"],
            "confidence": d["confidence"],
            "officialEvidence": d["officialEvidence"],
            "conflicts": d["conflicts"],
            "recommendedAction": d["recommendedAction"],
        })
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["sourceName", "sourceCategory", "decision", "canonicalKoreanName",
                    "acceptedScientificName", "candidateInternalId", "nameType", "confidence",
                    "officialEvidenceCount", "officialEvidenceSummary", "conflicts",
                    "recommendedAction"])
        for r in records:
            ev_summary = " | ".join(
                f"{e['organization']}:{e['title']}" for e in r["officialEvidence"])
            w.writerow([r["sourceName"], r["sourceCategory"], r["decision"],
                        r["canonicalKoreanName"] or "", r["acceptedScientificName"] or "",
                        r["candidateInternalId"] or "", r["nameType"], r["confidence"],
                        len(r["officialEvidence"]), ev_summary,
                        " | ".join(r["conflicts"]), r["recommendedAction"]])


def main() -> None:
    print("[1] 대상 6건 로드 및 판정 병합")
    records = build_records()
    for r in records:
        print(f"    {r['sourceName']:10s} -> {r['decision']:18s} "
              f"conf={r['confidence']:6s} canonical={r['canonicalKoreanName']}")

    (MAPPINGS / "fish-data-alias-review-batch2.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "fish-data-alias-review-batch2.csv", records)

    from collections import Counter
    counts = Counter(r["decision"] for r in records)
    print(f"\n[2] 판정 분포: {dict(counts)}")
    print(f"    저장: {MAPPINGS / 'fish-data-alias-review-batch2.json'}")


if __name__ == "__main__":
    main()
