"""§3: 대표종 후보 점수 계산 — 순수 함수, 확정(승인)은 하지 않는다.

점수만 만들고 끝난다. 어떤 코드도 이 점수를 근거로 representativeSpecies를
자동으로 채우지 않는다(그 필드는 aggregate_alias.py에서 항상 None으로 생성됨).

데이터가 없어서 항상 0으로만 평가되는 두 항목이 있다 — 추측으로 채우지 않고
그 사실 자체를 명시해 둔다:
  - "국내 분포 정보 존재"(+10): MBRIS 상세 API(ecology.domesticDistribution/NADI)
    응답이 있어야 판단 가능한데, 이번 234종 중 상세 수집을 거친 종이 0건이다
    (제한사항: MBRIS API 호출 금지). 따라서 이 항목은 이번 실행에서 전부 미충족.
  - "상업·대중성 근거 데이터 존재"(+10): 이 파이프라인에 그런 데이터 소스 자체가
    없다(검색량·유명세 추정 금지 원칙, service_priority.py와 동일한 입장). 전부 미충족.
"""
from __future__ import annotations

WEIGHTS = {
    "MBRIS_KOREAN_NAME_EXISTS": (10, "MBRIS 국명 존재"),
    "DOMESTIC_DISTRIBUTION_DATA_EXISTS": (10, "국내 분포 정보 존재(상세 API 미수집으로 항상 미충족)"),
    "HOLDING_INSTITUTION_EXISTS": (5, "보유기관 존재"),
    "NIFS_LINKED": (30, "NIFS 연결"),
    "FISH_DATA_LINKED": (30, "기존 fish-data 연결"),
    "COMMERCIAL_POPULARITY_DATA_EXISTS": (10, "상업·대중성 근거 데이터 존재(데이터 소스 없어 항상 미충족)"),
    "UNIDENTIFIED_SPECIES": (-20, "미동정(sp./spp.)"),
    "SCIENTIFIC_NAME_UNCERTAIN": (-10, "학명 불확실(cf./aff./subsp. 등)"),
    "NAME_ONLY_CANDIDATE": (-10, "후보명만 존재 — 국명에 집합명(sourceName)이 포함되지 않아 "
                            "분류군 범위로만 후보 풀에 들어옴(이름 수준 근거 없음)"),
}


def score_representative_candidate(species: dict, *, source_name: str, nifs_linked: bool,
                                   fish_data_linked: bool, has_domestic_distribution_data: bool = False,
                                   has_commercial_popularity_data: bool = False) -> dict:
    """species: build_candidate_pool()이 만든 {internalId, koreanName, scientificName,
    class} 레코드에 scientificNameParsing/holdingInstitutions를 더한 원본급 레코드."""
    reasons: list[str] = []
    score = 0

    if species.get("koreanName"):
        reasons.append("MBRIS_KOREAN_NAME_EXISTS")
    if has_domestic_distribution_data:
        reasons.append("DOMESTIC_DISTRIBUTION_DATA_EXISTS")
    if species.get("holdingInstitutions"):
        reasons.append("HOLDING_INSTITUTION_EXISTS")
    if nifs_linked:
        reasons.append("NIFS_LINKED")
    if fish_data_linked:
        reasons.append("FISH_DATA_LINKED")
    if has_commercial_popularity_data:
        reasons.append("COMMERCIAL_POPULARITY_DATA_EXISTS")

    sp = species.get("scientificNameParsing") or {}
    if sp.get("uncertaintyType") == "unidentified_species":
        reasons.append("UNIDENTIFIED_SPECIES")
    elif sp.get("isUncertain"):
        reasons.append("SCIENTIFIC_NAME_UNCERTAIN")

    if source_name not in (species.get("koreanName") or ""):
        reasons.append("NAME_ONLY_CANDIDATE")

    for r in reasons:
        score += WEIGHTS[r][0]

    return {"internalId": species["internalId"], "koreanName": species.get("koreanName"),
            "scientificName": species.get("scientificName") or species.get("scientificNameCanonical"),
            "score": score, "reasons": reasons}
