#!/usr/bin/env python3
"""§5: 갯강구(BM-SPECIES-006084) 수동 매칭 결과 생성.
Alias Registry/Taxonomy Master 어디에도 반영하지 않는다 — 별도 파일로만 기록."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.review_manual_match_data import DECISION, VALID_DECISIONS, INTERNAL_ID, SOURCE_NAME, CANDIDATES

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"


def build_record() -> dict:
    assert DECISION is not None, "DECISION이 아직 채워지지 않았다 — 리서치 완료 후 채울 것"
    assert DECISION["decision"] in VALID_DECISIONS, f"알 수 없는 decision: {DECISION['decision']}"

    return {
        "internalId": INTERNAL_ID,
        "sourceName": SOURCE_NAME,
        "selectedSpcTxnId": DECISION.get("selectedSpcTxnId"),
        "selectedScientificName": DECISION.get("selectedScientificName"),
        "decision": DECISION["decision"],
        "confidence": DECISION["confidence"],
        "candidateComparison": CANDIDATES,
        "evidence": DECISION["evidence"],
        "reviewStatus": DECISION["reviewStatus"],
        "reviewNote": DECISION.get("reviewNote", ""),
    }


def main() -> None:
    record = build_record()
    print(f"[1] 갯강구 수동 매칭 판정: {record['decision']} (confidence={record['confidence']})")
    print(f"    선택 종: {record['selectedScientificName']}")

    MAPPINGS.mkdir(parents=True, exist_ok=True)
    (MAPPINGS / "mbris-tier-a-manual-match.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 저장: {MAPPINGS / 'mbris-tier-a-manual-match.json'}")


if __name__ == "__main__":
    main()
