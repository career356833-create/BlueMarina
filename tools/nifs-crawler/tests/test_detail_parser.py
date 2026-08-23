"""detail_parser 단위 테스트. 네트워크를 쓰지 않는다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_parser import clean_text, parse_detail, COLOR_LEVEL_LABEL

FID = "fish_1576045793538"


def make_payload(**over):
    base = {
        "retMap": {
            "fishId": FID,
            "fishName": "꽃게",
            "fishNameEn": "Swimming crab",
            "scName": "Portunus trituberculatus",
            "infoShape": "갑각은 옆으로 퍼진 마름모꼴이고,<br/>이마에 돌기가 있다.",
            "infoDistribution": "서해 및 남해",
            "infoGrowth": "수명은 대략 3년",
            "infoDialect": "꽃그이, 날개꽃게",
            "infoCatch": "연안자망(50%)",
            "infoCookHow": "74 Kcal/100g",
            "infoEat": "NA",
            "prohibitSize": "6.4",
            "recommendSize": "10",
        },
        "imgList": [{"fileName": "a.jpg"}, {"fileName": "b.jpg"}],
        "periodList": [{"month": 6, "colorLevel": "2"}],
        "historyList": [{"year": "2000", "catchAverage": "12842"}],
    }
    base.update(over)
    return base


def test_정상_응답_파싱():
    p = parse_detail(FID, make_payload(), expected_name="꽃게")
    assert p.ok
    assert p.korean_name == "꽃게"
    assert p.fields["scientificName"] == "Portunus trituberculatus"
    assert len(p.images) == 2
    assert p.images[0]["sourceUrl"].endswith("/a.jpg")
    assert p.catch_history == [{"year": "2000", "catchAverage": "12842"}]


def test_br태그가_줄바꿈으로_정제된다():
    p = parse_detail(FID, make_payload())
    assert "\n" in p.fields["feature"]
    assert "<br" not in p.fields["feature"]


def test_NA는_None으로_처리된다():
    p = parse_detail(FID, make_payload())
    assert p.fields["eatingNote"] is None


def test_소비권장등급_라벨이_붙는다():
    p = parse_detail(FID, make_payload())
    assert p.recommend_period[0]["label"] == COLOR_LEVEL_LABEL["2"] == "지양"


def test_retMap_null이면_실패로_보고된다():
    """폼 인코딩이 아닌 JSON으로 요청했을 때 서버가 반환하는 형태."""
    p = parse_detail(FID, {"retMap": None, "imgList": [], "periodList": [], "historyList": []})
    assert not p.ok
    assert p.field_count == 0
    assert any("retMap" in e for e in p.errors)


def test_빈_응답도_예외를_던지지_않는다():
    p = parse_detail(FID, {})
    assert not p.ok
    assert p.errors


def test_fishName_불일치_탐지():
    p = parse_detail(FID, make_payload(), expected_name="갈치")
    assert not p.ok
    assert any("fishName 불일치" in e for e in p.errors)


def test_fishId_불일치_탐지():
    payload = make_payload()
    payload["retMap"]["fishId"] = "fish_other"
    p = parse_detail(FID, payload, expected_name="꽃게")
    assert not p.ok
    assert any("fishId 불일치" in e for e in p.errors)


def test_필드가_모두_비면_성공으로_기록되지_않는다():
    payload = make_payload()
    payload["retMap"] = {"fishId": FID}
    p = parse_detail(FID, payload)
    assert not p.ok
    assert p.field_count == 0


@pytest.mark.parametrize("raw,expected", [
    (None, None), ("", None), ("NA", None), ("  -  ", None),
    ("a&nbsp;b", "a b"), ("<p>x</p>", "x"),
])
def test_clean_text(raw, expected):
    assert clean_text(raw) == expected


def test_파서는_결정적이다():
    a = parse_detail(FID, make_payload(), expected_name="꽃게")
    b = parse_detail(FID, make_payload(), expected_name="꽃게")
    assert a.fields == b.fields
    assert a.images == b.images
