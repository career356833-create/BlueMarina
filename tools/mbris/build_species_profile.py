#!/usr/bin/env python3
"""Species Profile 생성: Candidate(4,332) → Data Priority + Service Priority → Tier.

Data Priority(collectionTier)와 Service Priority(serviceTier)는 서로 다른 질문에
답한다 — 전자는 "공식 데이터를 얼마나 확보했는가", 후자는 "서비스에 먼저 실을
가치가 있는가"다. 두 점수는 완전히 분리된 모듈(priority_engine.py / service_priority.py)에서
계산하고, 이 스크립트는 둘을 하나의 SpeciesProfile 레코드로 합치기만 한다.

원본 파일(taxonomy-master.json, *-candidates.json, nifs-mbris-link.json,
fish-data-link.json)은 읽기만 하고 수정하지 않는다.
"""
import csv, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import (
    compute_score, classify_tier, fishing_target_status,
    review_status, detail_collection_status, resolve_nifs_links,
)
from src.service_priority import compute_service_score, classify_service_tier

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
NOW = datetime.now(timezone.utc).isoformat()


def load_nifs_links() -> dict[str, str]:
    if not (MAPPINGS / "nifs-mbris-link.json").exists():
        return {}
    links = json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8"))
    return resolve_nifs_links(links)


def load_fish_data_links() -> dict[str, dict]:
    """internalId -> 가장 신뢰도 높은 fish-data-link 레코드.

    build_fish_data_mapping.py가 먼저 생성해 둔 파일을 읽기만 한다 — 여기서
    fish-data.ts를 다시 파싱하지 않는다(중복 로직 방지, 단일 진실 공급원).
    """
    path = MAPPINGS / "fish-data-link.json"
    if not path.exists():
        return {}
    links = json.loads(path.read_text(encoding="utf-8"))
    rank = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1}
    out: dict[str, dict] = {}
    for link in links:
        iid = link["internalId"]
        if iid not in out or rank[link["matchType"]] > rank[out[iid]["matchType"]]:
            out[iid] = link
    return out


