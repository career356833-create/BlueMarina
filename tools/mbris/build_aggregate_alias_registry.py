#!/usr/bin/env python3
"""§1+§2: Aggregate Alias Registry 생성.

fish-alias-registry.json은 읽지도 쓰지도 않는다(§5 aggregate-alias-links.json이
그 연결을 별도로 담당). 후보 풀은 taxonomicScope(class)로만 정한다."""
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.aggregate_alias import AGGREGATE_TARGETS, build_candidate_pool, build_registry_record

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NOW = datetime.now(timezone.utc).isoformat()


def load_echinoderm() -> list[dict]:
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    return [r for r in nonfish if r["organismGroup"] == "echinoderm"]


def build_records() -> list[dict]:
    echinoderm = load_echinoderm()
    records = []
    for i, target in enumerate(sorted(AGGREGATE_TARGETS, key=lambda t: t["sourceName"]), start=1):
        name = target["sourceName"]
        scope = target["taxonomicScope"]
        pool = build_candidate_pool(echinoderm, scope)

        name_matches = sum(1 for c in pool if name in (c["koreanName"] or ""))
        evidence = [
            {"organization": "로컬 분류학 검토", "source": "blue-marina-nonfish-candidates.json",
             "value": f"taxonomy.class == '{scope}' 종 {len(pool)}건을 후보 풀로 확정"},
            {"organization": "로컬 분류학 검토", "source": "batch3/echinoderm-alias-recheck",
             "value": f"'{name}' 단독 표제어(exact match) 0건, 후보 풀 중 국명에 '{name}' "
                       f"포함 {name_matches}건/{len(pool)}건 — aggregate_name 판정 근거"},
        ]

        records.append(build_registry_record(
            aggregate_id=f"AGG-{i:06d}", source_name=name, organism_group=target["organismGroup"],
            taxonomic_scope=scope, candidate_species=pool, evidence=evidence, now=NOW))
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["aggregateId", "sourceName", "organismGroup", "taxonomicScope", "status",
                    "candidateCount", "candidateSpeciesNames", "representativeSpecies",
                    "createdAt", "updatedAt"])
        for r in records:
            names = " / ".join(c["koreanName"] for c in r["candidateSpecies"])
            w.writerow([r["aggregateId"], r["sourceName"], r["organismGroup"], r["taxonomicScope"],
                        r["status"], len(r["candidateSpecies"]), names,
                        r["representativeSpecies"] or "", r["createdAt"], r["updatedAt"]])


def main() -> None:
    records = build_records()
    print(f"[1] Aggregate Alias {len(records)}건 생성")
    for r in records:
        print(f"    {r['aggregateId']} {r['sourceName']:6s} scope={r['taxonomicScope']:12s} "
              f"candidateCount={len(r['candidateSpecies'])}")

    MAPPINGS.mkdir(parents=True, exist_ok=True)
    (MAPPINGS / "aggregate-alias-registry.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "aggregate-alias-registry.csv", records)

    print(f"\n✅ 저장: {MAPPINGS / 'aggregate-alias-registry.json'}")
    print(f"✅ 저장: {MAPPINGS / 'aggregate-alias-registry.csv'}")


if __name__ == "__main__":
    main()
