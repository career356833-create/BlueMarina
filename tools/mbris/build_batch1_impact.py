#!/usr/bin/env python3
"""Batch1 approved 판정만 별도 시뮬레이션한다. resolved 매핑은 수정하지 않는다."""
import json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import (
    compute_score, classify_tier, fishing_target_status, resolve_nifs_links,
)
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

_RANK = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1, "approved_alias": 4}


def score_one(rec: dict, nifs_match_type, fish_data_linked: bool) -> dict:
    sp = rec["scientificNameParsing"]
    has_ko = bool(rec["koreanName"])
    nifs_linked = nifs_match_type is not None
    fishing_status = fishing_target_status(rec["organismGroup"], nifs_linked, fish_data_linked)
    service_result = compute_service_score(
        fish_data_linked=fish_data_linked, nifs_linked=nifs_linked,
        fishing_confirmed=fishing_status == "confirmed",
        organism_group=rec["organismGroup"], has_korean_name=has_ko,
        is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"])
    return {"score": service_result.score, "tier": classify_service_tier(service_result.score)}


def main() -> None:
    batch1 = json.loads((MAPPINGS / "fish-data-alias-review-batch1.json").read_text(encoding="utf-8"))
    approved = [r for r in batch1 if r["decision"] == "approved"]
    rejected = [r for r in batch1 if r["decision"] == "rejected"]
    kept = [r for r in batch1 if r["decision"] == "keep_manual_review"]

    print(f"[1] batch1 10건 — approved {len(approved)} / rejected {len(rejected)} "
          f"/ keep_manual_review {len(kept)}")

    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    existing_names = {r["sourceName"] for r in resolved}

    # approved만 resolved에 가상 추가(파일에는 쓰지 않음, 메모리 시뮬레이션만)
    simulated = list(resolved)
    for r in approved:
        simulated.append({
            "sourceName": r["sourceName"], "internalId": r["candidateInternalId"],
            "matchType": "approved_alias", "confidence": r["confidence"],
            "evidenceSource": "BATCH1_MANUAL_REVIEW", "resolutionStatus": "resolved",
        })

    dup_names = {n for n, c in Counter(x["sourceName"] for x in simulated).items() if c > 1}
    if dup_names:
        raise SystemExit(f"시뮬레이션 중복 sourceName: {dup_names}")

    by_internal: dict[str, list[str]] = {}
    for r in simulated:
        by_internal.setdefault(r["internalId"], []).append(r["sourceName"])
    fish_data_by_id: dict[str, dict] = {}
    for r in simulated:
        iid = r["internalId"]
        if iid not in fish_data_by_id or _RANK[r["matchType"]] > _RANK[fish_data_by_id[iid]["matchType"]]:
            fish_data_by_id[iid] = r

    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    candidates = fish + nonfish
    nifs_links_path = MAPPINGS / "nifs-mbris-link.json"
    nifs_by_id = resolve_nifs_links(json.loads(nifs_links_path.read_text(encoding="utf-8")))

    before_tier_a, after_tier_a = set(), set()
    for rec in candidates:
        iid = rec["internalId"]
        nifs_mt = nifs_by_id.get(iid)
        before = score_one(rec, nifs_mt, iid in {r["internalId"] for r in resolved})
        after = score_one(rec, nifs_mt, iid in fish_data_by_id)
        if before["tier"] == "A":
            before_tier_a.add(iid)
        if after["tier"] == "A":
            after_tier_a.add(iid)

    multi = [{"internalId": iid, "sourceNames": names}
            for iid, names in by_internal.items() if len(names) > 1]

    impact = {
        "generatedAt": NOW,
        "reviewedCount": len(batch1),
        "approvedCount": len(approved),
        "rejectedCount": len(rejected),
        "keepManualReviewCount": len(kept),
        "resolvedMappingCountIfApplied": len(simulated),
        "uniqueMbrisSpeciesIfApplied": len(fish_data_by_id),
        "beforeTierACount": len(before_tier_a),
        "afterTierACountIfApplied": len(after_tier_a),
        "tierAChangeIfApplied": len(after_tier_a) - len(before_tier_a),
        "speciesWithMultipleAliasesIfApplied": multi,
        "approvedItems": [{"sourceName": r["sourceName"], "internalId": r["candidateInternalId"],
                           "koreanName": r["candidateKoreanName"]} for r in approved],
        "note": ("이번 배치는 approved 0건이다 — 후보 형태가 원본 설명과 명백히 모순되는 사례가 "
                "다수 발견되어 대부분 rejected/keep_manual_review로 판정됐다. 그래서 resolved "
                "매핑·Tier A 수치는 기존과 동일하다(변화 없음이 곧 검증 결과다)."),
    }
    (REPORTS / "fish-data-alias-batch1-impact.json").write_text(
        json.dumps(impact, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[2] resolved(가정) {len(resolved)} -> {len(simulated)}, "
          f"고유종 {len(fish_data_by_id)}")
    print(f"    Tier A {len(before_tier_a)} -> {len(after_tier_a)} "
          f"(변화 {impact['tierAChangeIfApplied']:+d})")
    print(f"    복수 별칭 종: {multi}")
    print(f"\n✅ 저장: {REPORTS / 'fish-data-alias-batch1-impact.json'}")


if __name__ == "__main__":
    main()
