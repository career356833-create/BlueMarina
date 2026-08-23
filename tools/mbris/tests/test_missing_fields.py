"""필드 누락 시나리오. 절대 값을 만들어내지 않고 None을 유지하는지 확인한다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_normalizer import normalize_detail
from src.xml_parser import parse_taxonlist_xml


def test_완전히_빈_item은_모든_1차필드가_None():
    d = normalize_detail(internal_id="X", source_id=None, item={}, raw_body=b"")
    assert d["basic"]["koreanName"] is None
    assert d["basic"]["scientificName"] is None
    assert d["taxonomy"]["class"] is None
    assert d["taxonomy"]["order"] is None
    assert d["taxonomy"]["family"] is None
    assert d["taxonomy"]["genus"] is None
    assert d["ecology"]["habitat"] is None
    assert d["ecology"]["form"] is None
    assert d["ecology"]["domesticDistribution"] is None
    assert d["ecology"]["internationalDistribution"] is None


@pytest.mark.parametrize("present_field", [
    "CommKorNm", "SpcScitfNm", "ClassKR", "OrderKR", "FamilyKR",
    "HABI", "FORM", "NADI", "INDI",
])
def test_한_필드만_있어도_나머지는_None으로_유지된다(present_field):
    d = normalize_detail(internal_id="X", source_id=None,
                         item={present_field: "값"}, raw_body=b"")
    flat = {**d["basic"], **d["taxonomy"], **{k: v for k, v in d["ecology"].items() if k != "extra"}}
    none_count = sum(1 for v in flat.values() if v is None)
    assert none_count == len(flat) - 1  # 채워진 필드 1개만 제외하고 전부 None


def test_없는_필드를_빈문자열로_만들지_않는다():
    """빈 문자열과 필드 없음(None)은 다르다 — 혼동하면 '값이 있는데 비어있다'로 오인한다."""
    d = normalize_detail(internal_id="X", source_id=None, item={"CommKorNm": "갈치"}, raw_body=b"")
    assert d["ecology"]["habitat"] is None
    assert d["ecology"]["habitat"] != ""


def test_XML에_해당_요소_자체가_없으면_파서단계에서도_None():
    xml = "<response><body><items><item><CommKorNm>갈치</CommKorNm></item></items></body></response>"
    parsed = parse_taxonlist_xml(xml)
    item = parsed.items[0]
    assert item.get("HABI") is None
    assert "HABI" not in item  # 요소 자체가 없으므로 키도 없다


def test_XML_요소는_있지만_내용이_빈경우도_None():
    xml = ("<response><body><items><item><CommKorNm>갈치</CommKorNm>"
          "<HABI></HABI></item></items></body></response>")
    parsed = parse_taxonlist_xml(xml)
    item = parsed.items[0]
    assert "HABI" in item  # 키는 있다
    assert item["HABI"] is None  # 값은 None (빈 문자열 아님)
    d = normalize_detail(internal_id="X", source_id=None, item=item, raw_body=b"")
    assert d["ecology"]["habitat"] is None


def test_공백만_있는_요소도_None():
    xml = ("<response><body><items><item>"
          "<HABI>   </HABI></item></items></body></response>")
    parsed = parse_taxonlist_xml(xml)
    assert parsed.items[0]["HABI"] is None


def test_extra에도_없는_필드를_지어내지_않는다():
    d = normalize_detail(internal_id="X", source_id=None, item={"CommKorNm": "갈치"}, raw_body=b"")
    assert d["ecology"]["extra"] == {}


def test_genus는_어떤_입력을_줘도_API_응답만으로는_채워지지_않는다():
    """genus는 이 API에 없다는 사실 자체가 핵심 — 어떤 조합을 넣어도 None."""
    d = normalize_detail(internal_id="X", source_id=None,
                         item={"CommKorNm": "갈치", "SpcScitfNm": "Trichiurus japonicus",
                               "ClassKR": "조기어강", "FamilyKR": "갈치과"},
                         raw_body=b"")
    assert d["taxonomy"]["genus"] is None
