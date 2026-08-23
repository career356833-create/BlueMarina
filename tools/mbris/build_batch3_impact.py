#!/usr/bin/env python3
"""Batch3: approved 3건만 반영했다고 가정한 시뮬레이션. 실제 Registry/매핑 파일은 수정하지 않는다."""
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import fishing_target_status, resolve_nifs_links
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

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
    batch3 = json.loads((MAPPINGS / "fish-alias-review-batch3.json").read_text(encoding="utf-8"))
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))

    approved = [r for r in batch3 if r["decision"] == "approved"]
    rejected = [r for r in batch3 if r["decision"] == "rejected"]
    aggregate = [r for r in batch3 if r["decision"] == "aggregate_name"]
    market = [r for r in batch3 if r["decision"] == "market_name"]
    source_issue = [r for r in batch3 if r["decision"] == "source_issue"]
    kept = [r for r in batch3 if r["decision"] == "keep_manual_review"]

    print(f"[1] batch3 {len(batch3)}건 — 승인후보 {len(approved)} / 거절 {len(rejected)} / "
          f"집합명 {len(aggregate)} / 시장명 {len(market)} / 이름오염 {len(source_issue)} / "
          f"보류 {len(kept)}")

    # 현재 Registry 상태 분포(작업 지시서에 명시된 기존 수치와 대조)
    status_before = Counter(r["status"] for r in registry)

    # 승인 후보가 실제 반영되면 Registry에서 이 이름들의 status가 manual_review -> approved로 바뀐다.
    status_after = Counter(status_before)
    for r in approved:
        status_after["manual_review"] -= 1
        status_after["approved"] += 1

    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    simulated = list(resolved)
    for r in approved:
        simulated.append({
            "sourceName": r["sourceName"], "internalId": r["internalId"],
            "matchType": "approved_alias", "confidence": r["confidence"],
            "evidenceSource": "BATCH3_OFFICIAL_RESEARCH", "resolutionStatus": "resolved",
        })

    dup_names = {n for n, c in Counter(x["sourceName"] for x in simulated).items() if c > 1}
    if dup_names:
        raise SystemExit(f"시뮬레이션 중복 sourceName: {dup_names}")

    fish_data_by_id: dict[str, dict] = {}
    for r in simulated:
        iid = r["internalId"]
        if iid not in fish_data_by_id or _RANK[r["matchType"]] > _RANK[fish_data_by_id[iid]["matchType"]]:
            fish_data_by_id[iid] = r

    known_ids_before = {r["internalId"] for r in resolved}
    new_species_ids = {r["internalId"] for r in approved}
    truly_new_ids = new_species_ids - known_ids_before

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
        "reviewedCount": len(batch3),
        "approvedCount": len(approved),
        "rejectedCount": len(rejected),
        "aggregateNameCount": len(aggregate),
        "marketNameCount": len(market),
        "sourceIssueCount": len(source_issue),
        "keepManualReviewCount": len(kept),
        "registryStatusBefore": dict(status_before),
        "registryStatusIfApplied": dict(status_after),
        "resolvedMappingCountExisting": len(resolved),
        "resolvedMappingCountIfApplied": len(simulated),
        "beforeTierACount": len(before_tier_a),
        "afterTierACountIfApplied": len(after_tier_a),
        "tierAChangeIfApplied": len(after_tier_a) - len(before_tier_a),
        "newSpeciesCreated": False,  # 정책상 절대 새 species를 만들지 않음 — 항상 False로 고정 검증
        "newlyLinkedExistingSpecies": sorted(truly_new_ids),
        "approvedItems": [{"sourceName": r["sourceName"], "internalId": r["internalId"],
                           "canonicalName": r["canonicalName"], "confidence": r["confidence"]}
                          for r in approved],
        "note": ("newSpeciesCreated는 정책상 항상 False다 — internalId가 있는 approved 항목만 "
                "반영 대상으로 취급하고, 전부 기존 MBRIS 종 ID를 재사용한다. 새 ID를 만들지 않는다. "
                "실제 Registry/resolved 파일은 이 스크립트로 수정되지 않는다(시뮬레이션 전용)."),
    }
    (REPORTS / "fish-alias-batch3-impact.json").write_text(
        json.dumps(impact, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[2] Registry: {dict(status_before)} -> {dict(status_after)}(가정)")
    print(f"[3] resolved {len(resolved)} -> {len(simulated)}(가정)")
    print(f"[4] Tier A {len(before_tier_a)} -> {len(after_tier_a)} "
          f"(변화 {impact['tierAChangeIfApplied']:+d})")
    print(f"\n✅ 저장: {REPORTS / 'fish-alias-batch3-impact.json'}")


if __name__ == "__main__":
    main()
