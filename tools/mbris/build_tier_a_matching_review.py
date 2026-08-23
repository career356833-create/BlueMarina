#!/usr/bin/env python3
"""§5: Tier A 86종 전체 매칭 결과를 검토용 CSV로 정리한다.
성공/실패 구분 없이 86건 전부 한 줄씩 남긴다 — 실패 항목도 사유와 함께 기록해야
나중에 사람이 훑어보고 판단할 수 있다."""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.detail_collector import load_tier_a_candidates
from src.detail_state import DetailCollectionState, COMPLETE

ROOT = Path(__file__).resolve().parent.parent.parent
MBRIS = ROOT / "data" / "mbris"
TIER_A_FILE = MBRIS / "priority" / "service-tier-a.json"
RAW_DETAIL = MBRIS / "raw" / "detail"
STATE_PATH = MBRIS / "state" / "detail-collection-state.json"
REPORTS = MBRIS / "reports"


def classify_status(match_note: str | None, is_complete: bool) -> str:
    if not is_complete:
        return "failed"
    if match_note and "정확 일치" in match_note and "재검색" not in match_note:
        return "exact_match"
    if match_note and ("재검색으로 매칭" in match_note):
        return "matched_via_korean_name_fallback"
    if match_note and "수동 검토" in match_note:
        return "matched_but_name_mismatch"
    return "matched_unknown_reason"


def build_rows() -> list[dict]:
    candidates, _issues = load_tier_a_candidates(TIER_A_FILE)
    state = DetailCollectionState.load(STATE_PATH)

    rows = []
    for c in candidates:
        iid = c["internalId"]
        st = state.items.get(iid)
        is_complete = st is not None and st.status == COMPLETE

        row = {
            "internalId": iid,
            "requestedKoreanName": c.get("koreanName") or "",
            "requestedScientificName": c["scientificName"],
            "returnedCount": "",
            "selectedKoreanName": "",
            "selectedScientificNameShort": "",
            "matchStatus": "",
            "reviewReason": "",
        }

        if is_complete:
            detail_dir = RAW_DETAIL / iid
            meta = json.loads((detail_dir / "metadata.json").read_text(encoding="utf-8"))
            preview = json.loads((detail_dir / "parsed-preview.json").read_text(encoding="utf-8"))
            item = preview["matchedItem"]
            row["returnedCount"] = preview.get("totalCount")
            row["selectedKoreanName"] = item.get("CommKorNm") or ""
            row["selectedScientificNameShort"] = item.get("SpcScitfNmShort") or ""
            row["matchStatus"] = classify_status(meta.get("matchNote"), True)
            row["reviewReason"] = meta.get("matchNote") or ""
        else:
            row["matchStatus"] = "failed"
            row["reviewReason"] = st.lastError if st else "시도 기록 없음"

        rows.append(row)
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    header = ["internalId", "requestedKoreanName", "requestedScientificName", "returnedCount",
              "selectedKoreanName", "selectedScientificNameShort", "matchStatus", "reviewReason"]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    rows = build_rows()
    from collections import Counter
    counts = Counter(r["matchStatus"] for r in rows)
    print(f"[1] 매칭 검토 {len(rows)}건")
    print(f"    상태 분포: {dict(counts)}")

    REPORTS.mkdir(parents=True, exist_ok=True)
    write_csv(REPORTS / "tier-a-matching-review.csv", rows)
    print(f"\n✅ 저장: {REPORTS / 'tier-a-matching-review.csv'}")


if __name__ == "__main__":
    main()
