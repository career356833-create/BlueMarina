#!/usr/bin/env python3
"""Phase 2.5: 샘플 5종 상세 수집 → detail-field-map.json 완성"""
import asyncio, json, sys
from pathlib import Path
from datetime import datetime, timezone

import httpx

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.detail_client import (
    fetch_list, fetch_detail, fetch_detail_data,
    DETAIL_API_URL, build_detail_url, LIST_API_BODY,
)
from src.detail_parser import parse_detail, RETMAP_FIELDS

ROOT = Path(__file__).parent.parent.parent
P25 = ROOT / "data" / "nifs" / "phase2_5"
RAW = ROOT / "data" / "nifs" / "raw" / "fish"
P25.mkdir(parents=True, exist_ok=True)

TARGETS = ["갈치", "고등어", "꽃게", "낙지", "대구"]
NOW = datetime.now(timezone.utc).isoformat()


async def main():
    async with httpx.AsyncClient(timeout=30.0) as c:
        rows = (await fetch_list(c))["retList"]
        picked = [r for r in rows if r["fishName"] in TARGETS]

        sample_results, parsed_all = {}, {}
        for r in picked:
            await asyncio.sleep(2)
            fid, fname = r["fishId"], r["fishName"]
            payload = await fetch_detail_data(c, fid)
            p = parse_detail(fid, payload, expected_name=fname)
            parsed_all[fid] = p

            status = "OK" if p.ok else "FAIL"
            print(f"[{status}] {fname:6s} 필드={p.field_count:2d} 이미지={len(p.images)} "
                  f"권장월={len(p.recommend_period)} 어획연도={len(p.catch_history)}")
            if p.errors:
                for e in p.errors:
                    print(f"        ! {e}")

            sample_results[fid] = {
                "fishName": fname,
                "fieldCount": p.field_count,
                "imageCount": len(p.images),
                "periodCount": len(p.recommend_period),
                "historyCount": len(p.catch_history),
                "ok": p.ok,
                "errors": p.errors,
                "parsed": p.fields,
            }

            # 원본 보관 (raw는 덮어쓰지 않고 상세 API 응답만 신규 저장)
            d = RAW / fid
            d.mkdir(parents=True, exist_ok=True)
            (d / "detail-api-response.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            (d / "parsed-preview.json").write_text(
                json.dumps({
                    "sourceId": fid, "koreanName": p.korean_name,
                    "fields": p.fields, "images": p.images,
                    "recommendPeriod": p.recommend_period,
                    "catchHistory": p.catch_history,
                    "parserVersion": "nifs-detail-v0.3.0", "collectedAt": NOW,
                }, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---- 필드 맵 집계 ----
    n = len(parsed_all)
    fields_meta = []
    for _key, (label, norm) in RETMAP_FIELDS.items():
        present = sum(1 for p in parsed_all.values() if p.fields.get(norm) not in (None, "", [], {}))
        fields_meta.append({
            "sourceLabel": label,
            "sourceKey": _key,
            "selector": f"retMap.{_key}",
            "sourceType": "html" if _key.startswith("info") else "text",
            "normalizedField": norm,
            "presentInSamples": present,
            "required": present == n,
        })
    for name, key, sel in [
        ("어종 이미지", "images", "imgList[].fileName"),
        ("소비 권장 시기", "recommendPeriod", "periodList[].{month,colorLevel}"),
        ("어획량 추이", "catchHistory", "historyList[].{year,catchAverage}"),
    ]:
        present = sum(1 for p in parsed_all.values() if getattr(p, {
            "images": "images", "recommendPeriod": "recommend_period",
            "catchHistory": "catch_history"}[key]))
        fields_meta.append({
            "sourceLabel": name, "sourceKey": key, "selector": sel,
            "sourceType": "array", "normalizedField": key,
            "presentInSamples": present, "required": present == n,
        })

    field_map = {
        "sampleCount": n,
        "parserVersion": "nifs-detail-v0.3.0",
        "generatedAt": NOW,
        "listRequest": {
            "url": "https://nifs.go.kr/portal/fr/chrpA/selectChrpFishList.do",
            "method": "POST", "contentType": "application/json",
            "body": LIST_API_BODY, "requiresSession": False,
        },
        "detailRequest": {
            "shellUrl": build_detail_url("{fishId}"),
            "url": DETAIL_API_URL,
            "method": "POST",
            "contentType": "application/json",
            "parameterName": "fishId",
            "requiresSession": False,
            "note": "shell 페이지(actionChrpFishView.do)는 데이터를 포함하지 않는다. "
                    "실제 콘텐츠는 이 API가 반환한다.",
        },
        "fields": fields_meta,
        "sampleResults": sample_results,
    }

    out = P25 / "detail-field-map.json"
    out.write_text(json.dumps(field_map, ensure_ascii=False, indent=2), encoding="utf-8")
    # phase2의 빈 파일도 갱신
    (ROOT / "data" / "nifs" / "phase2" / "detail-field-map.json").write_text(
        json.dumps(field_map, ensure_ascii=False, indent=2), encoding="utf-8")

    common = [f["normalizedField"] for f in fields_meta if f["required"]]
    optional = [f["normalizedField"] for f in fields_meta if not f["required"]]
    print(f"\n샘플 {n}종 / 성공 {sum(1 for p in parsed_all.values() if p.ok)}종")
    print(f"공통 필드({len(common)}): {common}")
    print(f"선택 필드({len(optional)}): {optional}")
    print(f"저장: {out}")


asyncio.run(main())
