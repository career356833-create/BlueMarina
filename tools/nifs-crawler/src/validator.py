"""전수 검증. 실패를 성공으로 기록하지 않기 위해 항목별 근거를 남긴다."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from . import paths

EXPECTED_COUNT = 25
VALID_MONTHS = set(range(1, 13))


def validate_list(rows: list[dict]) -> dict:
    ids = [r.get("fishId") for r in rows]
    names = [r.get("fishName") for r in rows]
    return {
        "totalCount": len(rows),
        "expectedCount": EXPECTED_COUNT,
        "countMatches": len(rows) == EXPECTED_COUNT,
        "duplicateIds": [k for k, v in Counter(ids).items() if v > 1],
        "duplicateNames": [k for k, v in Counter(names).items() if v > 1],
        "emptyIds": sum(1 for i in ids if not i),
        "emptyNames": sum(1 for n in names if not n),
        "colorLevelDistribution": dict(Counter(str(r.get("colorLevel")) for r in rows)),
        "displayDistribution": dict(Counter(str(r.get("display")) for r in rows)),
    }


def validate_detail(source_id: str, list_row: dict, payload: dict, normalized: dict) -> dict:
    """상세 1건 검증. issues가 비어야 통과."""
    issues: list[str] = []
    ret_map = payload.get("retMap")

    if not isinstance(ret_map, dict) or not ret_map:
        issues.append("retMap 없음")
    else:
        if ret_map.get("fishId") and ret_map["fishId"] != source_id:
            issues.append(f"fishId 불일치: {ret_map['fishId']}")
        if ret_map.get("fishName") != list_row.get("fishName"):
            issues.append(
                f"이름 불일치: 목록={list_row.get('fishName')} 상세={ret_map.get('fishName')}")

    text_fields = ["koreanName", "englishName", "scientificName", "feature",
                   "distribution", "lifecycle", "dialect", "catchMethod", "nutrition"]
    filled = [f for f in text_fields if normalized.get(f)]
    if not filled:
        issues.append("텍스트 필드 0개")

    # 월별
    months = [p["month"] for p in normalized.get("recommendPeriod", [])]
    dup_months = [m for m, c in Counter(months).items() if c > 1]
    invalid_months = [m for m in months if m not in VALID_MONTHS]
    if dup_months:
        issues.append(f"중복 월: {dup_months}")
    if invalid_months:
        issues.append(f"잘못된 월: {invalid_months}")

    # 어획 이력
    years = [h["year"] for h in normalized.get("catchHistory", [])]
    dup_years = [y for y, c in Counter(years).items() if c > 1]
    if dup_years:
        issues.append(f"중복 연도: {dup_years}")

    imgs = normalized.get("sourceImages", [])
    if not imgs:
        issues.append("이미지 0개")

    return {
        "sourceId": source_id,
        "koreanName": list_row.get("fishName"),
        "filledTextFields": len(filled),
        "monthCount": len(months),
        "monthsCovered": sorted(months),
        "yearCount": len(years),
        "yearRange": [min(years), max(years)] if years else None,
        "yearsSorted": years == sorted(years),
        "imageCount": len(imgs),
        "validImageCount": sum(1 for i in imgs if i.get("isValid")),
        "duplicateImageCount": sum(1 for i in imgs if i.get("isDuplicate")),
        "issues": issues,
        "passed": not issues,
    }


def aggregate(details: list[dict], normalized: list[dict]) -> dict:
    """전체 집계."""
    text_fields = ["koreanName", "englishName", "scientificName", "feature",
                   "distribution", "lifecycle", "dialect", "catchMethod",
                   "nutrition", "eatingNote", "prohibitSize", "recommendSize"]
    presence = {f: sum(1 for n in normalized if n.get(f) not in (None, "", [], {}))
                for f in text_fields}

    all_imgs = [i for n in normalized for i in n.get("sourceImages", [])]
    hashes = Counter(i["sha256"] for i in all_imgs if i.get("sha256"))
    all_years = [h["year"] for n in normalized for h in n.get("catchHistory", [])]
    month_levels = Counter(
        p["recommendationLevel"] for n in normalized for p in n.get("recommendPeriod", []))

    return {
        "detailTotal": len(details),
        "detailPassed": sum(1 for d in details if d["passed"]),
        "detailFailed": [d["sourceId"] for d in details if not d["passed"]],
        "fieldPresence": presence,
        "fieldsPresentInAll": [f for f, c in presence.items() if c == len(normalized)],
        "fieldsPartial": {f: c for f, c in presence.items() if 0 < c < len(normalized)},
        "fieldsAbsent": [f for f, c in presence.items() if c == 0],
        "images": {
            "total": len(all_imgs),
            "valid": sum(1 for i in all_imgs if i.get("isValid")),
            "invalid": sum(1 for i in all_imgs if not i.get("isValid")),
            "watermarked": sum(1 for i in all_imgs if i.get("isWatermarked")),
            "duplicateHashGroups": {h: c for h, c in hashes.items() if c > 1},
            "totalBytes": sum(i.get("fileSize", 0) for i in all_imgs),
        },
        "catchHistory": {
            "yearRange": [min(all_years), max(all_years)] if all_years else None,
            "perFishYearCounts": dict(Counter(
                len(n.get("catchHistory", [])) for n in normalized)),
            "unit": None,
            "unitNote": "historyList 응답과 화면 모두 단위 필드가 없다. 차트 축 라벨은 MT로 표기된다.",
        },
        "recommendPeriod": {
            "levelDistribution": dict(month_levels),
            "perFishMonthCounts": dict(Counter(
                len(n.get("recommendPeriod", [])) for n in normalized)),
        },
    }


def write_csv(path: Path, header: list[str], rows: list[list[Any]]) -> None:
    import csv
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
