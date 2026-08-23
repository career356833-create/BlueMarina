"""학명 파싱. scientificNameRaw는 절대 수정하지 않고, canonical/authority/불확실성만 분리한다.

실측 패턴(16,587건 전수 스캔 기준 — 토큰 수 분포 {2: 16167, 3: 287, 4: 121, 5: 6, 6: 5, 9: 1}):
  - 대부분(16,167건, 2어절): "Genus species" — 권위자는 별도 컬럼에 있어 원문에 없다
  - 랭크 마커 실측: var.(61) subsp.(59) f.(9, forma) cf.(1). aff./sp./spp.는 0건이지만
    분류학 관례상 나올 수 있어 마커 목록에 유지한다.
  - 마커 없는 3어절(동물, 예: "Larus fuscus heuglini"): 동물명명규약 관례상 아종이지만
    MBRIS가 마커를 붙이지 않았다. 학명이 유효한지는 판단하지 않는다.
  - 아속: "Genus (Subgenus) species [species...]" — 아속 제거 후 나머지를 재귀 판단
  - species complex: "... complex" 접미사 (연체동물 1건 확인)
  - 속명만 있고 두 번째 토큰이 대문자인 5건: 4건은 "속명 반복"(아속명 생략 표기로 추정,
    의미를 임의로 단정하지 않음) + 1건은 권위자가 원문에 직접 포함된 세균
    ("Photobacterium Lucena et al., 2011"). 쉼표+4자리 연도가 있으면만 권위자로 분리하고,
    그렇지 않으면 원문을 그대로 canonical로 두고 수동 검토로 표시한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

RANK_MARKERS = ("subsp", "var", "f", "cf", "aff", "sp", "spp")
_INFRASUBSP_MARKERS = {"subsp", "var", "f"}
_UNCONFIRMED_MARKERS = {"cf", "aff"}
_UNIDENTIFIED_MARKERS = {"sp", "spp"}

_SUBGENUS_RE = re.compile(r"^(\S+)\s+\(([A-Za-z][a-z]+)\)\s+(.*)$")
_COMPLEX_RE = re.compile(r"\s+complex\s*$", re.I)
_YEAR_RE = re.compile(r",\s*\d{4}")

UNCERTAIN_UNIDENTIFIED = "unidentified_species"     # sp. / spp.
UNCERTAIN_UNCONFIRMED = "unconfirmed_similar"        # cf. / aff.
UNCERTAIN_INFRASUBSP = "infrasubspecific_rank"       # subsp. / var. / f. (마커 명시)
UNCERTAIN_UNMARKED_TRINOMIAL = "unmarked_trinomial"  # 마커 없는 3어절
UNCERTAIN_IRREGULAR = "irregular_format"             # 토큰 구조를 해석할 수 없음


@dataclass
class ParsedScientificName:
    raw: str
    canonical: str
    authority: str | None = None
    subgenus: str | None = None
    infraEpithet: str | None = None
    rankMarker: str | None = None
    isSpeciesComplex: bool = False
    isUncertain: bool = False
    uncertaintyType: str | None = None
    authoritySource: str | None = None  # "external_column" | "embedded_in_raw" | None


def _strip_marker_dot(token: str) -> str:
    return token.lower().rstrip(".")


def parse_scientific_name(raw: str | None, external_authority: str | None = None) -> ParsedScientificName | None:
    if not raw:
        return None
    s = raw.strip()

    is_complex = bool(_COMPLEX_RE.search(s))
    if is_complex:
        s = _COMPLEX_RE.sub("", s).strip()

    subgenus = None
    m = _SUBGENUS_RE.match(s)
    if m:
        subgenus = m.group(2)
        s = f"{m.group(1)} {m.group(3)}".strip()

    tokens = s.split()
    genus = tokens[0] if tokens else s
    rest = tokens[1:]

    canonical, rank_marker, infra, uncertain, utype, embedded_authority = (
        genus, None, None, False, None, None)

    marker_idx = next((i for i, t in enumerate(rest) if _strip_marker_dot(t) in RANK_MARKERS), None)

    if marker_idx is not None:
        marker = _strip_marker_dot(rest[marker_idx])
        rank_marker = f"{marker}."
        epithet_after = rest[marker_idx + 1] if marker_idx + 1 < len(rest) else None
        species_before = rest[:marker_idx]  # 마커 앞부분 = 종소명(보통 1개)

        if marker in _UNCONFIRMED_MARKERS:
            # cf./aff.는 마커 뒤 종소명이 잠정 동정이다. 그 이름을 canonical로 삼는다.
            canonical = " ".join([genus] + ([epithet_after] if epithet_after else []))
            uncertain, utype = True, UNCERTAIN_UNCONFIRMED
        elif marker in _UNIDENTIFIED_MARKERS:
            canonical = f"{genus} {marker}."  # 미동정 자체가 이름의 전부
            uncertain, utype = True, UNCERTAIN_UNIDENTIFIED
        else:  # subsp. / var. / f.
            canonical = " ".join([genus] + species_before) if species_before else genus
            infra = epithet_after
            uncertain, utype = True, UNCERTAIN_INFRASUBSP
    elif not rest:
        canonical = genus  # 속명만 존재
    elif rest[0][0].islower():
        if len(rest) == 1:
            canonical = f"{genus} {rest[0]}"
        elif len(rest) == 2 and rest[1][0].islower():
            canonical = f"{genus} {rest[0]} {rest[1]}"
            infra, uncertain, utype = rest[1], True, UNCERTAIN_UNMARKED_TRINOMIAL
        else:
            # 예상 밖 토큰 구조 — 임의로 자르지 않고 원문 전체를 canonical로 유지, 검토 표시
            canonical, uncertain, utype = s, True, UNCERTAIN_IRREGULAR
    else:
        # 두 번째 토큰이 대문자 — 권위자가 원문에 직접 붙었거나(쉼표+연도 존재),
        # 그 외에는 해석 불가능한 형식이므로 추측하지 않는다.
        tail = " ".join(rest)
        if _YEAR_RE.search(tail):
            embedded_authority = tail
            canonical = genus
        else:
            canonical, uncertain, utype = s, True, UNCERTAIN_IRREGULAR

    if external_authority:
        authority, authority_source = external_authority.strip(), "external_column"
    elif embedded_authority:
        authority, authority_source = embedded_authority, "embedded_in_raw"
    else:
        authority, authority_source = None, None

    return ParsedScientificName(
        raw=raw, canonical=re.sub(r"\s+", " ", canonical).strip(),
        authority=authority, subgenus=subgenus, infraEpithet=infra,
        rankMarker=rank_marker, isSpeciesComplex=is_complex,
        isUncertain=uncertain, uncertaintyType=utype, authoritySource=authority_source,
    )


def to_dict(p: ParsedScientificName | None) -> dict:
    if p is None:
        return {
            "scientificNameRaw": None, "scientificNameCanonical": None,
            "authority": None, "subgenus": None, "infraEpithet": None,
            "rankMarker": None, "isSpeciesComplex": False,
            "isUncertain": False, "uncertaintyType": None, "authoritySource": None,
        }
    return {
        "scientificNameRaw": p.raw,
        "scientificNameCanonical": p.canonical,
        "authority": p.authority,
        "subgenus": p.subgenus,
        "infraEpithet": p.infraEpithet,
        "rankMarker": p.rankMarker,
        "isSpeciesComplex": p.isSpeciesComplex,
        "isUncertain": p.isUncertain,
        "uncertaintyType": p.uncertaintyType,
        "authoritySource": p.authoritySource,
    }
