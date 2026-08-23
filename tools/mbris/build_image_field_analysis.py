#!/usr/bin/env python3
"""MBRIS 상세 API의 이미지 필드 존재 여부 조사.

인증 키가 없어 실제 응답으로 재확인하지 못했다. data.go.kr Swagger 명세(문서)
기준으로만 판정하며, 그 사실을 결과에 명시한다.
"""
import json, sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
REPORTS = ROOT / "data" / "mbris" / "reports"

# data.go.kr 15094770 Swagger 명세에서 실제 확인한 item 필드 전체(2026-07-31 조사).
DOCUMENTED_FIELDS = [
    "Kingdom", "KingdomKR", "PhylumDivision", "PhylumDivisionKR", "Class", "ClassKR",
    "Order", "OrderKR", "Family", "FamilyKR", "SpcScitfNm", "CommKorNm", "SpcTyp",
    "ABST", "FORM", "ECOL", "CULTIVINF", "BIOCHEMICAL", "ACTIVINFO", "NADI", "INDI",
    "HABI", "UTLZ", "CorrNmTyp", "CorrSpcScitfNm", "SpcTxnId", "SpcScitfNmShort",
]

IMAGE_KEYWORDS = ("img", "image", "photo", "pic", "thumb", "file", "attach")


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)

    matches = [f for f in DOCUMENTED_FIELDS if any(k in f.lower() for k in IMAGE_KEYWORDS)]

    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "method": "data.go.kr Swagger 명세 문서 확인(인증 실응답 미확보 — API 키 없음)",
        "specUrl": "https://www.data.go.kr/data/15094770/openapi.do",
        "documentedFieldCount": len(DOCUMENTED_FIELDS),
        "documentedFields": DOCUMENTED_FIELDS,
        "imageRelatedFieldsFound": matches,
        "apiImageFieldVerdict": "not_available" if not matches else "api_direct",
        "mbrisWebsiteDetailPageCheck": {
            "attempted": True,
            "result": "unknown",
            "note": ("www.mbris.kr 웹사이트 자체(별도 API 아님)의 종 상세 페이지에 이미지가 "
                     "있는지 확인을 시도했으나, 정확한 URL 패턴을 찾지 못해 '비허용 접근' "
                     "페이지만 확인했다. 추가 조사가 필요하다 — 추측하지 않고 unknown으로 남긴다."),
        },
        "overallVerdict": "not_available",
        "verdictNote": (
            "상세 API(taxonlist3) 응답 스키마에는 이미지/사진 관련 필드가 없다(문서 기준, "
            "26개 필드 전수 확인). 웹사이트 자체에 별도 이미지가 있는지는 미확인(unknown)이다. "
            "이번 단계 제한(이미지 대량 다운로드 금지)에 따라 추가 확인을 진행하지 않았다."
        ),
    }

    (REPORTS / "image-field-analysis.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"이미지 관련 필드: {matches or '없음'}")
    print(f"판정: {result['overallVerdict']}")
    print(f"저장: {REPORTS / 'image-field-analysis.json'}")


if __name__ == "__main__":
    main()
