"""detail_normalizer 테스트. 원본 필드를 잃지 않는지, 빈 필드를 안전하게 다루는지 확인.

§4 스키마 개정: growth/spawning/prey/poison/migration/lifetime은 이 API에
대응 필드가 없어 제거됐다. habitat/form/domesticDistribution/internationalDistribution만
1차 스키마 필드로 남는다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_normalizer import normalize_detail, REMOVED_NO_MATCH_FIELDS

ITEM = {
    "SpcTxnId": "123456",
    "SpcScitfNm": "Trichiurus japonicus",
    "CommKorNm": "갈치",
    "ClassKR": "조기어강",
    "OrderKR": "농어목",
    "FamilyKR": "갈치과",
    "FORM": "몸은 옆으로 납작하고 길다.",
    "HABI": "연안 및 대륙붕 주변에 서식한다.",
    "ABST": "갈치과에 속하는 어류다.",
    "NADI": "한국 전 연안",
    "INDI": "일본, 중국 연근해",
    "UTLZ": "식용으로 이용된다.",
}
ENDPOINT = "https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3"


def test_기본_필드가_매핑된다():
    d = normalize_detail(internal_id="BM-SPECIES-000444", source_id="123456",
                         item=ITEM, raw_body=b"<x/>", api_endpoint=ENDPOINT)
    assert d["basic"]["koreanName"] == "갈치"
    assert d["basic"]["scientificName"] == "Trichiurus japonicus"
    assert d["taxonomy"]["class"] == "조기어강"
    assert d["taxonomy"]["order"] == "농어목"
    assert d["taxonomy"]["family"] == "갈치과"


def test_생태_1차필드_4개가_매핑된다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["ecology"]["habitat"] == ITEM["HABI"]
    assert d["ecology"]["form"] == ITEM["FORM"]
    assert d["ecology"]["domesticDistribution"] == ITEM["NADI"]
    assert d["ecology"]["internationalDistribution"] == ITEM["INDI"]


def test_제거된_필드는_결과에_아예_없다():
    """growth 등은 None으로도 남지 않고 스키마에서 완전히 빠졌다."""
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    for field in REMOVED_NO_MATCH_FIELDS:
        assert field not in d["ecology"]


def test_genus는_API에_없어_항상_None이다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["taxonomy"]["genus"] is None


def test_요청스키마에_없는_실제필드는_extra에_보존된다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["ecology"]["extra"]["overview"] == ITEM["ABST"]
    assert d["ecology"]["extra"]["utilization"] == ITEM["UTLZ"]
    assert "domesticDistribution" not in d["ecology"]["extra"]  # 1차 필드로 승격됐으므로 중복 없음


def test_apiEndpoint가_source에_기록된다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>",
                         api_endpoint=ENDPOINT)
    assert d["source"]["apiEndpoint"] == ENDPOINT


def test_apiEndpoint_생략시_빈문자열():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["source"]["apiEndpoint"] == ""


def test_원본_필드_전체가_무손실_보존된다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["rawApiFields"] == ITEM


def test_원본_item_딕셔너리는_변경되지_않는다():
    item_copy = dict(ITEM)
    normalize_detail(internal_id="X", source_id=None, item=item_copy, raw_body=b"<x/>")
    assert item_copy == ITEM


def test_빈_item도_예외없이_처리된다():
    d = normalize_detail(internal_id="X", source_id=None, item={}, raw_body=b"<x/>")
    assert d["basic"]["koreanName"] is None
    assert d["basic"]["scientificName"] is None
    assert d["ecology"]["habitat"] is None
    assert d["ecology"]["extra"] == {}


def test_sourceId는_인자가_있으면_우선하고_없으면_item에서_가져온다():
    d1 = normalize_detail(internal_id="X", source_id="999", item=ITEM, raw_body=b"<x/>")
    assert d1["sourceId"] == "999"
    d2 = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d2["sourceId"] == "123456"


def test_responseHash는_raw_body의_sha256이다():
    import hashlib
    body = b"<response>test</response>"
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=body)
    assert d["source"]["responseHash"] == hashlib.sha256(body).hexdigest()


def test_reviewStatus는_항상_pending이다():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["reviewStatus"] == "pending"


def test_sourceProvider는_MBRIS_고정():
    d = normalize_detail(internal_id="X", source_id=None, item=ITEM, raw_body=b"<x/>")
    assert d["sourceProvider"] == "MBRIS"


def test_결정적이다():
    """collectedAt은 호출 시각이라 자연히 달라지므로 고정값을 넘겨 나머지를 비교한다."""
    a = normalize_detail(internal_id="X", source_id="1", item=ITEM, raw_body=b"<x/>",
                         collected_at="2026-01-01T00:00:00+00:00")
    b = normalize_detail(internal_id="X", source_id="1", item=ITEM, raw_body=b"<x/>",
                         collected_at="2026-01-01T00:00:00+00:00")
    assert a == b
