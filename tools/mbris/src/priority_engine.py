"""Species Priority Engine — 점수·티어·낚시대상상태·검토상태를 계산하는 순수 함수 모음.

점수 요소는 전부 실제로 확보된 데이터에서만 나온다(NIFS 연결, 분류군, 국명 유무,
학명 파싱 결과). 인기도·수요 같은 추측 지표는 쓰지 않는다.
"""
from __future__ import annotations

from dataclasses import dataclass, field

FISH_GROUP = "fish"
NONFISH_TARGET_GROUPS = {"cephalopod", "crustacean", "gastropod", "bivalve"}

WEIGHTS = {
    "NIFS_RESOURCE_DATA": (50, "NIFS 연결 — 이미 수산자원 정보 존재"),
    "FISH_CORE_TARGET": (20, "어류 — Blue Marina 핵심 대상"),
    "NONFISH_TARGET_GROUP": (10, "두족류·갑각류·복족류·이매패류 — 낚시·채취 콘텐츠 가능"),
    "HAS_KOREAN_NAME": (10, "국명 존재"),
    "NO_KOREAN_NAME": (-10, "국명 없음"),
    "SCIENTIFIC_NAME_NORMAL": (5, "학명 정상(불확실 표기 없음)"),
    "SCIENTIFIC_NAME_UNCERTAIN": (-10, "학명 불확실(cf./아종 등)"),
    "UNIDENTIFIED_SPECIES": (-20, "미동정(sp./spp.)"),
}

TIER1_MIN = 60
TIER2_MIN = 30


@dataclass
class ScoreResult:
    score: int
    reasons: list[str] = field(default_factory=list)


def compute_score(*, organism_group: str, has_korean_name: bool,
                  is_uncertain: bool, uncertainty_type: str | None,
                  nifs_linked: bool) -> ScoreResult:
    """SpeciesProfile 1건의 priorityScore를 계산한다. 0~100으로 clamp한다."""
    reasons: list[str] = []
    total = 0

    if nifs_linked:
        reasons.append("NIFS_RESOURCE_DATA")

    if organism_group == FISH_GROUP:
        reasons.append("FISH_CORE_TARGET")
    elif organism_group in NONFISH_TARGET_GROUPS:
        reasons.append("NONFISH_TARGET_GROUP")

    reasons.append("HAS_KOREAN_NAME" if has_korean_name else "NO_KOREAN_NAME")

    if uncertainty_type == "unidentified_species":
        reasons.append("UNIDENTIFIED_SPECIES")
    elif is_uncertain:
        reasons.append("SCIENTIFIC_NAME_UNCERTAIN")
    else:
        reasons.append("SCIENTIFIC_NAME_NORMAL")

    for r in reasons:
        total += WEIGHTS[r][0]

    return ScoreResult(score=max(0, min(100, total)), reasons=reasons)


def classify_tier(score: int) -> str:
    if score >= TIER1_MIN:
        return "tier1"
    if score >= TIER2_MIN:
        return "tier2"
    return "tier3"


def fishing_target_status(organism_group: str, nifs_linked: bool,
                          has_existing_fishing_data: bool) -> str:
    """분류군만으로 낚시 대상이라고 확정하지 않는다."""
    if nifs_linked or has_existing_fishing_data:
        return "confirmed"
    if organism_group == FISH_GROUP or organism_group in NONFISH_TARGET_GROUPS:
        return "possible"
    return "unknown"


def review_status(*, is_uncertain: bool, has_korean_name: bool,
                  nifs_match_type: str | None) -> str:
    needs_review = is_uncertain or not has_korean_name or nifs_match_type == "korean_candidate"
    return "manual_review" if needs_review else "auto"


def detail_collection_status(tier: str) -> str:
    """Tier1만 최초 수집 대상으로 선택한다. 실제 다운로드는 하지 않았으므로 collected는 없다."""
    return "selected" if tier == "tier1" else "not_selected"


_MATCH_TYPE_RANK = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1}


def resolve_nifs_links(links: list[dict]) -> dict[str, str]:
    """nifs-mbris-link.json의 primary 매칭만으로 internalId -> matchType을 만든다.

    동일 internalId에 복수 NIFS 종이 매칭되면(이론상 가능) 더 강한 matchType을 남긴다.
    mbrisInternalId가 없는(미매칭) 링크는 제외한다.
    """
    out: dict[str, str] = {}
    for link in links:
        iid = link.get("mbrisInternalId")
        if not iid:
            continue
        mt = link["matchType"]
        if mt not in _MATCH_TYPE_RANK:
            continue
        if iid not in out or _MATCH_TYPE_RANK[mt] > _MATCH_TYPE_RANK[out[iid]]:
            out[iid] = mt
    return out
