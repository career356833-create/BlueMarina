#!/usr/bin/env python3
"""§6: MBRIS taxonlist3 응답에 이미지 관련 필드가 있는지 확인만 한다.
다운로드는 하지 않는다 — 필드/URL/ID 존재 여부만 기록."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DETAIL = ROOT / "data" / "mbris" / "raw" / "detail"
REPORTS = ROOT / "data" / "mbris" / "reports"

IMAGE_KEYWORDS = ("image", "img", "photo", "picture", "thumbnail", "url", "file", "attach")
URL_RE = re.compile(r"https?://\S+")


def main() -> None:
    dirs = sorted(p for p in RAW_DETAIL.iterdir() if p.is_dir())
    per_species = []
    all_fields: set[str] = set()
    suspect_fields: set[str] = set()
    urls_found: list[dict] = []

    for d in dirs:
        preview_path = d / "parsed-preview.json"
        if not preview_path.exists():
            continue
        preview = json.loads(preview_path.read_text(encoding="utf-8"))
        item = preview["matchedItem"]
        fields = set(item.keys())
        all_fields |= fields

        species_suspects = {f for f in fields if any(k in f.lower() for k in IMAGE_KEYWORDS)}
        suspect_fields |= species_suspects

        species_urls = []
        for k, v in item.items():
            if isinstance(v, str) and URL_RE.search(v):
                species_urls.append({"field": k, "value": v})
        urls_found.extend({"internalId": d.name, **u} for u in species_urls)

        per_species.append({
            "internalId": d.name,
            "koreanName": item.get("CommKorNm"),
            "fieldCount": len(fields),
            "imageLikeFieldsFound": sorted(species_suspects),
            "urlsFoundInAnyField": species_urls,
        })

    result = {
        "endpoint": "https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3",
        "sampleSize": len(per_species),
        "downloadedAnyImage": False,  # 정책상 항상 False — 이 스크립트는 확인만 한다
        "allObservedFields": sorted(all_fields),
        "imageLikeFieldsFound": sorted(suspect_fields),
        "urlValuesFoundAnywhere": urls_found,
        "hasImageField": bool(suspect_fields),
        "hasImageUrl": bool(urls_found),
        "separateImageEndpointNeeded": "unknown",  # taxonlist3 응답만으로는 판단 불가
        "perSpecies": per_species,
        "conclusion": (
            "이미지 필드 없음(hasImageField=False), URL 값도 전혀 없음(hasImageUrl=False)"
            if not suspect_fields and not urls_found else
            "이미지 관련 필드/URL 후보가 관찰됨 — 아래 imageLikeFieldsFound/urlValuesFoundAnywhere 확인 필요"
        ),
        "note": ("taxonlist3(종 상세) 엔드포인트 응답에 이미지 필드가 있는지만 확인했다. "
                "다른 MBRIS 엔드포인트(예: 이미지 전용 API)가 별도로 존재하는지는 이번 "
                "5종 샘플 범위로는 판단할 수 없다 — data.go.kr에 등록된 다른 서비스가 "
                "있는지 별도 확인 필요."),
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "mbris-image-api-analysis.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[1] 샘플 {len(per_species)}종 확인")
    print(f"    이미지 필드 존재: {result['hasImageField']}")
    print(f"    URL 값 존재: {result['hasImageUrl']}")
    print(f"    결론: {result['conclusion']}")
    print(f"\n✅ 저장: {REPORTS / 'mbris-image-api-analysis.json'}")


if __name__ == "__main__":
    main()
