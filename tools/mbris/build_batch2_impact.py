#!/usr/bin/env python3
"""Batch2: high confidence의 approved_alias/approved_species만 반영했다고 가정한 시뮬레이션.
실제 매핑 파일은 수정하지 않는다."""
import json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import compute_score, fishing_target_status, resolve_nifs_links
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

REFLECTABLE_DECISIONS = {"approved_alias", "approved_species"}
_RANK = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1, "approved_alias": 4}


def score_service(rec: dict, nifs_match_type, fish_data_linked: bool) -> str:
    sp = rec["scientificNameParsing"]
    has_ko = bool(rec["koreanName"])
    nifs_linked = nifs_match_type is not None
    fishing_status = fishing_target_status(rec["organismGroup"], nifs_linked, fish_data_linked)
    service_result = compute_service_score(
        fish_data_linked=fish_data_linked, nifs_linked=nifs_linked,
        fishing_confirmed=fishing_status == "confirmed",
        organism_group=rec["organismGroup"], has_korean_name=has_ko,
        is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"])
    return classify_service_tier(service_result.score)


def main() -> None:
    batch2 = json.loads((MAPPINGS / "fish-data-alias-review-batch2.json").read_text(encoding="utf-8"))

    reflectable = [r for r in batch2 if r["decision"] in REFLECTABLE_DECISIONS
                  and r["confidence"] == "high" and r["candidateInternalId"]]
    aggregate = [r for r in batch2 if r["decision"] == "aggregate_name"]
    market = [r for r in batch2 if r["decision"] == "market_name"]
    pollution = [r for r in batch2 if r["decision"] == "source_name_issue"]
    kept = [r for r in batch2 if r["decision"] == "keep_manual_review"]
    rejected = [r for r in batch2 if r["decision"] == "rejected_candidate"]
    spelling_variant = [r for r in batch2 if r["decision"] == "spelling_variant"]

    print(f"[1] batch2 {len(batch2)}건 — 반영가능(high+approved) {len(reflectable)} / "
          f"집합명 {len(aggregate)} / 시장명 {len(market)} / 이름오염 {len(pollution)} / "
          f"보류 {len(kept)} / 거절 {len(rejected)} / 표기변형(미반영) {len(spelling_variant)}")

    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    simulated = list(resolved)
    for r in reflectable:
        simulated.append({
            "sourceName": r["sourceName"], "internalId": r["candidateInternalId"],
            "matchType": "approved_alias", "confidence": r["confidence"],
            "evidenceSource": "BATCH2_OFFICIAL_RESEARCH", "resolutionStatus": "resolved",
        })

    dup_names = {n for n, c in Counter(x["sourceName"] for x in simulated).items() if c > 1}
    if dup_names:
        raise SystemExit(f"시뮬레이션 중복 sourceName: {dup_names}")

    fish_data_by_id: dict[str, dict] = {}
    for r in simulated:
        iid = r["internalId"]
        if iid not in fish_data_by_id or _RANK[r["matchType"]] > _RANK[fish_data_by_id[iid]["matchType"]]:
            fish_data_by_id[iid] = r

    new_species_ids = {r["candidateInternalId"] for r in reflectable}
    known_ids_before = {r["internalId"] for r in resolved}
    truly_new_ids = new_species_ids - known_ids_before  # resolved에 이미 있던 종이면 "새 종" 아님

    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    candidates = fish + nonfish
    nifs_by_id = resolve_nifs_links(
        json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8")))

    before_tier_a, after_tier_a = set(), set()
    for rec in candidates:
        iid = rec["internalId"]
        nifs_mt = nifs_by_id.get(iid)
        if score_service(rec, nifs_mt, iid in known_ids_before) == "A":
            before_tier_a.add(iid)
        if score_service(rec, nifs_mt, iid in fish_data_by_id) == "A":
            after_tier_a.add(iid)

    impact = {
        "generatedAt": NOW,
        "reviewedCount": len(batch2),
        "approvableHighConfidenceCount": len(reflectable),
        "aggregateNameCount": len(aggregate),
        "marketNameCount": len(market),
        "sourceNameIssueCount": len(pollution),
        "keepManualReviewCount": len(kept),
        "rejectedCount": len(rejected),
        "spellingVariantNotReflectedCount": len(spelling_variant),
        "resolvedMappingCountExisting": len(resolved),
        "resolvedMappingCountIfApplied": len(simulated),
        "beforeTierACount": len(before_tier_a),
        "afterTierACountIfApplied": len(after_tier_a),
        "tierAChangeIfApplied": len(after_tier_a) - len(before_tier_a),
        "newSpeciesCreated": False,  # 정책상 절대 새 species를 만들지 않음 — 항상 False로 고정 검증
        "newlyLinkedExistingSpecies": sorted(truly_new_ids),
        "reflectableItems": [{"sourceName": r["sourceName"],
                              "internalId": r["candidateInternalId"],
                              "canonicalKoreanName": r["canonicalKoreanName"],
                              "decision": r["decision"]} for r in reflectable],
        "note": ("newSpeciesCreated는 정책상 항상 False다 — candidateInternalId가 있는 항목만 "
                "reflectable로 취급하고, 전부 기존 MBRIS 종 ID를 재사용한다. 새 ID를 만들지 않는다."),
    }
    (REPORTS / "fish-data-alias-batch2-impact.json").write_text(
        json.dumps(impact, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[2] resolved {len(resolved)} -> {len(simulated)}(가정)")
    print(f"    Tier A {len(before_tier_a)} -> {len(after_tier_a)} "
          f"(변화 {impact['tierAChangeIfApplied']:+d})")
    print(f"\n✅ 저장: {REPORTS / 'fish-data-alias-batch2-impact.json'}")


if __name__ == "__main__":
    main()
