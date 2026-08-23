"""기존 Blue Marina 낚시 데이터(src/data/fish-data.ts) 파싱 및 MBRIS 매칭.

fish-data.ts에는 학명이 없다 — 국명·카테고리·설명뿐이다. 그래서 매칭은 2단계다.
1. NIFS 25종과 국명이 같으면, 이미 검증된 nifs-mbris-link.json의 matchType/confidence를
   그대로 물려받는다(그 NIFS 매칭 자체가 학명 대조로 나온 값이므로).
2. NIFS에 없으면 MBRIS 국명과 직접 대조한다 — 이 경우 학명 검증이 없으므로
   matchType은 항상 "korean_candidate"이고, confidence는 후보 수로만 정한다.
학명을 지어내거나 추정하지 않는다.
"""
from __future__ import annotations

import re
from collections import defaultdict

FISH_CATEGORIES = ["바다낚시 인기어종", "선상낚시 어종", "방파제/갯바위 어종",
                   "계절별 대표어종", "회/식용 인기어종", "주의가 필요한 어종"]

_CAT_ALTERNATION = "|".join(re.escape(c) for c in FISH_CATEGORIES)
_ENTRY_RE = re.compile(r'\["([^"]+)",\s*"(?:' + _CAT_ALTERNATION + r')"')
_FISH_SEED_RE = re.compile(r"const fishSeed\b.*?=\s*\[(.*)\];", re.S)


def parse_fish_data_names(ts_source: str) -> list[str]:
    """fish-data.ts 원문에서 고유 국명 목록을 등장 순서대로 뽑는다.

    반드시 `fishSeed` 배열 본문으로 범위를 한정한다 — 그러지 않으면 파일 상단의
    `fishCategories = ["바다낚시 인기어종", "선상낚시 어종", ...]` 선언까지
    `["카테고리명", "다음카테고리명"]` 형태로 오매칭된다.
    """
    m = _FISH_SEED_RE.search(ts_source)
    body = m.group(1) if m else ts_source
    seen: dict[str, None] = {}
    for name in _ENTRY_RE.findall(body):
        seen.setdefault(name, None)
    return list(seen.keys())


def normalize_ko(s: str | None) -> str:
    return re.sub(r"[\s\-·()]", "", s or "")


def build_nifs_name_index(nifs_links: list[dict]) -> dict[str, dict]:
    return {link["nifsName"]: link for link in nifs_links if link.get("nifsName")}


def build_mbris_korean_index(candidates: list[dict]) -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
    by_ko: dict[str, list[dict]] = defaultdict(list)
    by_ko_norm: dict[str, list[dict]] = defaultdict(list)
    for c in candidates:
        if c.get("koreanName"):
            by_ko[c["koreanName"]].append(c)
            by_ko_norm[normalize_ko(c["koreanName"])].append(c)
    return by_ko, by_ko_norm


def match_fish_data_entry(name: str, nifs_index: dict[str, dict],
                          mbris_ko: dict[str, list[dict]],
                          mbris_ko_norm: dict[str, list[dict]]) -> dict | None:
    """fish-data.ts 이름 1건을 MBRIS 후보에 연결한다. 못 찾으면 None."""
    nifs_link = nifs_index.get(name)
    if nifs_link and nifs_link.get("mbrisInternalId"):
        return {
            "internalId": nifs_link["mbrisInternalId"],
            "matchType": nifs_link["matchType"],
            "confidence": nifs_link["confidence"],
            "viaNifs": True,
            "candidateCount": 1,
            "additionalCandidateIds": [],
        }

    candidates = mbris_ko.get(name) or mbris_ko_norm.get(normalize_ko(name)) or []
    if not candidates:
        return None

    confidence = "medium" if len(candidates) == 1 else "low"
    return {
        "internalId": candidates[0]["internalId"],
        "matchType": "korean_candidate",
        "confidence": confidence,
        "viaNifs": False,
        "candidateCount": len(candidates),
        "additionalCandidateIds": [c["internalId"] for c in candidates[1:5]],
    }
