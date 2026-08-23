#!/usr/bin/env python3
"""§6: Aggregate Alias의 대표종 후보가 실제로 fish-data에 연결된다면 어떤 serviceScore를
받을지 시뮬레이션만 한다. 공식 priority/*.json 산출물은 재생성하지 않는다(자동 Tier
변경 금지) — representativeSpecies는 여전히 null이므로 실제로는 아무 것도 연결되지 않았다."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import fishing_target_status, resolve_nifs_links
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()


def main() -> None:
    priority = json.loads((PRIORITY / "aggregate-species-priority.json").read_text(encoding="utf-8"))
    taxonomy_by_id = {r["internalId"]: r for r in
                      json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))}
    nifs_by_id = resolve_nifs_links(
        json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8")))
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    fish_data_ids = {r["internalId"] for r in resolved}

    existing_tier_a_ids = set()
    for fname in ("service-tier-a.json", "service-tier-a-resolved.json"):
        p = PRIORITY / fname
        if p.exists():
            existing_tier_a_ids |= {r["internalId"] for r in json.loads(p.read_text(encoding="utf-8"))}

    aggregates = []
    for agg in priority:
        top = agg["candidateSpecies"][0] if agg["candidateSpecies"] else None
        if top is None:
            aggregates.append({"aggregateName": agg["aggregateName"], "topScoringCandidate": None})
            continue

        rec = taxonomy_by_id[top["internalId"]]
        sp = rec["scientificNameParsing"]
        has_ko = bool(rec["koreanName"])
        nifs_linked = top["internalId"] in nifs_by_id
        # fish_data_linked는 현재 실제 상태를 그대로 조회한 값이다(항상 False) — "연결됐다고
        # 가정"하는 가짜 시뮬레이션이 아니라, representativeSpecies가 여전히 null인 지금
        # 이 순간 이 후보가 실제로 받는 serviceScore를 그대로 계산한 것이다.
        fish_data_linked = top["internalId"] in fish_data_ids
        fishing_status = fishing_target_status(rec["organismGroup"], nifs_linked, fish_data_linked)
        service_result = compute_service_score(
            fish_data_linked=fish_data_linked, nifs_linked=nifs_linked,
            fishing_confirmed=fishing_status == "confirmed",
            organism_group=rec["organismGroup"], has_korean_name=has_ko,
            is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"])
        service_tier = classify_service_tier(service_result.score)

        aggregates.append({
            "aggregateName": agg["aggregateName"],
            "topScoringCandidate": {
                "internalId": top["internalId"], "koreanName": top["koreanName"],
                "representativeScore": top["score"],
            },
            "currentServicePriorityScore": service_result.score,
            "currentServiceTier": service_tier,
            "alreadyInTierA": top["internalId"] in existing_tier_a_ids,
        })

    impact = {
        "generatedAt": NOW,
        "simulationOnly": True,
        "representativeSpeciesActuallyLinked": False,
        "note": ("representativeSpecies는 aggregate-alias-registry.json에서 여전히 null이다. "
                "currentServicePriorityScore/currentServiceTier는 '연결됐다고 가정'한 가짜 값이 "
                "아니라, 최고점 후보가 지금 이 순간 실제로 받는 점수를 그대로 계산한 것이다 — "
                "아직 fish-data/NIFS 어디에도 연결되지 않았으므로 전부 낮은 점수로 나온다. "
                "공식 priority/*.json 산출물은 이 스크립트로 재생성하지 않았다."),
        "existingTierACount": len(existing_tier_a_ids),
        "aggregates": aggregates,
        "tierAChangeIfApplied": 0,  # representativeSpecies를 실제로 연결한 적이 없으므로 항상 0
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "aggregate-alias-impact.json").write_text(
        json.dumps(impact, ensure_ascii=False, indent=2), encoding="utf-8")

    print("[1] Aggregate Alias Priority 영향 시뮬레이션(실제 반영 없음)")
    for a in aggregates:
        top = a["topScoringCandidate"]
        if top:
            print(f"    {a['aggregateName']:6s} 최고점후보={top['koreanName']}({top['representativeScore']}) "
                  f"현재serviceScore={a['currentServicePriorityScore']} tier={a['currentServiceTier']}")
    print(f"    Tier A 변화: {impact['tierAChangeIfApplied']} (실제 연결 안 함)")
    print(f"\n✅ 저장: {REPORTS / 'aggregate-alias-impact.json'}")


if __name__ == "__main__":
    main()
