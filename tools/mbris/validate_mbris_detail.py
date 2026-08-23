#!/usr/bin/env python3
"""수집된 Tier A 상세 데이터 검증."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.detail_collector import load_tier_a_candidates
from src.detail_state import DetailCollectionState, COMPLETE, FAILED

ROOT = Path(__file__).resolve().parent.parent.parent
MBRIS = ROOT / "data" / "mbris"
TIER_A_FILE = MBRIS / "priority" / "service-tier-a.json"
NORMALIZED_DETAIL = MBRIS / "normalized" / "detail"
STATE_PATH = MBRIS / "state" / "detail-collection-state.json"
REPORTS = MBRIS / "reports"


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    candidates, _issues = load_tier_a_candidates(TIER_A_FILE)
    state = DetailCollectionState.load(STATE_PATH)

    status_counts = state.counts()
    print(f"[상태] {status_counts}")

    detail_files = sorted(NORMALIZED_DETAIL.glob("*.json")) if NORMALIZED_DETAIL.exists() else []
    print(f"[정규화 파일] {len(detail_files)}개")

    empty_field_counts: Counter = Counter()
    sci_mismatch: list[dict] = []
    by_internal_id = {c["internalId"]: c for c in candidates}

    for f in detail_files:
        d = json.loads(f.read_text(encoding="utf-8"))
        iid = d["internalId"]
        for section in ("basic", "ecology"):
            for k, v in d.get(section, {}).items():
                if k == "extra":
                    continue
                if v in (None, ""):
                    empty_field_counts[f"{section}.{k}"] += 1

        # taxonomy-master.json의 scientificName(canonical, 권위자 인용 없음)은
        # basic.scientificName(SpcScitfNm, 권위자 인용 포함 원문)이 아니라
        # basic.scientificNameShort(SpcScitfNmShort, canonical)와 비교해야 한다.
        # 예전 버전은 scientificName과 비교해 85건 전부를 "불일치"로 잘못 표시했다
        # (실제 불일치가 아니라 애초에 형식이 다른 두 값을 비교했을 뿐).
        expected = by_internal_id.get(iid, {}).get("scientificName")
        actual = d.get("basic", {}).get("scientificNameShort")
        if expected and actual and expected.strip() != actual.strip():
            sci_mismatch.append({"internalId": iid, "expected": expected, "actual": actual})

    failed_items = [{"internalId": s.internalId, "attemptCount": s.attemptCount,
                     "lastError": s.lastError}
                    for s in state.items.values() if s.status == FAILED]

    report = {
        "tierACandidateCount": len(candidates),
        "stateStatusCounts": status_counts,
        "normalizedFileCount": len(detail_files),
        "emptyFieldCounts": dict(empty_field_counts),
        "scientificNameMismatches": sci_mismatch,
        "failedItems": failed_items,
    }
    (REPORTS / "detail-collection-validation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[검증 결과] 완료 {status_counts.get(COMPLETE, 0)} / 실패 {status_counts.get(FAILED, 0)}")
    print(f"  학명 불일치: {len(sci_mismatch)}건")
    print(f"  빈 필드 상위: {empty_field_counts.most_common(5)}")
    print(f"저장: {REPORTS / 'detail-collection-validation.json'}")


if __name__ == "__main__":
    main()
