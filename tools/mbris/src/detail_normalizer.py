"""MBRIS 상세 API 응답(item dict) → SpeciesDetail 정규화.

이력:
  v1 — 작업 지시서가 예상한 필드(mfDistribution, mfHabitat, spcId 등 "mf" 접두
       필드)를 기준으로 growth/spawning/prey/poison/migration/lifetime을
       스키마에 넣었으나, 이런 필드는 이 API에 존재하지 않는다(data.go.kr
       Swagger 명세로 확인).
  v2 — Swagger 문서 기준으로 실제 필드에 맞춰 스키마를 정리했으나, 인증된
       실응답은 아직 확보하지 못한 상태였다(NADI/INDI 방향 미확인 등).
  v3(현재) — Tier A 5종(갈치/고등어/참돔/주꾸미/꽃게) 실제 API 응답으로 검증.
       실응답에서 새로 확인된 사실:
       - NADI=국내 분포, INDI=해외 분포 확정(예: 갈치 NADI="우리나라의 서해...",
         INDI="북서태평양의 일본 남부...").
       - PhylumDivision/PhylumDivisionKR(문/門) 필드가 실제로 존재 — v2까지
         빠져 있었다.
       - SpcScitfNmShort(권위자 제외 canonical 학명), Kingdom/KingdomKR,
         CorrNmTyp(명명 상태)/CorrSpcScitfNm(정정 학명), ECOL(생태 — FORM과
         별개 필드) 등이 실제로 존재하나 v2 FIELD_MAP에 없었다.
       - HABI(서식지)는 5종 전부 빈 값 — 필드는 존재하나 이 API가 이 필드를
         채우지 않는 경우가 있다는 뜻이다(추측 채움 금지 원칙상 null 유지).
       - ClassKR은 어류 3종에서 전부 빈 값(연체동물·갑각류 2종은 정상 채워짐)
         — MBRIS 원본 데이터 자체의 공백이지 파서 문제가 아니다.
       상세: docs/data/mbris-api-field-map.md
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

# 확정 매핑 — 실제 응답으로 대응이 검증된 필드만.
FIELD_MAP = {
    "basic.koreanName": "CommKorNm",
    "basic.scientificName": "SpcScitfNm",              # 권위자 인용 포함 원문
    "basic.scientificNameShort": "SpcScitfNmShort",     # canonical(권위자 제외) — taxonomy-master.json과 비교용
    "taxonomy.kingdom": "KingdomKR",
    "taxonomy.phylum": "PhylumDivisionKR",
    "taxonomy.class": "ClassKR",                        # 어류 일부 종에서 실제로 빈 값(원본 데이터 공백)
    "taxonomy.order": "OrderKR",
    "taxonomy.family": "FamilyKR",
    "ecology.habitat": "HABI",                          # 5종 샘플 전부 빈 값 — 실제로 거의 채워지지 않는 필드
    "ecology.form": "FORM",
    "ecology.ecologyNotes": "ECOL",                     # FORM(형태)과 별개인 생태 서술(서식 수심·회유 시기 등)
    "ecology.domesticDistribution": "NADI",             # 실응답으로 방향 확정(국내)
    "ecology.internationalDistribution": "INDI",        # 실응답으로 방향 확정(해외)
}

# taxonomy.genus: 이 API 응답에 Genus 필드가 없다(5종 실응답 전부 미관찰).
# taxonomy-master.json에서 별도로 보강해야 한다 — 이 함수는 API 응답만으로
# 채우므로 항상 None이다.

# 명명 상태 — CorrNmTyp("정명" 등)과 CorrSpcScitfNm(정정된 학명)은 taxonomy나
# ecology가 아니라 "이 이름이 유효한 학명인지"를 나타내는 별도 개념이라 독립
# 섹션으로 둔다. 5종 샘플은 전부 CorrNmTyp="정명"이라 이명(synonym) 케이스는
# 아직 관찰하지 못했다 — 엔`enum` 전체를 안다고 단정하지 않는다.
TAXONOMIC_STATUS_FIELD_MAP = {
    "nameType": "CorrNmTyp",
    "correctedScientificName": "CorrSpcScitfNm",
}

# 스키마에 없지만 실제 존재하는 필드. 버리면 데이터 손실이므로 extra에 원문 보존한다.
EXTRA_FIELD_MAP = {
    "overview": "ABST",
    "utilization": "UTLZ",
    "aquacultureInfo": "CULTIVINF",
    "biochemicalInfo": "BIOCHEMICAL",
    "activityInfo": "ACTIVINFO",
}

# SpcTyp: 5종 샘플 전부 "기타"로 동일 — 이 필드가 실제로 무엇을 구분하는
# enum인지(어류/패류/기타 등) 이 샘플만으로는 알 수 없다. 의미를 추측해서
# 정규화 스키마에 넣지 않는다 — rawApiFields에는 그대로 보존된다.
UNMAPPED_UNCLEAR_MEANING_FIELDS = {"SpcTyp"}

# 최초 버전에 있었으나 이 API에 대응 필드가 없어 제거된 스키마 필드.
# (참고용 기록 — 이제 정규화 결과에는 나타나지 않는다. 5종 실응답으로도
# 여전히 관찰되지 않아 재확인됨)
REMOVED_NO_MATCH_FIELDS = {"growth", "spawning", "prey", "poison", "migration", "lifetime"}


def normalize_detail(*, internal_id: str, source_id: str | None, item: dict,
                     raw_body: bytes, api_endpoint: str = "",
                     collected_at: str | None = None) -> dict:
    """item: xml_parser가 뽑은 <item> 자식 요소 dict(필드명 그대로, 원문 미가공)."""
    def get(field: str) -> str | None:
        return item.get(field)

    ecology_extra = {k: get(src) for k, src in EXTRA_FIELD_MAP.items() if get(src) is not None}

    return {
        "internalId": internal_id,
        "sourceProvider": "MBRIS",
        "sourceId": source_id or get("SpcTxnId"),
        "basic": {
            "koreanName": get("CommKorNm"),
            "scientificName": get("SpcScitfNm"),
            "scientificNameShort": get("SpcScitfNmShort"),
        },
        "taxonomy": {
            "kingdom": get("KingdomKR"),
            "phylum": get("PhylumDivisionKR"),
            "class": get("ClassKR"),
            "order": get("OrderKR"),
            "family": get("FamilyKR"),
            "genus": None,  # API 응답에 없음 — taxonomy-master.json에서 별도 보강 필요
        },
        "ecology": {
            "habitat": get("HABI"),
            "form": get("FORM"),
            "ecologyNotes": get("ECOL"),
            "domesticDistribution": get("NADI"),
            "internationalDistribution": get("INDI"),
            "extra": ecology_extra,  # 스키마엔 없지만 실제 존재하는 필드(개요/활용 등)
        },
        "taxonomicStatus": {
            "nameType": get("CorrNmTyp"),
            "correctedScientificName": get("CorrSpcScitfNm"),
        },
        "rawApiFields": dict(item),  # 실제 응답 전체를 무손실 보존(SpcTyp 등 미해석 필드 포함)
        "source": {
            "apiEndpoint": api_endpoint,
            "collectedAt": collected_at or datetime.now(timezone.utc).isoformat(),
            "responseHash": hashlib.sha256(raw_body or b"").hexdigest(),
        },
        "reviewStatus": "pending",
    }
