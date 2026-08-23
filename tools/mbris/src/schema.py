"""MBRIS 목록집 컬럼 모델.

헤더가 2행 병합 구조다. 1행이 그룹명(Phylum/Class/.../보유기관),
2행이 하위 항목(Name/국명/명명법)이며 실제 데이터는 3행부터 시작한다.
아래 인덱스는 실제 파일에서 확인한 값이다. 추정 컬럼을 만들지 않았다.
"""
from __future__ import annotations

HEADER_ROW_1 = 1
HEADER_ROW_2 = 2
DATA_START_ROW = 3

# 0-based 열 인덱스 → (원문 컬럼 경로, 정규화 키)
COLUMNS: dict[int, tuple[str, str]] = {
    0:  ("No", "rowNo"),
    1:  ("계", "kingdomGroup"),
    2:  ("세부분류군명", "detailGroup"),
    3:  ("학명", "scientificNameRaw"),
    4:  ("국명", "koreanName"),
    5:  ("Phylum/Name", "phylum"),
    6:  ("Phylum/국명", "phylumKo"),
    7:  ("Class/Name", "className"),
    8:  ("Class/국명", "classKo"),
    9:  ("Order/Name", "order"),
    10: ("Order/국명", "orderKo"),
    11: ("Family/Name", "family"),
    12: ("Family/국명", "familyKo"),
    13: ("Genus/Name", "genus"),
    14: ("Genus/국명", "genusKo"),
    15: ("Species/Name", "species"),
    16: ("Species/명명법", "speciesAuthority"),
    17: ("Species/국명", "speciesKo"),
    18: ("Subspecies/Name", "subspecies"),
    19: ("Subspecies/명명법", "subspeciesAuthority"),
    20: ("Subspecies/국명", "subspeciesKo"),
    21: ("보유기관/자원관", "holdingMabik"),
    22: ("보유기관/기탁등록보존기관", "holdingDepository"),
    23: ("보유기관/수산과학원", "holdingNifs"),
}

SHEETS = ["척추동물", "무척추동물", "식물", "원생생물", "미생물", "육상담수종"]

# 퍼플렉시티가 제시했던 컬럼명 → 실제 파일 존재 여부 검증용
CLAIMED_COLUMNS = {
    "계명": "계 (이름이 '계명'이 아니라 '계')",
    "문명": "Phylum/국명 (별도 '문명' 컬럼은 없음)",
    "강명": "Class/국명 (별도 '강명' 컬럼은 없음)",
    "목명": "Order/국명",
    "과명": "Family/국명",
    "속명": "Genus/국명",
    "종명": "Species/국명",
    "국명": "국명 ✅ 존재",
    "학명": "학명 ✅ 존재",
    "보유기관": "보유기관 ✅ 존재 (자원관/기탁등록보존기관/수산과학원 3열로 분리)",
    "분류군": "세부분류군명",
    "종 또는 자원 고유코드": "없음 — 고유 ID 컬럼이 존재하지 않는다",
}

HOLDING_PRESENT = "보유"


def clean(v) -> str | None:
    """셀 값 정제. 공백만 있는 셀은 값 없음으로 본다."""
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def row_to_record(row: tuple, sheet: str, row_index: int) -> dict:
    rec = {"sourceSheet": sheet, "sourceRow": row_index}
    for idx, (_path, key) in COLUMNS.items():
        rec[key] = clean(row[idx]) if idx < len(row) else None
    return rec


def holding_institutions(rec: dict) -> list[str]:
    out = []
    for key, label in (("holdingMabik", "국립해양생물자원관"),
                       ("holdingDepository", "기탁등록보존기관"),
                       ("holdingNifs", "국립수산과학원")):
        if rec.get(key) == HOLDING_PRESENT:
            out.append(label)
    return out
