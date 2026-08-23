"""NIFS↔MBRIS 학명 Crosswalk 핵심 로직 — 순수 함수만 담는다(파일 I/O 없음).

이 crosswalk는 NIFS 원본과 MBRIS 원본을 수정하지 않고, "이 두 학명이 같은 종을
가리키는가"에 대한 사람의 판정(공식 근거 포함)을 별도 레이어에 기록한다.
"""
from __future__ import annotations

RELATIONSHIP_TYPES = {
    "accepted_name_update",     # 학명 자체가 개정됨(구 학명 폐기, 신 학명이 accepted)
    "valid_synonym",            # 두 학명 모두 유효하게 통용되나 한쪽이 synonym으로 등재
    "spelling_variant",         # 철자만 다름(같은 학명의 오탈자/표기 변형)
    "gender_ending_variant",    # 라틴어 성 어미만 다름(문법적 일치, 같은 학명)
    "taxonomic_revision",       # 속 재분류 등 더 큰 분류학적 개정
    "unresolved_conflict",      # 동일종 여부를 확정할 공식 근거가 부족하거나 상충함
    "manual_review_required",   # 추가 검토 필요(자동/반자동 확정 보류)
}

REVIEW_STATUS = {"approved", "manual_review", "unresolved"}

# sameSpecies=True를 허용하는 관계 유형만 모아둔다 — unresolved_conflict/
# manual_review_required인데 sameSpecies=True로 잘못 표시되는 걸 막는 가드.
SAME_SPECIES_ALLOWED_TYPES = {
    "accepted_name_update", "valid_synonym", "spelling_variant",
    "gender_ending_variant", "taxonomic_revision",
}


def build_crosswalk_record(*, nifs_source_id: str, korean_name: str, nifs_sci_raw: str,
                           mbris_internal_id: str, mbris_sci_canonical: str,
                           relationship_type: str, same_species: bool, confidence: str,
                           evidence: list[dict], review_status: str) -> dict:
    if relationship_type not in RELATIONSHIP_TYPES:
        raise ValueError(f"알 수 없는 relationshipType: {relationship_type}")
    if review_status not in REVIEW_STATUS:
        raise ValueError(f"알 수 없는 reviewStatus: {review_status}")
    if same_species and relationship_type not in SAME_SPECIES_ALLOWED_TYPES:
        raise ValueError(
            f"{relationship_type}인데 sameSpecies=True일 수 없다 "
            f"(unresolved/manual_review는 sameSpecies를 확정하면 안 된다)")
    if confidence not in ("high", "medium", "low"):
        raise ValueError(f"알 수 없는 confidence: {confidence}")

    return {
        "nifsSourceId": nifs_source_id,
        "koreanName": korean_name,
        "nifsScientificNameRaw": nifs_sci_raw,
        "mbrisInternalId": mbris_internal_id,
        "mbrisScientificNameCanonical": mbris_sci_canonical,
        "relationshipType": relationship_type,
        "sameSpecies": same_species,
        "confidence": confidence,
        "evidence": evidence,
        "reviewStatus": review_status,
    }