def build_profile(rec: dict, *, nifs_match_type: str | None,
                  fish_data_match: dict | None) -> dict:
    sp = rec["scientificNameParsing"]
    has_ko = bool(rec["koreanName"])
    nifs_linked = nifs_match_type is not None
    fish_data_linked = fish_data_match is not None

    # --- Data Priority: 기존 로직 그대로, 값도 그대로 ---
    data_result = compute_score(
        organism_group=rec["organismGroup"], has_korean_name=has_ko,
        is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"],
        nifs_linked=nifs_linked)
    collection_tier = classify_tier(data_result.score)

    fishing_status = fishing_target_status(
        rec["organismGroup"], nifs_linked, fish_data_linked)

    # --- Service Priority: 신규 ---
    service_result = compute_service_score(
        fish_data_linked=fish_data_linked, nifs_linked=nifs_linked,
        fishing_confirmed=fishing_status == "confirmed",
        organism_group=rec["organismGroup"], has_korean_name=has_ko,
        is_uncertain=sp["isUncertain"], uncertainty_type=sp["uncertaintyType"])
    service_tier = classify_service_tier(service_result.score)

    return {
        "internalId": rec["internalId"],
        "koreanName": rec["koreanName"],
        "scientificName": rec["scientificNameCanonical"] or rec["scientificNameRaw"],
        "organismGroup": rec["organismGroup"],
        "taxonomy": {
            "class": rec["taxonomy"].get("class"),
            "order": rec["taxonomy"].get("order"),
            "family": rec["taxonomy"].get("family"),
        },
        "nifsLinked": nifs_linked,
        "nifsMatchType": nifs_match_type,
        "fishDataLinked": fish_data_linked,
        "fishDataMatchType": fish_data_match["matchType"] if fish_data_match else None,
        "fishingTargetStatus": fishing_status,
        "dataPriorityScore": data_result.score,
        "dataReasons": data_result.reasons,
        "collectionTier": collection_tier,
        "detailCollectionStatus": detail_collection_status(collection_tier),
        "servicePriorityScore": service_result.score,
        "serviceReasons": service_result.reasons,
        "serviceTier": service_tier,
        "reviewStatus": review_status(
            is_uncertain=sp["isUncertain"], has_korean_name=has_ko,
            nifs_match_type=nifs_match_type),
    }


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main() -> None:
    NORM.mkdir(parents=True, exist_ok=True)
    PRIORITY.mkdir(parents=True, exist_ok=True)

    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    candidates = fish + nonfish

    nifs_by_id = load_nifs_links()
    fish_data_by_id = load_fish_data_links()
    print(f"[1] Candidate {len(candidates):,}건 (fish {len(fish):,} + nonfish {len(nonfish):,})")
    print(f"    NIFS 연결 {len(nifs_by_id)}건, fish-data.ts 연결 {len(fish_data_by_id)}건")

    profiles = [
        build_profile(rec, nifs_match_type=nifs_by_id.get(rec["internalId"]),
                     fish_data_match=fish_data_by_id.get(rec["internalId"]))
        for rec in candidates
    ]

    collection_tier_counts = Counter(p["collectionTier"] for p in profiles)
    service_tier_counts = Counter(p["serviceTier"] for p in profiles)
    fishing_counts = Counter(p["fishingTargetStatus"] for p in profiles)
    review_counts = Counter(p["reviewStatus"] for p in profiles)
    print(f"[2] collectionTier: {dict(collection_tier_counts)}")
    print(f"    serviceTier: {dict(service_tier_counts)}")
    print(f"    낚시대상: {dict(fishing_counts)}  검토: {dict(review_counts)}")

    # --- normalized/species-profile.json·csv : 정규 스키마 원장 ---
    (NORM / "species-profile.json").write_text(
        json.dumps(profiles, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(NORM / "species-profile.csv",
              ["internalId", "koreanName", "scientificName", "organismGroup",
               "class", "order", "family", "nifsLinked", "nifsMatchType",
               "fishDataLinked", "fishDataMatchType", "fishingTargetStatus",
               "dataPriorityScore", "collectionTier", "detailCollectionStatus",
               "servicePriorityScore", "serviceTier", "reviewStatus"],
              [[p["internalId"], p["koreanName"] or "", p["scientificName"] or "",
                p["organismGroup"], p["taxonomy"]["class"] or "", p["taxonomy"]["order"] or "",
                p["taxonomy"]["family"] or "", p["nifsLinked"], p["nifsMatchType"] or "",
                p["fishDataLinked"], p["fishDataMatchType"] or "", p["fishingTargetStatus"],
                p["dataPriorityScore"], p["collectionTier"], p["detailCollectionStatus"],
                p["servicePriorityScore"], p["serviceTier"], p["reviewStatus"]]
               for p in profiles])

    # --- priority/ : Data Priority 뷰(기존 파일명 유지) ---
    data_ranked = sorted(profiles, key=lambda p: (-p["dataPriorityScore"], p["internalId"]))
    (PRIORITY / "species-priority.json").write_text(
        json.dumps(data_ranked, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(PRIORITY / "species-priority.csv",
              ["internalId", "koreanName", "scientificName", "organismGroup",
               "dataPriorityScore", "collectionTier", "dataReasons",
               "fishingTargetStatus", "detailCollectionStatus", "reviewStatus"],
              [[p["internalId"], p["koreanName"] or "", p["scientificName"] or "",
                p["organismGroup"], p["dataPriorityScore"], p["collectionTier"],
                " | ".join(p["dataReasons"]), p["fishingTargetStatus"],
                p["detailCollectionStatus"], p["reviewStatus"]] for p in data_ranked])

    for tier in ("tier1", "tier2", "tier3"):
        subset = [p for p in data_ranked if p["collectionTier"] == tier]
        (PRIORITY / f"{tier}-species.json").write_text(
            json.dumps(subset, ensure_ascii=False, indent=2), encoding="utf-8")

    data_summary = {
        "generatedAt": NOW,
        "totalEvaluated": len(profiles),
        "totalExcluded": None,
        "tierCounts": dict(collection_tier_counts),
        "tierThresholds": {"tier1": ">=60", "tier2": "30-59", "tier3": "<30"},
        "fishingTargetStatusCounts": dict(fishing_counts),
        "reviewStatusCounts": dict(review_counts),
        "nifsLinkedCount": sum(1 for p in profiles if p["nifsLinked"]),
        "nifsMatchTypeCounts": dict(Counter(
            p["nifsMatchType"] for p in profiles if p["nifsMatchType"])),
        "organismGroupCounts": dict(Counter(p["organismGroup"] for p in profiles)),
        "organismGroupByTier": {
            group: dict(Counter(p["collectionTier"] for p in profiles if p["organismGroup"] == group))
            for group in ("fish", "cephalopod", "crustacean", "gastropod", "bivalve")
        },
    }
    taxonomy_master_path = NORM / "taxonomy-master.json"
    if taxonomy_master_path.exists():
        total_master = len(json.loads(taxonomy_master_path.read_text(encoding="utf-8")))
        data_summary["totalExcluded"] = total_master - len(profiles)
        data_summary["totalMaster"] = total_master
    (PRIORITY / "priority-summary.json").write_text(
        json.dumps(data_summary, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- priority/ : Service Priority 뷰(신규) ---
    service_ranked = sorted(profiles, key=lambda p: (-p["servicePriorityScore"], p["internalId"]))
    (PRIORITY / "service-priority.json").write_text(
        json.dumps(service_ranked, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(PRIORITY / "service-priority.csv",
              ["internalId", "koreanName", "scientificName", "organismGroup",
               "servicePriorityScore", "serviceTier", "serviceReasons",
               "fishDataLinked", "nifsLinked", "fishingTargetStatus", "reviewStatus"],
              [[p["internalId"], p["koreanName"] or "", p["scientificName"] or "",
                p["organismGroup"], p["servicePriorityScore"], p["serviceTier"],
                " | ".join(p["serviceReasons"]), p["fishDataLinked"], p["nifsLinked"],
                p["fishingTargetStatus"], p["reviewStatus"]] for p in service_ranked])

    for tier, name in (("A", "service-tier-a"), ("B", "service-tier-b"), ("C", "service-tier-c")):
        subset = [p for p in service_ranked if p["serviceTier"] == tier]
        (PRIORITY / f"{name}.json").write_text(
            json.dumps(subset, ensure_ascii=False, indent=2), encoding="utf-8")

    scores = [p["servicePriorityScore"] for p in profiles]
    service_summary = {
        "generatedAt": NOW,
        "totalEvaluated": len(profiles),
        "scoreDistribution": {
            "min": min(scores), "max": max(scores),
            "average": round(sum(scores) / len(scores), 2),
            "histogram": dict(sorted(Counter((s // 10) * 10 for s in scores).items())),
        },
        "tierCounts": dict(service_tier_counts),
        "tierThresholds": {"A": ">=60", "B": "40-59", "C": "<40"},
        "fishDataLinkedCount": sum(1 for p in profiles if p["fishDataLinked"]),
        "nifsLinkedCount": sum(1 for p in profiles if p["nifsLinked"]),
        "confirmedFishingCount": fishing_counts.get("confirmed", 0),
        "organismGroupByServiceTier": {
            group: dict(Counter(p["serviceTier"] for p in profiles if p["organismGroup"] == group))
            for group in ("fish", "cephalopod", "crustacean", "gastropod", "bivalve")
        },
    }
    (PRIORITY / "service-priority-summary.json").write_text(
        json.dumps(service_summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ {len(profiles):,}건 → {NORM / 'species-profile.json'}")
    print(f"   collectionTier  1:{collection_tier_counts.get('tier1', 0)} "
          f"2:{collection_tier_counts.get('tier2', 0)} 3:{collection_tier_counts.get('tier3', 0)}")
    print(f"   serviceTier     A:{service_tier_counts.get('A', 0)} "
          f"B:{service_tier_counts.get('B', 0)} C:{service_tier_counts.get('C', 0)}")


if __name__ == "__main__":
    main()
