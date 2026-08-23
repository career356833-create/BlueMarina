"""Tier A 5종(갈치·고등어·참돔·주꾸미·꽃게) 실제 API 응답 fixture 검증.

test_real_response_mapping.py와 다른 목적이다 — 그 파일은 "지금 이 순간 API를
호출해서 성공하는가"(라이브 게이트)를 확인하고, 이 파일은 "2026-08-03에 실제로
저장해 둔 fixture(data/mbris/raw/detail/*/response.xml)가 항상 동일하게
재현되는가"(저장된 원본 기준 결정성)를 확인한다. API 키가 없어도 이 테스트는
항상 돈다 — 이미 저장된 실제 응답 파일만 읽기 때문이다.
"""
import hashlib
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_collector import select_best_item
from src.detail_normalizer import normalize_detail
from src.xml_parser import parse_taxonlist_xml

ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_DETAIL = ROOT / "data" / "mbris" / "raw" / "detail"
NORMALIZED_DETAIL = ROOT / "data" / "mbris" / "normalized" / "detail"

SAMPLE_5 = [
    ("BM-SPECIES-000444", "갈치", "Trichiurus japonicus"),
    ("BM-SPECIES-000417", "고등어", "Scomber japonicus"),
    ("BM-SPECIES-000755", "참돔", "Pagrus major"),
    ("BM-SPECIES-003107", "주꾸미", "Amphioctopus fangsiao"),
    ("BM-SPECIES-005640", "꽃게", "Portunus trituberculatus"),
]

_FIXTURES_EXIST = all((RAW_DETAIL / iid / "response.xml").exists() for iid, _, _ in SAMPLE_5)
pytestmark = pytest.mark.skipif(
    not _FIXTURES_EXIST,
    reason="실제 fixture(data/mbris/raw/detail/*/response.xml)가 없다 — "
           "collect_mbris_detail.py --names 갈치,고등어,참돔,주꾸미,꽃게 로 먼저 수집할 것")


def load_fixture(internal_id: str) -> bytes:
    return (RAW_DETAIL / internal_id / "response.xml").read_bytes()


def load_metadata(internal_id: str) -> dict:
    return json.loads((RAW_DETAIL / internal_id / "metadata.json").read_text(encoding="utf-8"))


# --- 실제 XML 재현 ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_저장된_fixture를_다시_읽어도_바이트가_동일하다(internal_id, ko, sci):
    b1 = load_fixture(internal_id)
    b2 = load_fixture(internal_id)
    assert b1 == b2
    assert len(b1) > 0


# --- parser 동일 결과 ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_parser는_동일_fixture에_대해_항상_동일한_결과를_낸다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    p1 = parse_taxonlist_xml(raw)
    p2 = parse_taxonlist_xml(raw)
    assert p1.ok and p2.ok
    assert p1.items == p2.items
    assert p1.result_code == p2.result_code == "00"
    assert p1.result_msg == p2.result_msg == "Normal Code"


@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_parser가_실제_국명_학명을_정확히_뽑는다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    parsed = parse_taxonlist_xml(raw)
    assert len(parsed.items) == 1
    item = parsed.items[0]
    assert item["CommKorNm"] == ko
    assert item["SpcScitfNmShort"] == sci


# --- normalizer 동일 결과 ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_normalizer는_동일_fixture에_대해_항상_동일한_결과를_낸다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    parsed = parse_taxonlist_xml(raw)
    item, note = select_best_item(parsed.items, sci)
    assert item is not None, note

    d1 = normalize_detail(internal_id=internal_id, source_id=item.get("SpcTxnId"),
                          item=item, raw_body=raw, collected_at="FIXED")
    d2 = normalize_detail(internal_id=internal_id, source_id=item.get("SpcTxnId"),
                          item=item, raw_body=raw, collected_at="FIXED")
    assert d1 == d2


