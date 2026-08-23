"""Tier A 샘플 5종(갈치·고등어·참돔·주꾸미·꽃게) 매핑 검증.

⚠️ 이 환경에는 MBRIS_API_KEY가 없다. 그래서 두 종류로 나눈다.
  1. 실제 API 테스트 — MBRIS_API_KEY가 있을 때만 돈다(없으면 skip). 키가 생기면
     자동으로 활성화되어 진짜 인증 응답으로 파서·정규화 파이프라인을 검증한다.
  2. fixture 테스트 — Swagger 명세로 확인한 실제 필드명 구조를 반영한 합성 XML로,
     키 없이도 항상 돌아간다. **합성 데이터이지 실응답 캡처가 아니다.**
"""
import os
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api_client import MbrisApiClient
from src.config import load_config
from src.detail_collector import select_best_item
from src.detail_normalizer import normalize_detail
from src.xml_parser import parse_taxonlist_xml

SAMPLE_5 = [
    ("BM-SPECIES-000444", "갈치", "Trichiurus japonicus"),
    ("BM-SPECIES-000417", "고등어", "Scomber japonicus"),
    ("BM-SPECIES-000755", "참돔", "Pagrus major"),
    ("BM-SPECIES-003107", "주꾸미", "Amphioctopus fangsiao"),
    ("BM-SPECIES-005640", "꽃게", "Portunus trituberculatus"),
]

# load_config()는 환경변수뿐 아니라 tools/mbris/.env도 읽는다(config.py 참고).
# os.environ만 보면 .env로 설정된 키를 못 잡아 실제 키가 있어도 항상 skip된다 —
# 2026-08-03 실제 키 확보 후 이 버그로 라이브 테스트가 계속 skip되고 있었음을 확인해 고쳤다.
HAS_LIVE_KEY = load_config().is_configured


def synthetic_xml(korean_name: str, scientific_name: str) -> str:
    """Swagger 문서상의 실제 필드명 구조를 반영한 합성 응답 — 진짜 값이 아니다."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
  <body>
    <items>
      <item>
        <SpcTxnId>0</SpcTxnId>
        <SpcScitfNm>{scientific_name}</SpcScitfNm>
        <CommKorNm>{korean_name}</CommKorNm>
        <ClassKR>합성값</ClassKR>
        <OrderKR>합성값</OrderKR>
        <FamilyKR>합성값</FamilyKR>
        <FORM>합성 형태 설명</FORM>
        <HABI>합성 서식지 설명</HABI>
      </item>
    </items>
    <numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>1</totalCount>
  </body>
</response>"""


# ------------------------------------------------------------- fixture 테스트
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_샘플5종_합성응답_매핑_파이프라인전체(internal_id, ko, sci):
    xml = synthetic_xml(ko, sci)
    parsed = parse_taxonlist_xml(xml)
    assert parsed.ok
    item, note = select_best_item(parsed.items, sci)
    assert item is not None, note
    detail = normalize_detail(internal_id=internal_id, source_id=item.get("SpcTxnId"),
                              item=item, raw_body=xml.encode("utf-8"))
    assert detail["basic"]["koreanName"] == ko
    assert detail["basic"]["scientificName"] == sci
    assert detail["internalId"] == internal_id


def test_샘플5종_전부_학명이_서로_다르다():
    """internalId 매칭에 학명을 쓰므로, 5종 학명이 겹치면 매칭 로직 검증 의미가 없다."""
    names = [sci for _iid, _ko, sci in SAMPLE_5]
    assert len(names) == len(set(names))


# --------------------------------------------------------------- 실제 API 테스트
@pytest.mark.skipif(not HAS_LIVE_KEY, reason="MBRIS_API_KEY가 설정되지 않음 — 실응답 테스트 skip")
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_실제_API_5종_조회(internal_id, ko, sci):
    """키가 있을 때만 실행된다. 실제 게이트웨이에 진짜 요청을 보낸다."""
    config = load_config()
    client = MbrisApiClient(config)
    with httpx.Client(timeout=30.0) as c:
        result = client.fetch_species(scientific_name=sci, client=c)
    assert result.ok, f"{ko}({sci}) 조회 실패: {result.error_type} {result.error_message}"

    parsed = parse_taxonlist_xml(result.body)
    assert parsed.ok, f"XML 파싱 실패: {parsed.error}"

    item, note = select_best_item(parsed.items, sci)
    assert item is not None, f"{ko} 매칭 실패: {note}"
    assert item.get("CommKorNm") == ko, (
        f"국명 불일치 — API가 반환한 국명({item.get('CommKorNm')})이 "
        f"taxonomy-master.json의 국명({ko})과 다르다. 수동 확인 필요.")


@pytest.mark.skipif(not HAS_LIVE_KEY, reason="MBRIS_API_KEY가 설정되지 않음 — 실응답 테스트 skip")
def test_실제_응답의_resultCode_값_확인():
    """문서에 성공값이 명시돼 있지 않아, 실제로 뭐가 오는지 이 테스트로 처음 확인한다."""
    config = load_config()
    client = MbrisApiClient(config)
    with httpx.Client(timeout=30.0) as c:
        result = client.fetch_species(scientific_name="Trichiurus japonicus", client=c)
    assert result.ok
    parsed = parse_taxonlist_xml(result.body)
    assert parsed.result_code is not None, "resultCode 요소 자체가 없다 — 명세와 다름, 기록 필요"
