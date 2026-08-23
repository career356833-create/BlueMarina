#!/usr/bin/env python3
"""§7: Tier A 86종 수집의 오류/예외를 지정된 분류 체계로 정리한다.
실패 0건이어도 빈 리포트를 만든다(카테고리 자체는 항상 출력)."""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.detail_collector import load_tier_a_candidates
from src.detail_state import DetailCollectionState, COMPLETE

ROOT = Path(__file__).resolve().parent.parent.parent
MBRIS = ROOT / "data" / "mbris"
TIER_A_FILE = MBRIS / "priority" / "service-tier-a.json"
STATE_PATH = MBRIS / "state" / "detail-collection-state.json"
API_LOG = MBRIS / "raw" / "api" / "logs" / "call-log.jsonl"
REPORTS = MBRIS / "reports"

CATEGORIES = ["auth_error", "rate_limit", "timeout", "empty_response", "no_item",
              "multiple_candidates", "scientific_name_mismatch", "korean_name_mismatch",
              "parse_error", "normalization_error"]


def classify_failure(last_error: str) -> str:
    e = last_error or ""
    if "auth_error" in e:
        return "auth_error"
    if "rate_limited" in e:
        return "rate_limit"
    if "timeout" in e:
        return "timeout"
    if "empty_response" in e:
        return "empty_response"
    if "xml_parse_error" in e:
        return "parse_error"
    if "검색 결과 0건" in e and "재검색" not in e:
        return "no_item"
    if "학명 정확 일치가" in e or "재검색도 실패" in e or "정확 일치 없음" in e:
        return "multiple_candidates"
    return "scientific_name_mismatch"  # 기본값 — 그 외 매칭 실패 사유


def load_today_api_errors() -> list[dict]:
    if not API_LOG.exists():
        return []
    lines = [json.loads(l) for l in API_LOG.read_text(encoding="utf-8").strip().splitlines() if l]
    return [l for l in lines if not l.get("ok")]


def main() -> None:
    candidates, _issues = load_tier_a_candidates(TIER_A_FILE)
    state = DetailCollectionState.load(STATE_PATH)

    failures = []
    for c in candidates:
        st = state.items.get(c["internalId"])
        if st is None or st.status != COMPLETE:
            failures.append({
                "internalId": c["internalId"],
                "koreanName": c.get("koreanName"),
                "scientificName": c["scientificName"],
                "attemptCount": st.attemptCount if st else 0,
                "lastError": st.lastError if st else "시도 기록 없음",
                "lastAttemptAt": st.lastAttemptAt if st else None,
                "category": classify_failure(st.lastError if st else ""),
            })

    category_counts = {cat: 0 for cat in CATEGORIES}
    for f in failures:
        category_counts[f["category"]] += 1

    api_errors = load_today_api_errors()
    api_error_type_counts = dict(Counter(e.get("errorType") for e in api_errors))

    result = {
        "totalCandidates": len(candidates),
        "totalFailures": len(failures),
        "categories": CATEGORIES,
        "categoryCounts": category_counts,
        "failures": failures,
        "apiCallLevelErrorCounts": api_error_type_counts,
        "note": ("apiCallLevelErrorCounts는 HTTP/네트워크 단의 에러(auth_error 등)이고, "
                "categoryCounts는 최종 종별 실패 사유(매칭 실패 포함)다 — 겹칠 수 있다. "
                "실패 0건이어도 이 리포트와 tier-a-manual-review.csv는 항상 생성한다."),
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "tier-a-collection-errors.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    with (REPORTS / "tier-a-manual-review.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["internalId", "koreanName", "scientificName", "attemptCount",
                    "category", "lastError", "lastAttemptAt"])
        for fl in failures:
            w.writerow([fl["internalId"], fl["koreanName"], fl["scientificName"],
                        fl["attemptCount"], fl["category"], fl["lastError"], fl["lastAttemptAt"]])

    print(f"[1] 실패 {len(failures)}/{len(candidates)}건")
    print(f"    카테고리별: {category_counts}")
    print(f"    API 레벨 에러: {api_error_type_counts}")
    print(f"\n✅ 저장: {REPORTS / 'tier-a-collection-errors.json'}")
    print(f"✅ 저장: {REPORTS / 'tier-a-manual-review.csv'}(실패 0건이어도 헤더는 생성)")


if __name__ == "__main__":
    main()
