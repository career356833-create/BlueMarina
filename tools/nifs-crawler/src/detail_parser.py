#!/usr/bin/env python3
"""NIFS 상세 데이터 파서.

상세 화면은 shell HTML + selectChrpFishViewData.do JSON 조합이다.
필드 라벨은 상세 shell의 콜백 함수(calBackFunc)가 DOM에 심는 텍스트를 근거로 한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

IMAGE_BASE = "https://download.nifs.go.kr/portal/ofiris/ME/sosf/"

# retMap 키 -> (화면 라벨, 정규화 필드명)
# 라벨은 actionChrpFishView.do shell의 실제 DOM 텍스트에서 확인한 값이다.
# 주의: infoCookHow는 이름과 달리 조리법이 아니라 "영양 정보"를 담는다.
RETMAP_FIELDS: dict[str, tuple[str, str]] = {
    "fishName": ("어종이름", "koreanName"),
    "fishNameEn": ("영문이름", "englishName"),
    "scName": ("학명", "scientificName"),
    "infoShape": ("특징", "feature"),
    "infoDistribution": ("분포", "distribution"),
    "infoGrowth": ("생애주기", "lifecycle"),
    "infoDialect": ("방언", "dialect"),
    "infoCatch": ("어획 방법", "catchMethod"),
    "infoCookHow": ("영양 정보", "nutrition"),
    "infoEat": ("알고 먹읍시다!", "eatingNote"),
    "prohibitSize": ("소비 지양 크기", "prohibitSize"),
    "recommendSize": ("소비 권장 크기", "recommendSize"),
}

# 소비 권장 등급. 근거: 상세 화면 범례(green=권장/yellow=자제/red=지양) 및
# 목록 페이지 colorLevel 분기(2=r-type, 1=y-type, 그 외=g-type)
COLOR_LEVEL_LABEL: dict[str, str] = {"0": "권장", "1": "자제", "2": "지양"}

# 값이 없음을 뜻하는 문자열 (NIFS가 실제로 쓰는 값)
NULLISH = {"", "NA", "N/A", "-", "null", "None"}

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t ]+")


def clean_text(raw: Any) -> Optional[str]:
    """HTML 조각을 텍스트로 정제한다. 값이 없으면 None."""
    if raw is None:
        return None
    s = str(raw)
    s = s.replace("<br/>", "\n").replace("<br>", "\n").replace("<BR>", "\n")
    s = _TAG_RE.sub("", s)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    s = _WS_RE.sub(" ", s)
    s = "\n".join(line.strip() for line in s.split("\n"))
    s = re.sub(r"\n{3,}", "\n\n", s).strip()
    return None if s in NULLISH else s


@dataclass
class ParsedDetail:
    source_id: str
    korean_name: Optional[str] = None
    fields: dict[str, Any] = field(default_factory=dict)
    images: list[dict[str, str]] = field(default_factory=list)
    recommend_period: list[dict[str, Any]] = field(default_factory=list)
    catch_history: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def field_count(self) -> int:
        return sum(1 for v in self.fields.values() if v not in (None, "", [], {}))

    @property
    def ok(self) -> bool:
        return not self.errors and self.korean_name is not None and self.field_count > 0


def parse_detail(source_id: str, payload: dict, expected_name: Optional[str] = None) -> ParsedDetail:
    """selectChrpFishViewData.do 응답을 파싱한다.

    실패는 예외가 아니라 ParsedDetail.errors로 보고한다 — 부분 성공을
    성공으로 오인하지 않기 위해 ok 판정과 분리한다.
    """
    result = ParsedDetail(source_id=source_id)

    ret_map = payload.get("retMap")
    if not isinstance(ret_map, dict) or not ret_map:
        result.errors.append("retMap 없음 또는 빈 객체 — 상세 데이터 미존재")
        return result

    returned_id = ret_map.get("fishId")
    if returned_id and returned_id != source_id:
        result.errors.append(f"fishId 불일치: 요청={source_id} 응답={returned_id}")

    for key, (_label, norm) in RETMAP_FIELDS.items():
        result.fields[norm] = clean_text(ret_map.get(key))

    result.korean_name = result.fields.get("koreanName")
    if result.korean_name is None:
        result.errors.append("fishName 없음")
    elif expected_name and result.korean_name != expected_name:
        result.errors.append(f"fishName 불일치: 목록={expected_name} 상세={result.korean_name}")

    for img in payload.get("imgList") or []:
        fn = img.get("fileName")
        if fn:
            result.images.append({"fileName": fn, "sourceUrl": f"{IMAGE_BASE}{fn}"})

    for p in payload.get("periodList") or []:
        month, level = p.get("month"), p.get("colorLevel")
        if month is not None:
            lv = str(level)
            result.recommend_period.append({
                "month": int(month),
                "colorLevel": lv,
                "label": COLOR_LEVEL_LABEL.get(lv),
            })

    for h in payload.get("historyList") or []:
        year, avg = h.get("year"), h.get("catchAverage")
        if year is not None:
            result.catch_history.append({"year": str(year), "catchAverage": avg})

    if result.field_count == 0:
        result.errors.append("추출된 상세 필드 0개")

    return result
