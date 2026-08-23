#!/usr/bin/env python3
"""§3+§4: 대표종 후보 점수만 계산한다. 어떤 대표종도 확정하지 않는다 —
aggregate-alias-registry.json의 representativeSpecies는 이 스크립트가 절대
건드리지 않는다(항상 null로 남는다)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.priority_engine import resolve_nifs_links
from src.representative_species_scoring import score_representative_candidate

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"


def load_taxonomy_by_id() -> dict[str, dict]:
    master = json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))
    return {r["internalId"]: r for r in master}


def build_priority_for_aggregate(agg: dict, *, taxonomy_by_id: dict, nifs_by_id: dict,
                                 fish_data_ids: set) -> dict:
    scored = []
    for c in agg["candidateSpecies"]:
        full = taxonomy_by_id[c["internalId"]]
        result = score_representative_candidate(
            full, source_name=agg["sourceName"],
            nifs_linked=c["internalId"] in nifs_by_id,
            fish_data_linked=c["internalId"] in fish_data_ids,
            has_domestic_distribution_data=False,  # 상세 API 미수집 — 이번 실행은 항상 False
            has_commercial_popularity_data=False,  # 데이터 소스 없음 — 항상 False
        )
        scored.append(result)
    scored.sort(key=lambda r: (-r["score"], r["internalId"]))
    return {"aggregateName": agg["sourceName"], "aggregateId": agg["aggregateId"],
            "taxonomicScope": agg["taxonomicScope"], "candidateSpecies": scored}


def main() -> None:
    registry = json.loads((MAPPINGS / "aggregate-alias-registry.json").read_text(encoding="utf-8"))
    taxonomy_by_id = load_taxonomy_by_id()
    nifs_by_id = resolve_nifs_links(
        json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8")))
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    fish_data_ids = {r["internalId"] for r in resolved}

    results = [build_priority_for_aggregate(agg, taxonomy_by_id=taxonomy_by_id,
                                            nifs_by_id=nifs_by_id, fish_data_ids=fish_data_ids)
              for agg in registry]

    PRIORITY.mkdir(parents=True, exist_ok=True)
    (PRIORITY / "aggregate-species-priority.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    print("[1] 대표종 후보 점수 계산(확정 아님)")
    for r in results:
        top = r["candidateSpecies"][0] if r["candidateSpecies"] else None
        print(f"    {r['aggregateName']:6s} 후보 {len(r['candidateSpecies'])}건, "
              f"최고점: {top['koreanName'] if top else '-'}({top['score'] if top else '-'})")

    print(f"\n✅ 저장: {PRIORITY / 'aggregate-species-priority.json'}")


if __name__ == "__main__":
    main()
