"""원본 → Blue Marina 정규화. 원본 키와 서비스 필드를 분리해 기록한다."""
from __future__ import annotations

from typing import Any, Optional

from .detail_parser import RETMAP_FIELDS, COLOR_LEVEL_LABEL, clean_text

SOURCE_PROVIDER = "NIFS"
DETAIL_SHELL = "https://nifs.go.kr/portal/fr/chrpA/actionChrpFishView.do?fishId="

# 출처에 단위 표기가 없는 값은 추측하지 않는다.
CATCH_UNIT: Optional[str] = None  # historyList에 unit 필드 없음 — 보고서에 기록


def missing(source_value: Any, reason: str) -> dict:
    """값 없음을 이유와 함께 남긴다. 'NA'를 설명 텍스트로 저장하지 않기 위한 장치."""
    return {"value": None, "sourceValue": source_value, "missingReason": reason}


# periodList는 자제(1)·지양(2) 월만 반환한다. 권장(0) 월은 응답에 없고,
# 화면이 기본색(green)으로 그린다. 전수 확인 결과 등급 0은 한 건도 오지 않았다.
PERIOD_OMITTED_MEANING = "권장"
PERIOD_NOTE = (
    "periodList는 자제·지양 월만 반환한다. 응답에 없는 월은 화면에서 권장(green)으로 "
    "표시된다. 데이터 누락이 아니라 출처의 표현 방식이다."
)


def omitted_months(period_list: list[dict]) -> list[int]:
    """응답에 오지 않은 월. 화면상 권장(green)으로 그려지는 월이다."""
    present = {int(p["month"]) for p in (period_list or []) if p.get("month") is not None}
    return [m for m in range(1, 13) if m not in present]


def normalize_period(period_list: list[dict]) -> list[dict]:
    """월별 소비 권장. 반환된 월만 담고 없는 월을 임의로 채우지 않는다."""
    out = []
    for p in period_list or []:
        month = p.get("month")
        if month is None:
            continue
        lv = str(p.get("colorLevel"))
        out.append({
            "month": int(month),
            "sourceValue": p.get("colorLevel"),
            "recommendationLevel": lv,
            "displayLabel": COLOR_LEVEL_LABEL.get(lv),
        })
    return sorted(out, key=lambda x: x["month"])


def normalize_history(history_list: list[dict]) -> list[dict]:
    """연도별 어획량. 단위는 응답에 없으므로 null로 둔다."""
    out = []
    for h in history_list or []:
        year = h.get("year")
        if year is None:
            continue
        raw = h.get("catchAverage")
        amount: Optional[float] = None
        if raw not in (None, "", "NA"):
            try:
                amount = float(raw)
            except (TypeError, ValueError):
                amount = None
        out.append({
            "year": int(year),
            "catchAmount": amount,
            "unit": CATCH_UNIT,
            "sourceValue": dict(h),
        })
    return sorted(out, key=lambda x: x["year"])


def normalize_size(raw: Any) -> Optional[float]:
    """체장 값. 단위 접미사는 화면에서 fishId별로 붙이므로 원본은 숫자만 담긴다."""
    if raw in (None, "", "NA", 0, "0"):
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def normalize_fish(
    *,
    source_id: str,
    list_row: dict,
    payload: dict,
    images: list[dict],
    collected_at: str,
    content_hash: str,
    parser_version: str,
) -> dict:
    """상세 API 응답 1건을 정규화 레코드로 변환한다."""
    ret_map = payload.get("retMap") or {}

    fields: dict[str, Any] = {}
    for key, (_label, norm) in RETMAP_FIELDS.items():
        if norm in ("prohibitSize", "recommendSize"):
            continue
        raw = ret_map.get(key)
        cleaned = clean_text(raw)
        if cleaned is None and raw is not None and str(raw).strip() == "NA":
            fields[norm] = missing("NA", "source_na")
        elif cleaned is None:
            fields[norm] = missing(raw, "source_empty")
        else:
            fields[norm] = cleaned

    def plain(name: str) -> Any:
        v = fields.get(name)
        return v.get("value") if isinstance(v, dict) else v

    return {
        "sourceProvider": SOURCE_PROVIDER,
        "sourceId": source_id,
        "koreanName": plain("koreanName") or list_row.get("fishName"),
        "englishName": plain("englishName"),
        "scientificName": plain("scientificName"),
        "feature": plain("feature"),
        "distribution": plain("distribution"),
        "lifecycle": plain("lifecycle"),
        "dialect": plain("dialect"),
        "catchMethod": plain("catchMethod"),
        "nutrition": plain("nutrition"),
        "prohibitSize": normalize_size(ret_map.get("prohibitSize")),
        "recommendSize": normalize_size(ret_map.get("recommendSize")),
        "eatingNote": plain("eatingNote"),
        "eatingNoteMissing": fields.get("eatingNote") if isinstance(fields.get("eatingNote"), dict) else None,
        # 목록 등급은 periodList에서 파생되지 않는다(전수 확인 시 19/25만 일치).
        # 출처가 별도로 부여한 값이므로 그대로 보존한다.
        "listColorLevel": list_row.get("colorLevel"),
        "listDisplayStatus": list_row.get("display"),
        "recommendPeriod": normalize_period(payload.get("periodList")),
        "recommendPeriodOmittedMonths": omitted_months(payload.get("periodList")),
        "recommendPeriodOmittedMeaning": PERIOD_OMITTED_MEANING,
        "recommendPeriodNote": PERIOD_NOTE,
        "catchHistory": normalize_history(payload.get("historyList")),
        "sourceImages": images,
        "sourceUrl": f"{DETAIL_SHELL}{source_id}",
        "sourceCollectedAt": collected_at,
        "sourceContentHash": content_hash,
        "parserVersion": parser_version,
        "factReviewStatus": "pending",
    }


def source_field_record(source_id: str, payload: dict) -> dict:
    """원본 API 키와 서비스 매핑을 나란히 보존한다."""
    ret_map = payload.get("retMap") or {}
    return {
        "sourceId": source_id,
        "sourceFields": {
            "rawApiKeys": dict(ret_map),
            "mappedFields": {
                key: {"screenLabel": label, "normalizedField": norm}
                for key, (label, norm) in RETMAP_FIELDS.items()
            },
        },
    }
