"""Service Priority Score — Blue Marina 사용자 가치 평가.

Data Priority(priority_engine.py)와 완전히 분리된 별도 점수다. Data Priority는
"공식 데이터를 얼마나 확보했는가"를 재고, Service Priority는 "실제 서비스에
먼저 실을 가치가 있는가"를 잰다. 근거 없는 인기 점수(검색량 추정, 유명세 추정,
커뮤니티 인기 추정)는 쓰지 않는다 — 이 시점에 확보된 데이터로만 계산한다.
"""
from __future__ import annotations

from dataclasses import dataclass, field

GROUP_BONUS = {
    "fish": ("ORGANISM_GROUP_FISH", 15),
    "cephalopod": ("ORGANISM_GROUP_CEPHALOPOD", 12),
    "crustacean": ("ORGANISM_GROUP_CRUSTACEAN", 10),
    "gastropod": ("ORGANISM_GROUP_SHELLFISH", 8),
    "bivalve": ("ORGANISM_GROUP_SHELLFISH", 8),
}

WEIGHTS = {
    "FISH_DATA_EXIST": (40, "src/data/fish-data.ts에 이미 존재하는 낚시 콘텐츠"),
    "NIFS_LINKED": (25, "NIFS 25종과 연결됨"),
    "CONFIRMED_FISHING_TARGET": (20, "fishingTargetStatus == confirmed"),
    "ORGANISM_GROUP_FISH": (15, "어류"),
    "ORGANISM_GROUP_CEPHALOPOD": (12, "두족류"),
    "ORGANISM_GROUP_CRUSTACEAN": (10, "갑각류"),
    "ORGANISM_GROUP_SHELLFISH": (8, "복족류·이매패류(패류)"),
    "HAS_KOREAN_NAME": (5, "국명 존재"),
    "NO_KOREAN_NAME": (-10, "국명 없음"),
    "SCIENTIFIC_NAME_NORMAL": (5, "학명 정상(불확실 표기 없음)"),
    "SCIENTIFIC_NAME_UNCERTAIN": (-10, "학명 불확실(cf./아종 등)"),
    "UNIDENTIFIED_SPECIES": (-20, "미동정(sp./spp.)"),
}


@dataclass
class ServiceScoreResult:
    score: int
    reasons: list[str] = field(default_factory=list)


def compute_service_score(*, fish_data_linked: bool, nifs_linked: bool,
                          fishing_confirmed: bool, organism_group: str,
                          has_korean_name: bool, is_uncertain: bool,
                          uncertainty_type: str | None) -> ServiceScoreResult:
    reasons: list[str] = []

    if fish_data_linked:
        reasons.append("FISH_DATA_EXIST")
    if nifs_linked:
        reasons.append("NIFS_LINKED")
    if fishing_confirmed:
        reasons.append("CONFIRMED_FISHING_TARGET")

    group = GROUP_BONUS.get(organism_group)
    if group:
        reasons.append(group[0])

    reasons.append("HAS_KOREAN_NAME" if has_korean_name else "NO_KOREAN_NAME")

    if uncertainty_type == "unidentified_species":
        reasons.append("UNIDENTIFIED_SPECIES")
    elif is_uncertain:
        reasons.append("SCIENTIFIC_NAME_UNCERTAIN")
    else:
        reasons.append("SCIENTIFIC_NAME_NORMAL")

    total = sum(WEIGHTS[r][0] for r in reasons)
    return ServiceScoreResult(score=max(0, min(100, total)), reasons=reasons)


# 기본 경계값. §5 지시대로 실제 분포를 본 뒤 필요하면 "이 값 자체"를 조정하되,
# 점수 계산식은 절대 건드리지 않는다 — 조정 시 REASON에 근거를 남긴다.
DEFAULT_TIER_A_MIN = 60
DEFAULT_TIER_B_MIN = 40


def classify_service_tier(score: int, tier_a_min: int = DEFAULT_TIER_A_MIN,
                          tier_b_min: int = DEFAULT_TIER_B_MIN) -> str:
    if score >= tier_a_min:
        return "A"
    if score >= tier_b_min:
        return "B"
    return "C"
