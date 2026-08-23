"""xml_parser 테스트.

fixture XML은 data.go.kr Swagger 명세로 확인한 실제 필드명(26~27개)을 반영한
합성 데이터다 — 인증 키가 없어 실제 응답으로 만든 것은 아니다(보고서에 명시).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.xml_parser import parse_taxonlist_xml

VALID_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <SpcTxnId>123456</SpcTxnId>
        <SpcScitfNm>Trichiurus japonicus</SpcScitfNm>
        <CommKorNm>갈치</CommKorNm>
        <ClassKR>조기어강</ClassKR>
        <OrderKR>농어목</OrderKR>
        <FamilyKR>갈치과</FamilyKR>
        <FORM>몸은 옆으로 납작하고 길다.</FORM>
        <HABI>연안 및 대륙붕 주변에 서식한다.</HABI>
        <ABST>갈치는 갈치과에 속하는 어류다.</ABST>
        <NADI>한국 전 연안</NADI>
        <INDI>일본, 중국 연근해</INDI>
      </item>
    </items>
    <numOfRows>10</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>1</totalCount>
  </body>
</response>"""

EMPTY_ITEMS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
  <body><items></items><numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>0</totalCount></body>
</response>"""

MULTI_ITEM_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
  <body>
    <items>
      <item><SpcTxnId>1</SpcTxnId><SpcScitfNm>Genus speciesA</SpcScitfNm><CommKorNm>가</CommKorNm></item>
      <item><SpcTxnId>2</SpcTxnId><SpcScitfNm>Genus speciesB</SpcScitfNm><CommKorNm>나</CommKorNm></item>
    </items>
    <numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>2</totalCount>
  </body>
</response>"""


def test_정상_응답_파싱():
    r = parse_taxonlist_xml(VALID_XML)
    assert r.ok
    assert r.result_code == "00"
    assert r.total_count == 1
    assert len(r.items) == 1
    assert r.items[0]["SpcScitfNm"] == "Trichiurus japonicus"
    assert r.items[0]["CommKorNm"] == "갈치"


def test_모든_필드가_그대로_보존된다():
    """하드코딩한 필드 목록만 뽑지 않고, 실제 있는 필드를 전부 담는다."""
    r = parse_taxonlist_xml(VALID_XML)
    assert "NADI" in r.items[0]
    assert "INDI" in r.items[0]
    assert "ABST" in r.items[0]
    assert r.raw_field_names >= {"SpcTxnId", "SpcScitfNm", "CommKorNm", "FORM", "HABI"}


def test_bytes_입력도_처리한다():
    r = parse_taxonlist_xml(VALID_XML.encode("utf-8"))
    assert r.ok
    assert len(r.items) == 1


def test_items가_비어있으면_빈_리스트():
    r = parse_taxonlist_xml(EMPTY_ITEMS_XML)
    assert r.ok
    assert r.items == []
    assert r.total_count == 0


def test_다중_item_파싱():
    r = parse_taxonlist_xml(MULTI_ITEM_XML)
    assert len(r.items) == 2
    assert r.items[0]["CommKorNm"] == "가"
    assert r.items[1]["CommKorNm"] == "나"


def test_빈_응답은_오류로_처리된다():
    r = parse_taxonlist_xml(b"")
    assert not r.ok
    assert r.error is not None


def test_공백만_있는_응답도_오류():
    r = parse_taxonlist_xml("   \n  ")
    assert not r.ok


def test_잘못된_XML은_ParseError를_삼키고_오류로_보고한다():
    r = parse_taxonlist_xml("<response><body>안닫힌태그")
    assert not r.ok
    assert "파싱" in r.error


def test_plaintext_401_응답도_예외없이_처리된다():
    """실측: 인증 실패 시 XML이 아니라 순수 텍스트 'Unauthorized'가 온다."""
    r = parse_taxonlist_xml("Unauthorized")
    assert not r.ok
    assert r.error is not None


def test_header가_없어도_죽지_않는다():
    r = parse_taxonlist_xml("<response><body><items></items></body></response>")
    assert r.ok
    assert r.result_code is None


def test_body가_없어도_죽지_않는다():
    r = parse_taxonlist_xml("<response><header><resultCode>00</resultCode></header></response>")
    assert r.ok
    assert r.items == []


def test_필드값_공백은_None으로_정제된다():
    xml = ('<response><body><items><item><SpcScitfNm>  </SpcScitfNm>'
          '<CommKorNm>갈치</CommKorNm></item></items></body></response>')
    r = parse_taxonlist_xml(xml)
    assert r.items[0]["SpcScitfNm"] is None
    assert r.items[0]["CommKorNm"] == "갈치"


def test_파서는_결정적이다():
    a = parse_taxonlist_xml(VALID_XML)
    b = parse_taxonlist_xml(VALID_XML)
    assert a.items == b.items
    assert a.result_code == b.result_code
