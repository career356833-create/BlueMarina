#!/usr/bin/env python3
"""TaxonomyMaster → Blue Marina Fish/Non-Fish Candidate 파일 생성.

Taxonomy Master(taxonomy-master.json)는 읽기만 한다 — 그 파일의 organismGroup
필드는 극피동물(Echinodermata)을 "other"로 남겨두고 있으며, 이 스크립트는 그걸
고치지 않는다. 대신 이 파생 레이어(Candidate)에서만 taxonomy.phylum을 보고
organismGroup="echinoderm"으로 재분류해 후보에 포함시킨다.
"""
import csv, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
NOW = datetime.now(timezone.utc).isoformat()

NONFISH_GROUPS = ("cephalopod", "crustacean", "gastropod", "bivalve")
ECHINODERM_GROUP = "echinoderm"
ECHINODERM_PHYLUM = "Echinodermata"


def effective_group(m: dict) -> str:
    """Taxonomy Master의 organismGroup을 그대로 쓰되, phylum이 Echinodermata인
    레코드만 candidate 레이어에서 echinoderm으로 재분류한다(원본 필드는 불변)."""
    if m["taxonomy"].get("phylum") == ECHINODERM_PHYLUM:
        return ECHINODERM_GROUP
    return m["organismGroup"]


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main() -> None:
    master = json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))

    fish = [{**m, "candidateType": "fish", "reviewStatus": "unreviewed"}
            for m in master if m["organismGroup"] == "fish"]

    nonfish = []
    for m in master:
        eg = effective_group(m)
        if eg in NONFISH_GROUPS:
            # 기존 4개 그룹은 이전과 완전히 동일한 필드값을 만든다(eg == m["organismGroup"]).
            nonfish.append({**m, "candidateType": eg, "fishingTargetStatus": "unreviewed"})
        elif eg == ECHINODERM_GROUP:
            # organismGroup은 Taxonomy Master에서 물려받지 않고 candidate 레이어에서
            # "echinoderm"으로 덮어쓴다 — 낚시 대상 확정이 아니라 분류 재배치일 뿐이므로
            # fishingTargetStatus는 다른 nonfish 그룹과 동일하게 unreviewed로 둔다.
            nonfish.append({**m, "organismGroup": ECHINODERM_GROUP,
                            "candidateType": ECHINODERM_GROUP, "fishingTargetStatus": "unreviewed"})

    (NORM / "blue-marina-fish-candidates.json").write_text(
        json.dumps(fish, ensure_ascii=False, indent=2), encoding="utf-8")
    (NORM / "blue-marina-nonfish-candidates.json").write_text(
        json.dumps(nonfish, ensure_ascii=False, indent=2), encoding="utf-8")

    write_csv(NORM / "blue-marina-fish-candidates.csv",
              ["internalId", "sourceSheet", "koreanName", "scientificNameCanonical",
               "class", "order", "family", "candidateType", "reviewStatus"],
              [[f["internalId"], f["sourceSheet"], f["koreanName"] or "",
                f["scientificNameCanonical"] or "", f["taxonomy"]["class"] or "",
                f["taxonomy"]["order"] or "", f["taxonomy"]["family"] or "",
                f["candidateType"], f["reviewStatus"]] for f in fish])
    write_csv(NORM / "blue-marina-nonfish-candidates.csv",
              ["internalId", "sourceSheet", "koreanName", "scientificNameCanonical",
               "class", "order", "family", "candidateType", "fishingTargetStatus"],
              [[n["internalId"], n["sourceSheet"], n["koreanName"] or "",
                n["scientificNameCanonical"] or "", n["taxonomy"]["class"] or "",
                n["taxonomy"]["order"] or "", n["taxonomy"]["family"] or "",
                n["candidateType"], n["fishingTargetStatus"]] for n in nonfish])

    summary = {
        "generatedAt": NOW,
        "fish": {
            "total": len(fish),
            "withKoreanName": sum(1 for f in fish if f["koreanName"]),
            "withoutKoreanName": sum(1 for f in fish if not f["koreanName"]),
            "classDistribution": dict(Counter(
                f["taxonomy"]["class"] for f in fish if f["taxonomy"]["class"])),
            "bySheet": dict(Counter(f["sourceSheet"] for f in fish)),
        },
        "nonfish": {
            "total": len(nonfish),
            "byGroup": dict(Counter(n["candidateType"] for n in nonfish)),
            "withKoreanName": sum(1 for n in nonfish if n["koreanName"]),
        },
        "allUnreviewed": all(
            f["reviewStatus"] == "unreviewed" for f in fish) and all(
            n["fishingTargetStatus"] == "unreviewed" for n in nonfish),
    }
    (NORM / "candidate-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"fish candidates: {len(fish):,}  ({NORM / 'blue-marina-fish-candidates.json'})")
    print(f"nonfish candidates: {len(nonfish):,}  ({NORM / 'blue-marina-nonfish-candidates.json'})")
    print(f"nonfish by group: {summary['nonfish']['byGroup']}")


if __name__ == "__main__":
    main()
