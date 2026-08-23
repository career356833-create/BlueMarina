#!/usr/bin/env python3
"""manual_review 77건을 사람이 검토하기 좋은 순서로 정렬한 큐를 만든다.

자동 승인은 절대 하지 않는다 — autoApplyAllowed는 전 항목 false로 고정.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
CANDIDATES_PATH = MAPPINGS / "fish-data-alias-candidates.json"

# 우선순위: 사람이 검토하기 쉬운(확신도 높은) 것부터
PRIORITY_ORDER = [
    "single_high_similarity",     # 1. 단일 후보 + similarity 1.0
    "single_same_group",          # 2. 단일 후보 + 분류군 일치(정보 있음)
    "multiple_candidates",        # 3. 복수 후보
    "collective_name",            # 4. 집합명
    "no_candidates",              # 5. 후보 없음
    "source_name_pollution",      # 6. 이름 오염
]


def review_bucket(rec: dict) -> str:
    ac = rec["aliasCandidates"]
    cands = rec["candidates"]

    if ac["cautionLabelDetected"]:
        return "source_name_pollution"
    if not cands:
        return "no_candidates"
    if ac["hasGroupSuffix"] or any("known_collective_name" in r for r in rec["statusReasons"]):
        return "collective_name"
    if len(cands) >= 2:
        return "multiple_candidates"
    # 단일 후보
    if cands[0]["similarityScore"] >= 1.0:
        return "single_high_similarity"
    return "single_same_group"


def recommended_action(bucket: str) -> str:
    return {
        "single_high_similarity": "정확 일치 — 사람이 학명 재확인 후 승인 검토",
        "single_same_group": "단일 후보이나 근거가 추론적 — 분류군·설명 대조 후 판단",
        "multiple_candidates": "후보 중 하나를 특정할 추가 근거 필요(학명/도감 대조)",
        "collective_name": "집합명 — 대표종 매핑 대신 그룹 표시 유지 검토",
        "no_candidates": "MBRIS 국가목록 자체에 해당 종이 없을 가능성 — 별도 원천 필요",
        "source_name_pollution": "fish-data.ts 원본 이름 정정 여부를 별도 결정 필요",
    }[bucket]


def main() -> None:
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    manual = [r for r in candidates if r["status"] == "manual_review"]
    print(f"[1] manual_review {len(manual)}건 로드")

    order_index = {b: i for i, b in enumerate(PRIORITY_ORDER)}
    queue = []
    for rec in manual:
        bucket = review_bucket(rec)
        top_sim = rec["candidates"][0]["similarityScore"] if rec["candidates"] else -1
        queue.append((order_index[bucket], -top_sim, rec["sourceName"], bucket, rec))

    queue.sort(key=lambda x: (x[0], x[1], x[2]))

    out = []
    for _order, _neg_sim, _name, bucket, rec in queue:
        out.append({
            "sourceName": rec["sourceName"],
            "category": rec["category"],
            "candidates": rec["candidates"],
            "ambiguityReason": rec["statusReasons"],
            "reviewBucket": bucket,
            "recommendedReviewAction": recommended_action(bucket),
            "autoApplyAllowed": False,
        })

    (MAPPINGS / "fish-data-manual-review-queue.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    from collections import Counter
    print(f"[2] 버킷 분포: {dict(Counter(x['reviewBucket'] for x in out))}")
    print(f"    전부 autoApplyAllowed=False: {all(not x['autoApplyAllowed'] for x in out)}")
    print(f"\n✅ 저장: {MAPPINGS / 'fish-data-manual-review-queue.json'} ({len(out)}건)")


if __name__ == "__main__":
    main()
