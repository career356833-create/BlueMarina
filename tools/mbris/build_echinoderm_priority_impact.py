#!/usr/bin/env python3
"""§6: echinoderm 후보 234건이 Service/Data Priority에 미치는 영향을 시뮬레이션만
한다. priority_engine.py/service_priority.py의 점수식은 전혀 건드리지 않고,
기존 priority/*.json 산출물도 재생성하지 않는다(자동 Tier 변경 금지) — 새 후보
234건만 떼어 계산해보고 결과를 별도 리포트에 남긴다."""
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import compute_score, classify_tier, fishing_target_status, resolve_nifs_links
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()


def main() -> None:
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    echinoderm = [r for r in nonfish if r["organismGroup"] == "echinoderm"]

    nifs_by_id = resolve_nifs_links(
        json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8")))
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    fish_data_ids = {r["internalId"] for r in resolved}

    profiles = []
    for rec in echinoderm:
        sp = rec["scientificNameParsing"]
        has_ko = bool(rec["koreanName"])
        nifs_mt = nifs_by_id.get(rec["internalId"])
        nifs_linked = nifs_mt is not None
        fish_data_linked = rec["internalId"] in fish_data_ids

        data_result = compute_score(organism_group=rec["organismGroup"], has_korean_name=has_ko,
                                    is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"],
                                    nifs_linked=nifs_linked)
        collection_tier = classify_tier(data_result.score)

        fishing_status = fishing_target_status(rec["organismGroup"], nifs_linked, fish_data_linked)

        service_result = compute_service_score(
            fish_data_linked=fish_data_linked, nifs_linked=nifs_linked,
            fishing_confirmed=fishing_status == "confirmed",
            organism_group=rec["organismGroup"], has_korean_name=has_ko,
            is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"])
        service_tier = classify_service_tier(service_result.score)

        profiles.append({
            "internalId": rec["internalId"], "koreanName": rec["koreanName"],
            "dataPriorityScore": data_result.score, "collectionTier": collection_tier,
            "fishingTargetStatus": fishing_status,
            "servicePriorityScore": service_result.score, "serviceTier": service_tier,
        })

    service_tier_dist = dict(Counter(p["serviceTier"] for p in profiles))
    data_tier_dist = dict(Counter(p["collectionTier"] for p in profiles))
    fishing_status_dist = dict(Counter(p["fishingTargetStatus"] for p in profiles))

    # 기존(공식) 산출물은 이 스크립트로 절대 재생성하지 않는다 — 그냥 지금 값을 읽어
    # "echinoderm 후보 중 이미 Tier A에 든 게 있는가"만 대조한다(당연히 없어야 정상).
    existing_tier_a_ids = set()
    for fname in ("service-tier-a.json", "service-tier-a-resolved.json"):
        p = PRIORITY / fname
        if p.exists():
            existing_tier_a_ids |= {r["internalId"] for r in json.loads(p.read_text(encoding="utf-8"))}
    echinoderm_ids = {p["internalId"] for p in profiles}
    overlap = echinoderm_ids & existing_tier_a_ids

    result = {
        "generatedAt": NOW,
        "simulationOnly": True,
        "note": ("기존 priority/*.json 산출물은 이 스크립트로 재생성하지 않았다 — echinoderm "
                "234건만 떼어 동일한 점수식으로 계산해본 결과다. echinoderm은 NIFS/fish-data "
                "연결이 전무하고 GROUP_BONUS·NONFISH_TARGET_GROUP 대상에도 포함되지 않으므로"
                "(priority_engine.py/service_priority.py 원본 그대로) 국명·학명 신뢰도 점수만 "
                "남아 구조적으로 Tier A/B에 도달할 수 없다."),
        "echinodermCandidateCount": len(profiles),
        "serviceTierDistribution": service_tier_dist,
        "dataPriorityTierDistribution": data_tier_dist,
        "fishingTargetStatusDistribution": fishing_status_dist,
        "existingApprovedTierAOverlapCount": len(overlap),
        "existingApprovedTierAOverlap": sorted(overlap),
        "maxServicePriorityScore": max((p["servicePriorityScore"] for p in profiles), default=0),
        "maxDataPriorityScore": max((p["dataPriorityScore"] for p in profiles), default=0),
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "echinoderm-priority-impact.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[1] echinoderm {len(profiles)}건 시뮬레이션")
    print(f"    serviceTier 분포: {service_tier_dist}")
    print(f"    dataPriority Tier 분포: {data_tier_dist}")
    print(f"    fishingTargetStatus 분포: {fishing_status_dist}")
    print(f"    기존 Tier A와 겹치는 echinoderm: {len(overlap)}건")
    print(f"\n✅ 저장: {REPORTS / 'echinoderm-priority-impact.json'}")


if __name__ == "__main__":
    main()
