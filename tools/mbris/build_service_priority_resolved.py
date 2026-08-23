#!/usr/bin/env python3
"""fish-data-link-resolved.json을 입력으로 한 Service Priority 재계산(시뮬레이션).

점수 가중치·계산식은 전혀 바꾸지 않는다(priority_engine.py / service_priority.py
그대로 재사용). 바뀌는 것은 "어떤 종이 fish-data.ts와 연결됐다고 볼 것인가" 뿐이다.
기존 산출물(data/mbris/priority/service-priority.json 등)은 전혀 건드리지 않는다.
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
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

# 원본 rank에 승인 별칭을 최상위로 추가한다 — 가중치가 아니라 "동일 종에 여러 이름이
# 걸렸을 때 대표 레코드로 뭘 쓸지" 우선순위일 뿐이다. 점수식과는 무관하다.
_MATCH_TYPE_RANK = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1, "approved_alias": 4}


def load_nifs_links() -> dict[str, str]:
    path = MAPPINGS / "nifs-mbris-link.json"
    if not path.exists():
        return {}
    return resolve_nifs_links(json.loads(path.read_text(encoding="utf-8")))


def load_resolved_fish_data_links() -> dict[str, dict]:
    path = MAPPINGS / "fish-data-link-resolved.json"
    links = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for link in links:
        iid = link["internalId"]
        if iid not in out or _MATCH_TYPE_RANK[link["matchType"]] > _MATCH_TYPE_RANK[out[iid]["matchType"]]:
            out[iid] = link
    return out


def build_profile(rec: dict, *, nifs_match_type, fish_data_match) -> dict:
    """build_species_profile.py의 build_profile과 동일 로직 — 입력만 resolved로 바뀐다."""
    sp = rec["scientificNameParsing"]
    has_ko = bool(rec["koreanName"])
    nifs_linked = nifs_match_type is not None
    fish_data_linked = fish_data_match is not None

    data_result = compute_score(
        organism_group=rec["organismGroup"], has_korean_name=has_ko,
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

    return {
        "internalId": rec["internalId"], "koreanName": rec["koreanName"],
        "scientificName": rec["scientificNameCanonical"] or rec["scientificNameRaw"],
        "organismGroup": rec["organismGroup"],
        "nifsLinked": nifs_linked, "nifsMatchType": nifs_match_type,
        "fishDataLinked": fish_data_linked,
        "fishDataMatchType": fish_data_match["matchType"] if fish_data_match else None,
        "fishDataSourceNames": fish_data_match.get("sourceNames") if fish_data_match else None,
        "fishingTargetStatus": fishing_status,
        "dataPriorityScore": data_result.score, "collectionTier": collection_tier,
        "detailCollectionStatus": detail_collection_status(collection_tier),
        "servicePriorityScore": service_result.score, "serviceReasons": service_result.reasons,
        "serviceTier": service_tier,
        "reviewStatus": review_status(is_uncertain=sp["isUncertain"], has_korean_name=has_ko,
                                      nifs_match_type=nifs_match_type),
    }


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main() -> None:
    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    candidates = fish + nonfish

    nifs_by_id = load_nifs_links()
    fish_data_by_id = load_resolved_fish_data_links()

    # sourceNames 그룹핑 — 동일 internalId에 걸린 모든 fish-data 이름을 각 대표 레코드에 붙인다.
    resolved_raw = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    names_by_id: dict[str, list[str]] = {}
    for link in resolved_raw:
        names_by_id.setdefault(link["internalId"], []).append(link["sourceName"])
    for iid, rep in fish_data_by_id.items():
        rep["sourceNames"] = names_by_id.get(iid, [])

    print(f"[1] Candidate {len(candidates):,}건, resolved fish-data 연결 {len(fish_data_by_id)}종")

    profiles = [build_profile(rec, nifs_match_type=nifs_by_id.get(rec["internalId"]),
                              fish_data_match=fish_data_by_id.get(rec["internalId"]))
               for rec in candidates]

    tier_counts = Counter(p["serviceTier"] for p in profiles)
    print(f"[2] serviceTier(resolved): {dict(tier_counts)}")

    ranked = sorted(profiles, key=lambda p: (-p["servicePriorityScore"], p["internalId"]))
    PRIORITY.mkdir(parents=True, exist_ok=True)
    (PRIORITY / "service-priority-resolved.json").write_text(
        json.dumps(ranked, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(PRIORITY / "service-priority-resolved.csv",
              ["internalId", "koreanName", "scientificName", "organismGroup",
               "servicePriorityScore", "serviceTier", "fishDataLinked", "fishDataSourceNames",
               "nifsLinked", "fishingTargetStatus"],
              [[p["internalId"], p["koreanName"] or "", p["scientificName"] or "",
                p["organismGroup"], p["servicePriorityScore"], p["serviceTier"],
                p["fishDataLinked"], " | ".join(p["fishDataSourceNames"] or []),
                p["nifsLinked"], p["fishingTargetStatus"]] for p in ranked])

    for tier, name in (("A", "service-tier-a-resolved"), ("B", "service-tier-b-resolved"),
                       ("C", "service-tier-c-resolved")):
        subset = [p for p in ranked if p["serviceTier"] == tier]
        (PRIORITY / f"{name}.json").write_text(
            json.dumps(subset, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"    Tier A(resolved) {tier_counts.get('A', 0)}종 → "
          f"{PRIORITY / 'service-tier-a-resolved.json'}")

    # --- 영향 비교(§3) ---
    print("[3] 영향 비교")
    before_path = PRIORITY / "service-priority.json"
    before = json.loads(before_path.read_text(encoding="utf-8")) if before_path.exists() else []
    before_by_id = {p["internalId"]: p for p in before}
    after_by_id = {p["internalId"]: p for p in profiles}

    before_tier_a = {iid for iid, p in before_by_id.items() if p["serviceTier"] == "A"}
    after_tier_a = {iid for iid, p in after_by_id.items() if p["serviceTier"] == "A"}
    newly_entered = sorted(after_tier_a - before_tier_a)
    newly_left = sorted(before_tier_a - after_tier_a)

    score_up_same_tier = []
    for iid, p_after in after_by_id.items():
        p_before = before_by_id.get(iid)
        if not p_before:
            continue
        if (p_after["servicePriorityScore"] > p_before["servicePriorityScore"]
                and p_after["serviceTier"] == p_before["serviceTier"]):
            score_up_same_tier.append({
                "internalId": iid, "koreanName": p_after["koreanName"],
                "scoreBefore": p_before["servicePriorityScore"],
                "scoreAfter": p_after["servicePriorityScore"],
                "tier": p_after["serviceTier"],
                "fishDataSourceNamesAfter": p_after.get("fishDataSourceNames"),
            })

    multi_source_names = [{"internalId": iid, "sourceNames": names}
                          for iid, names in names_by_id.items() if len(names) > 1]

    existing_matched = len({l["internalId"] for l in
                            json.loads((MAPPINGS / "fish-data-link.json").read_text(encoding="utf-8"))})
    resolved_matched = len(fish_data_by_id)

    impact = {
        "generatedAt": NOW,
        "existingMatchedCount": existing_matched,
        "resolvedMatchedCount": resolved_matched,
        "approvedAliasCount": resolved_matched - existing_matched if resolved_matched >= existing_matched else None,
        "beforeTierACount": len(before_tier_a),
        "afterTierACount": len(after_tier_a),
        "tierAChange": len(after_tier_a) - len(before_tier_a),
        "newlyEnteredTierA": [{"internalId": iid, "koreanName": after_by_id[iid]["koreanName"],
                               "servicePriorityScore": after_by_id[iid]["servicePriorityScore"],
                               "fishDataSourceNames": after_by_id[iid].get("fishDataSourceNames")}
                              for iid in newly_entered],
        "leftTierA": newly_left,
        "scoreIncreasedTierUnchanged": score_up_same_tier,
        "speciesWithMultipleSourceNames": multi_source_names,
        "note": ("Tier A 증가분이 승인 건수(2)와 다를 수 있다 — 이미 다른 신호(NIFS 등)로 "
                "Tier A였던 종에 별칭만 추가되면 티어 변화 없이 점수만 오른다."),
    }
    (REPORTS / "service-priority-alias-impact.json").write_text(
        json.dumps(impact, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"    기존 Tier A {len(before_tier_a)} → 승인 후 {len(after_tier_a)} "
          f"(변화 {impact['tierAChange']:+d})")
    print(f"    신규 편입: {[x['koreanName'] for x in impact['newlyEnteredTierA']]}")
    print(f"    점수만 변경(티어 유지): {[x['koreanName'] for x in score_up_same_tier]}")
    print(f"    복수 sourceName 종: {multi_source_names}")

    # 기존 산출물 불변 자기 점검
    for f in ("service-priority.json", "service-tier-a.json", "service-priority-summary.json"):
        p = PRIORITY / f
        if p.exists():
            print(f"    (원본 유지 확인) {f}: {p.stat().st_size} bytes")

    print(f"\n✅ 저장: {REPORTS / 'service-priority-alias-impact.json'}")


if __name__ == "__main__":
    main()
