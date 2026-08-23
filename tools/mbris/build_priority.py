#!/usr/bin/env python3
"""상세 API 수집 우선순위 점수화.

점수는 실제로 계산 가능한 신호만 사용한다. "대중성/식용 가능성/어획통계 존재 가능성"처럼
이 데이터만으로는 판단할 수 없는 항목은 NIFS 25종 매칭 여부(=이미 수산자원으로 관리되는
증거)로 대체해 근거를 명시한다. 없는 데이터를 지어내지 않는다.
"""
import json, sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NOW = datetime.now(timezone.utc).isoformat()

BASE_SCORE = 50

POSITIVE = {
    "NIFS_MATCH_HIGH": (40, "NIFS 25종과 학명 정확 일치 — 이미 수산자원으로 관리됨"),
    "NIFS_MATCH_MEDIUM": (25, "NIFS 25종과 국명 일치(학명 개정 가능성) — synonym 매칭"),
    "NIFS_MATCH_LOW": (10, "NIFS 25종과 속 단위 후보만 일치 — 수동 검토 대상"),
    "HAS_KOREAN_NAME": (15, "국명 존재 — 서비스 노출 가능"),
    "HOLDING_INSTITUTION_VERIFIED": (10, "보유기관에 실물 표본 존재 — 관찰기록만 있는 것이 아님"),
    "IS_FISH_GROUP": (5, "어류 — Blue Marina 1차 대상군"),
}
NEGATIVE = {
    "NO_KOREAN_NAME": (-20, "국명 없음 — 이름을 생성하지 않고 서비스 노출 보류"),
    "SCIENTIFIC_NAME_UNCERTAIN": (-15, "학명에 cf./aff./sp./미표기 아종 등 불확실 표기 존재"),
    "SPECIES_COMPLEX": (-10, "species complex — 단일 종으로 확정되지 않음"),
    "NO_HOLDING_INSTITUTION": (-5, "보유기관 없음 — 관찰기록만 존재할 가능성"),
}


def action_for(score: int) -> str:
    if score >= 70:
        return "detail_api_collect"
    if score >= 40:
        return "review_then_collect"
    return "low_priority_defer"


def main() -> None:
    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    links = json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8"))

    nifs_by_internal_id: dict[str, str] = {}
    for l in links:
        if not l["mbrisInternalId"]:
            continue
        conf = l["confidence"]
        level = {"high": "NIFS_MATCH_HIGH", "medium": "NIFS_MATCH_MEDIUM",
                 "low": "NIFS_MATCH_LOW"}[conf]
        for iid in [l["mbrisInternalId"], *l["additionalCandidateIds"]]:
            # 이미 더 높은 확신도가 배정돼 있으면 덮어쓰지 않는다
            existing = nifs_by_internal_id.get(iid)
            rank = {"NIFS_MATCH_HIGH": 3, "NIFS_MATCH_MEDIUM": 2, "NIFS_MATCH_LOW": 1}
            if not existing or rank[level] > rank[existing]:
                nifs_by_internal_id[iid] = level

    results = []
    for rec in fish + nonfish:
        reasons = []
        score = BASE_SCORE

        nifs_level = nifs_by_internal_id.get(rec["internalId"])
        if nifs_level:
            reasons.append(nifs_level)

        if rec["koreanName"]:
            reasons.append("HAS_KOREAN_NAME")
        else:
            reasons.append("NO_KOREAN_NAME")

        if rec["holdingInstitutions"]:
            reasons.append("HOLDING_INSTITUTION_VERIFIED")
        else:
            reasons.append("NO_HOLDING_INSTITUTION")

        if rec["organismGroup"] == "fish":
            reasons.append("IS_FISH_GROUP")

        sp = rec["scientificNameParsing"]
        if sp["isUncertain"]:
            reasons.append("SCIENTIFIC_NAME_UNCERTAIN")
        if sp["isSpeciesComplex"]:
            reasons.append("SPECIES_COMPLEX")

        for r in reasons:
            weight = (POSITIVE.get(r) or NEGATIVE.get(r))[0]
            score += weight
        score = max(0, min(100, score))

        results.append({
            "internalId": rec["internalId"],
            "koreanName": rec["koreanName"],
            "organismGroup": rec["organismGroup"],
            "priorityScore": score,
            "priorityReasons": reasons,
            "nextAction": action_for(score),
        })

    results.sort(key=lambda r: (-r["priorityScore"], r["internalId"]))

    (NORM / "species-priority.json").write_text(
        json.dumps({
            "generatedAt": NOW,
            "scoringModel": {
                "baseScore": BASE_SCORE,
                "positiveFactors": {k: {"weight": v[0], "reason": v[1]} for k, v in POSITIVE.items()},
                "negativeFactors": {k: {"weight": v[0], "reason": v[1]} for k, v in NEGATIVE.items()},
                "note": ("대중성·식용가능성·어획통계 존재가능성은 이 데이터만으로 직접 판단할 수 "
                         "없어 NIFS 25종 매칭 여부로 대체했다. 없는 데이터를 지어내지 않았다."),
            },
            "distribution": {
                "detail_api_collect": sum(1 for r in results if r["nextAction"] == "detail_api_collect"),
                "review_then_collect": sum(1 for r in results if r["nextAction"] == "review_then_collect"),
                "low_priority_defer": sum(1 for r in results if r["nextAction"] == "low_priority_defer"),
            },
            "items": results,
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    from collections import Counter
    dist = Counter(r["nextAction"] for r in results)
    print(f"총 {len(results):,}건 채점")
    print("nextAction 분포:", dict(dist))
    print("상위 5:", [(r["internalId"], r["koreanName"], r["priorityScore"]) for r in results[:5]])


if __name__ == "__main__":
    main()
