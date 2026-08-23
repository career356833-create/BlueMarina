#!/usr/bin/env python3
"""§4: Taxonomy Gap Registry(불가사리/성게/해삼)가 이제 echinoderm 후보 풀과
연결 가능한지만 확인한다. taxonomy-gap-registry.json의 status는 이 단계에서
바꾸지 않는다 — 순수 확인 리포트만 생성한다."""
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()


def main() -> None:
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    echinoderm = [r for r in nonfish if r["organismGroup"] == "echinoderm"]

    gap_registry = json.loads((MAPPINGS / "taxonomy-gap-registry.json").read_text(encoding="utf-8"))

    class_dist = dict(Counter(r["taxonomy"]["class"] for r in echinoderm))

    by_gap_target = []
    for g in gap_registry:
        name = g["koreanName"]
        substring_matches = [r for r in echinoderm if r["koreanName"] and name in r["koreanName"]]
        exact_matches = [r for r in echinoderm if r["koreanName"] == name]
        by_gap_target.append({
            "gapId": g["gapId"],
            "koreanName": name,
            "exactMatchCount": len(exact_matches),
            "substringMatchCount": len(substring_matches),
            "sampleSubstringMatches": [
                {"koreanName": r["koreanName"], "scientificName": r["scientificNameCanonical"],
                 "internalId": r["internalId"], "class": r["taxonomy"]["class"]}
                for r in substring_matches[:5]
            ],
        })

    examples = [
        {"koreanName": r["koreanName"], "scientificName": r["scientificNameCanonical"],
         "internalId": r["internalId"]}
        for r in echinoderm[:10]
    ]

    result = {
        "generatedAt": NOW,
        "gapGroup": "Echinodermata",
        "resolved": len(echinoderm) > 0,
        "candidateCount": len(echinoderm),
        "classDistribution": class_dist,
        "examples": examples,
        "byGapTarget": by_gap_target,
        "note": ("resolved=true는 '분류 공백 자체가 후보 풀 확장으로 채워졌다'는 뜻일 뿐, "
                "불가사리/성게/해삼 각각을 특정 단일 종으로 확정했다는 뜻이 아니다. "
                "exactMatchCount가 전부 0인 것에서 보듯 이 3개 이름은 MBRIS에 단독 표제어로 "
                "존재하지 않고 접두어가 붙은 개별 종명(예: 아무르불가사리, 돌기해삼, 보라성게)"
                "으로만 존재한다 — Alias 판정(§5)은 이 사실을 반영해야 한다."),
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "echinoderm-gap-resolution.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[1] echinoderm 후보 {len(echinoderm)}건, class 분포: {class_dist}")
    for t in by_gap_target:
        print(f"    {t['koreanName']}: exact={t['exactMatchCount']} substring={t['substringMatchCount']}")
    print(f"\n✅ 저장: {REPORTS / 'echinoderm-gap-resolution.json'}")


if __name__ == "__main__":
    main()
