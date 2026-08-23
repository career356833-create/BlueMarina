"""Aggregate Alias Registry 핵심 로직 — 순수 함수만 담는다(파일 I/O 없음).

Aggregate Alias는 "불가사리/성게/해삼"처럼 단일 MBRIS 종으로 확정할 수 없는
이름을 위한 레이어다. 후보 풀은 이름 유사도(substring)가 아니라 **분류학적
범위(taxonomicScope, class 단위)**로 정한다 — 예를 들어 "거미불가사리류"
(Ophiuroidea)는 국명에 "불가사리"가 들어가지만 "불가사리"(Asteroidea) 범위에
포함시키지 않는다. 서로 다른 강(class)이기 때문이다.
"""
from __future__ import annotations

VALID_STATUS = {"candidate", "approved", "manual_review"}

# 초기 대상 3건. 향후 거미불가사리(Ophiuroidea)·바다나리(Crinoidea) 등을 별도
# aggregate로 추가할 수 있으나 이번 작업 범위는 이 3건뿐이다.
AGGREGATE_TARGETS = [
    {"sourceName": "불가사리", "organismGroup": "echinoderm", "taxonomicScope": "Asteroidea"},
    {"sourceName": "성게", "organismGroup": "echinoderm", "taxonomicScope": "Echinoidea"},
    {"sourceName": "해삼", "organismGroup": "echinoderm", "taxonomicScope": "Holothuroidea"},
]


def build_candidate_pool(echinoderm_candidates: list[dict], taxonomic_scope: str) -> list[dict]:
    """§2: class(taxonomicScope)가 정확히 일치하는 종만 후보 풀에 넣는다.
    이름에 sourceName이 들어있는지는 보지 않는다 — 그건 이름 유사도일 뿐 분류학적
    근거가 아니다."""
    return [
        {"internalId": r["internalId"], "koreanName": r["koreanName"],
         "scientificName": r["scientificNameCanonical"], "class": r["taxonomy"]["class"]}
        for r in echinoderm_candidates if r["taxonomy"]["class"] == taxonomic_scope
    ]


def build_registry_record(*, aggregate_id: str, source_name: str, organism_group: str,
                          taxonomic_scope: str, candidate_species: list[dict],
                          evidence: list[dict], now: str) -> dict:
    return {
        "aggregateId": aggregate_id,
        "sourceName": source_name,
        "organismGroup": organism_group,
        "taxonomicScope": taxonomic_scope,
        "status": "manual_review",  # 이미 batch3/alias-recheck에서 검토 필요로 확인된 상태 — 새 미검토 후보가 아니다
        "candidateSpecies": candidate_species,
        "representativeSpecies": None,  # 자동 확정 금지 — 항상 null로 생성한다
        "evidence": evidence,
        "createdAt": now,
        "updatedAt": now,
    }
