#!/usr/bin/env python3
"""§4: NIFS-MBRIS 학명 Crosswalk 생성.

nifs-mbris-link.json(원본)과 normalized/taxonomy-master.json(원본)은 읽기만
한다 — 전혀 수정하지 않는다. 25건 전체를 crosswalk에 담되, 이번 작업이 실제로
사람 판정을 채운 건 학명 충돌 6건뿐이고 나머지 19건은 기존 link의 정보를
그대로 옮겨(reviewStatus=approved, relationshipType=accepted_name_update로
간주 — 국명·학명 모두 일치하는 것으로 이미 확인된 건들) 25건 전체를 빠짐없이
기록한다.
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.taxonomy_crosswalk import build_crosswalk_record
from src.review_taxonomy_crosswalk_data import DECISIONS, TARGET_KOREAN_NAMES

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NORMALIZED_DETAIL = ROOT / "data" / "mbris" / "normalized" / "detail"


def load_links() -> list[dict]:
    return json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8"))


def canonical_sci_name(internal_id: str, fallback: str) -> str:
    detail_path = NORMALIZED_DETAIL / f"{internal_id}.json"
    if detail_path.exists():
        detail = json.loads(detail_path.read_text(encoding="utf-8"))
        short = detail["basic"].get("scientificNameShort")
        if short:
            return short
    return fallback


def build_records() -> list[dict]:
    links = load_links()
    records = []
    for link in links:
        name = link["nifsName"]
        canonical = canonical_sci_name(link["mbrisInternalId"], link["mbrisScientificName"])

        if name in DECISIONS:
            d = DECISIONS[name]
            records.append(build_crosswalk_record(
                nifs_source_id=link["nifsSourceId"], korean_name=name,
                nifs_sci_raw=link["nifsScientificName"], mbris_internal_id=link["mbrisInternalId"],
                mbris_sci_canonical=canonical, relationship_type=d["relationshipType"],
                same_species=d["sameSpecies"], confidence=d["confidence"],
                evidence=d["evidence"], review_status=d["reviewStatus"]))
        else:
            # 이번 작업 대상이 아닌 19건 — 기존 link가 이미 국명·학명 모두 일치로
            # 확인해 둔 것이므로 그 판단을 그대로 옮긴다(새로 조사하지 않음).
            records.append(build_crosswalk_record(
                nifs_source_id=link["nifsSourceId"], korean_name=name,
                nifs_sci_raw=link["nifsScientificName"], mbris_internal_id=link["mbrisInternalId"],
                mbris_sci_canonical=canonical, relationship_type="accepted_name_update",
                same_species=True, confidence=link.get("confidence", "medium"),
                evidence=[{"source": "nifs-mbris-link.json", "title": "기존 자동 매칭 결과",
                          "url": "", "note": link.get("note") or ""}],
                review_status="approved"))
    return records


def write_csv(path: Path, records: list[dict]) -> None:
    header = ["nifsSourceId", "koreanName", "nifsScientificNameRaw", "mbrisInternalId",
              "mbrisScientificNameCanonical", "relationshipType", "sameSpecies", "confidence",
              "evidenceCount", "evidenceSummary", "reviewStatus"]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in records:
            ev_summary = " | ".join(f"{e['source']}: {e.get('note') or e.get('title') or ''}"
                                    for e in r["evidence"])
            w.writerow([r["nifsSourceId"], r["koreanName"], r["nifsScientificNameRaw"],
                        r["mbrisInternalId"], r["mbrisScientificNameCanonical"],
                        r["relationshipType"], r["sameSpecies"], r["confidence"],
                        len(r["evidence"]), ev_summary, r["reviewStatus"]])


def main() -> None:
    records = build_records()
    assert len(records) == 25, f"25건이어야 하는데 {len(records)}건"

    print(f"[1] Crosswalk {len(records)}건 생성")
    for r in records:
        marker = "🔍" if r["koreanName"] in TARGET_KOREAN_NAMES else "  "
        print(f"    {marker} {r['koreanName']:6s} {r['relationshipType']:22s} "
              f"sameSpecies={r['sameSpecies']} reviewStatus={r['reviewStatus']}")

    (MAPPINGS / "nifs-mbris-taxonomy-crosswalk.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "nifs-mbris-taxonomy-crosswalk.csv", records)

    print(f"\n✅ 저장: {MAPPINGS / 'nifs-mbris-taxonomy-crosswalk.json'}")
    print(f"✅ 저장: {MAPPINGS / 'nifs-mbris-taxonomy-crosswalk.csv'}")


if __name__ == "__main__":
    main()