@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_normalizer_결과가_실제_저장된_normalized_detail과_일치한다(internal_id, ko, sci):
    """collect_mbris_detail.py가 이미 저장해 둔 data/mbris/normalized/detail/{id}.json과
    지금 다시 계산한 결과가 같아야 한다 — 파이프라인 재현성 확인."""
    raw = load_fixture(internal_id)
    parsed = parse_taxonlist_xml(raw)
    item, note = select_best_item(parsed.items, sci)
    assert item is not None, note

    saved = json.loads((NORMALIZED_DETAIL / f"{internal_id}.json").read_text(encoding="utf-8"))
    recomputed = normalize_detail(internal_id=internal_id, source_id=item.get("SpcTxnId"),
                                  item=item, raw_body=raw,
                                  api_endpoint=saved["source"]["apiEndpoint"],
                                  collected_at=saved["source"]["collectedAt"])
    assert recomputed == saved


# --- 학명 매칭: SpcScitfNmShort 기준으로 정확 일치(수동검토 오탐 없음) ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_실제_응답에서_학명_매칭이_수동검토_없이_정확히_일치한다(internal_id, ko, sci):
    """select_best_item 수정 전에는 SpcScitfNm(권위자 포함)과 비교해 5종 전부
    '학명 불일치 — 수동 검토 권장'으로 잘못 표시됐다. 실제 fixture로 회귀 확인."""
    raw = load_fixture(internal_id)
    parsed = parse_taxonlist_xml(raw)
    item, note = select_best_item(parsed.items, sci)
    assert item is not None
    assert note == "학명 정확 일치(단일, SpcScitfNmShort 기준)", note


# --- hash 결정성 ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_metadata의_responseHash가_실제_fixture_해시와_일치한다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    meta = load_metadata(internal_id)
    assert meta["responseHash"] == hashlib.sha256(raw).hexdigest()


@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_hash는_재계산해도_항상_동일하다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    h1 = hashlib.sha256(raw).hexdigest()
    h2 = hashlib.sha256(raw).hexdigest()
    assert h1 == h2


# --- 없는 필드는 null(추측 채움 금지) ---
@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_growth_spawning_prey_poison_migration_lifetime은_어디에도_없다(internal_id, ko, sci):
    raw = load_fixture(internal_id)
    parsed = parse_taxonlist_xml(raw)
    removed = {"growth", "spawning", "prey", "poison", "migration", "lifetime"}
    assert removed.isdisjoint({f.lower() for f in parsed.raw_field_names})

    d = json.loads((NORMALIZED_DETAIL / f"{internal_id}.json").read_text(encoding="utf-8"))
    assert removed.isdisjoint(set(d["ecology"].keys()))
    assert removed.isdisjoint(set(d["basic"].keys()))


@pytest.mark.parametrize("internal_id,ko,sci", SAMPLE_5)
def test_HABI가_비어있으면_habitat이_null이지_추측값이_아니다(internal_id, ko, sci):
    """5종 실응답 전부 HABI가 비어 있었다(§4 검증 결과) — null 유지 확인."""
    d = json.loads((NORMALIZED_DETAIL / f"{internal_id}.json").read_text(encoding="utf-8"))
    assert d["ecology"]["habitat"] is None


# --- 이미지 필드 없음(§6) ---
def test_5종_전부_이미지_관련_필드가_없다():
    image_keywords = ("image", "img", "photo", "picture", "thumbnail", "url", "attach")
    for internal_id, _ko, _sci in SAMPLE_5:
        raw = load_fixture(internal_id)
        parsed = parse_taxonlist_xml(raw)
        suspects = [f for f in parsed.raw_field_names if any(k in f.lower() for k in image_keywords)]
        assert suspects == [], (internal_id, suspects)


# --- 5종 전부 성공, internalId 일관성 ---
def test_5종_전부_raw_normalized_파일이_존재한다():
    for internal_id, _ko, _sci in SAMPLE_5:
        assert (RAW_DETAIL / internal_id / "response.xml").exists()
        assert (RAW_DETAIL / internal_id / "metadata.json").exists()
        assert (RAW_DETAIL / internal_id / "parsed-preview.json").exists()
        assert (NORMALIZED_DETAIL / f"{internal_id}.json").exists()


def test_5종_학명이_서로_다르다():
    names = [sci for _iid, _ko, sci in SAMPLE_5]
    assert len(names) == len(set(names))
