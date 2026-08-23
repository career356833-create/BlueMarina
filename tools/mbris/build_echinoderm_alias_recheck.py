#!/usr/bin/env python3
"""§5: 불가사리/성게/해삼의 Alias 상태와 새로 열린 echinoderm 후보 풀을 대조해
재검토 필요 여부만 정리한다. 자동 승인 없음 — 기존 Alias 판정(Registry의
status/decision)은 이 스크립트로 절대 바뀌지 않는다."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

TARGETS = ["불가사리", "성게", "해삼"]


def main() -> None:
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    by_name = {r["sourceName"]: r for r in registry}

    batch3 = json.loads((MAPPINGS / "fish-alias-review-batch3.json").read_text(encoding="utf-8"))
    batch3_by_name = {r["sourceName"]: r for r in batch3}

    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    echinoderm = [r for r in nonfish if r["organismGroup"] == "echinoderm"]

    items = []
    for name in TARGETS:
        reg = by_name[name]
        b3 = batch3_by_name.get(name)
        substring_matches = [r for r in echinoderm if r["koreanName"] and name in r["koreanName"]]
        exact_matches = [r for r in echinoderm if r["koreanName"] == name]

        # 여러 서로 다른 속(genus)에 걸쳐 있으면 단일종으로 좁힐 근거가 없다는 뜻이다.
        genera = {r["taxonomy"].get("genus") for r in substring_matches if r["taxonomy"].get("genus")}

        if exact_matches:
            recommendation = "단일 종 확정 검토 가능(정확히 일치하는 표준명 존재)"
        elif len(genera) > 1:
            recommendation = "aggregate_name 검토 필요 (여러 속에 걸친 접두어+공통어 패턴)"
        else:
            recommendation = "추가 근거 확보 후 재검토"

        items.append({
            "koreanName": name,
            "gapId": next((g["gapId"] for g in
                          json.loads((MAPPINGS / "taxonomy-gap-registry.json").read_text(encoding="utf-8"))
                          if g["koreanName"] == name), None),
            "existingAliasStatus": reg["status"],
            "existingAliasDecisionBatch3": b3["decision"] if b3 else None,
            "existingAliasInternalId": reg["internalId"],
            "newCandidateExists": len(substring_matches) > 0,
            "newCandidateCount": len(substring_matches),
            "exactNameMatchCount": len(exact_matches),
            "genusSpread": sorted(g for g in genera if g),
            "reviewNeeded": True,
            "recommendation": recommendation,
        })

    result = {
        "generatedAt": NOW,
        "autoApproved": False,
        "note": ("이 리포트는 확인용이며 Alias Registry를 수정하지 않는다. 세 이름 모두 "
                "echinoderm 후보 풀에서 여러 속에 걸친 접두어+공통어 패턴이 재확인되어 "
                "aggregate_name 판정이 유력하지만, 실제 Registry 반영은 별도 승인 라운드의 "
                "몫이다(자동 승인 금지, 단일 종 연결 금지)."),
        "items": items,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "echinoderm-alias-recheck.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print("[1] Alias 재검토 대상 3건")
    for it in items:
        print(f"    {it['koreanName']}: status={it['existingAliasStatus']} "
              f"신규후보={it['newCandidateCount']}건 -> {it['recommendation']}")
    print(f"\n✅ 저장: {REPORTS / 'echinoderm-alias-recheck.json'}")


if __name__ == "__main__":
    main()
