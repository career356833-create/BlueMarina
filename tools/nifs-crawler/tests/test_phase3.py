"""Phase 3 — 전체 수집·정규화·상태·검증 테스트. 모두 fixture 기반, 네트워크 미사용."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src import validator
from src.normalizer import (
    normalize_fish, normalize_period, normalize_history, normalize_size,
    omitted_months, source_field_record, PERIOD_OMITTED_MEANING,
)
from src.image_client import mark_duplicates, detail_role, ROLE_DETAIL_PRIMARY, ROLE_DETAIL_SECONDARY
from src.state import CrawlState, ItemState, COMPLETE, FAILED, PARTIAL, archive_if_changed
from src import paths as paths_mod

FID = "fish_1576045793538"


def build(payload, list_row=None, images=None):
    return normalize_fish(
        source_id=FID,
        list_row=list_row or {"fishId": FID, "fishName": "꽃게", "colorLevel": "2", "display": "Y"},
        payload=payload, images=images or [],
        collected_at="2026-07-31T00:00:00+00:00", content_hash="deadbeef",
        parser_version="nifs-detail-v1.0.0")


# ---------------------------------------------------------------- 목록
def test_목록은_25종이고_중복이_없다(list_rows):
    v = validator.validate_list(list_rows)
    assert v["totalCount"] == 25
    assert v["countMatches"]
    assert v["duplicateIds"] == []
    assert v["duplicateNames"] == []
    assert v["emptyIds"] == 0 and v["emptyNames"] == 0


def test_목록_중복ID를_탐지한다(list_rows):
    dup = list_rows + [list_rows[0]]
    v = validator.validate_list(dup)
    assert v["duplicateIds"] == [list_rows[0]["fishId"]]
    assert not v["countMatches"]


# ---------------------------------------------------------------- 상세
def test_상세_정규화가_핵심필드를_채운다(detail_payload):
    rec = build(detail_payload)
    assert rec["koreanName"] == "꽃게"
    assert rec["scientificName"] == "Portunus trituberculatus"
    assert rec["nutrition"] and "Kcal" in rec["nutrition"]
    assert rec["factReviewStatus"] == "pending"
    assert rec["sourceProvider"] == "NIFS"


def test_infoCookHow는_조리법이_아니라_영양정보로_매핑된다(detail_payload):
    rec = build(detail_payload)
    assert "cookingMethod" not in rec
    assert rec["nutrition"] == build(detail_payload)["nutrition"]
    raw = detail_payload["retMap"]["infoCookHow"]
    assert "Kcal" in raw  # 원본이 실제로 영양 정보임을 고정


def test_원본키와_매핑을_함께_보존한다(detail_payload):
    rec = source_field_record(FID, detail_payload)
    assert "infoCookHow" in rec["sourceFields"]["rawApiKeys"]
    assert rec["sourceFields"]["mappedFields"]["infoCookHow"]["normalizedField"] == "nutrition"
    assert rec["sourceFields"]["mappedFields"]["infoCookHow"]["screenLabel"] == "영양 정보"


def test_NA는_설명으로_저장되지_않는다(detail_payload_na):
    assert detail_payload_na["retMap"]["infoEat"] == "NA"
    rec = build(detail_payload_na, list_row={"fishId": FID, "fishName": "갈치"})
    assert rec["eatingNote"] is None
    assert rec["eatingNoteMissing"]["sourceValue"] == "NA"
    assert rec["eatingNoteMissing"]["missingReason"] == "source_na"


# ------------------------------------------------------------ 월별 정보
def test_월값이_유효하고_정렬된다(detail_payload):
    rec = build(detail_payload)
    months = [p["month"] for p in rec["recommendPeriod"]]
    assert all(1 <= m <= 12 for m in months)
    assert months == sorted(months)
    assert len(months) == len(set(months))


def test_등급라벨이_붙는다(detail_payload):
    rec = build(detail_payload)
    assert {p["displayLabel"] for p in rec["recommendPeriod"]} <= {"권장", "자제", "지양"}


def test_응답에_없는_월은_권장을_뜻한다(detail_payload_empty_period):
    """periodList가 비면 12개월 전부 권장이다. 데이터 누락이 아니다."""
    assert detail_payload_empty_period["periodList"] == []
    rec = build(detail_payload_empty_period,
                list_row={"fishId": FID, "fishName": "갯장어", "colorLevel": "0"})
    assert rec["recommendPeriod"] == []
    assert rec["recommendPeriodOmittedMonths"] == list(range(1, 13))
    assert rec["recommendPeriodOmittedMeaning"] == PERIOD_OMITTED_MEANING == "권장"


def test_누락월_계산(detail_payload):
    omitted = omitted_months(detail_payload["periodList"])
    present = {p["month"] for p in detail_payload["periodList"]}
    assert set(omitted).isdisjoint(present)
    assert len(omitted) + len(present) == 12


def test_잘못된_월과_중복월을_검증에서_잡는다():
    payload = {"retMap": {"fishName": "x"}, "periodList": [], "historyList": []}
    rec = build(payload)
    rec["recommendPeriod"] = [{"month": 13, "recommendationLevel": "1"},
                              {"month": 5, "recommendationLevel": "1"},
                              {"month": 5, "recommendationLevel": "2"}]
    v = validator.validate_detail(FID, {"fishName": "x"}, payload, rec)
    assert any("잘못된 월" in i for i in v["issues"])
    assert any("중복 월" in i for i in v["issues"])


# ------------------------------------------------------------ 어획 이력
def test_어획연도가_정렬되고_중복이_없다(detail_payload):
    rec = build(detail_payload)
    years = [h["year"] for h in rec["catchHistory"]]
    assert years == sorted(years)
    assert len(years) == len(set(years))
    assert all(1900 < y < 2100 for y in years)


def test_단위는_출처에_없으므로_null이다(detail_payload):
    rec = build(detail_payload)
    assert all(h["unit"] is None for h in rec["catchHistory"])
    assert "unit" not in detail_payload["historyList"][0]


def test_어획량_원본값을_보존한다(detail_payload):
    rec = build(detail_payload)
    first = rec["catchHistory"][0]
    assert first["sourceValue"] == {k: v for k, v in
                                    min(detail_payload["historyList"],
                                        key=lambda h: int(h["year"])).items()}


def test_숫자가_아닌_어획량은_None이고_원본은_남는다():
    rec = normalize_history([{"year": "2001", "catchAverage": "-"}])
    assert rec[0]["catchAmount"] is None
    assert rec[0]["sourceValue"]["catchAverage"] == "-"


def test_0과_누락은_구분된다():
    rec = normalize_history([{"year": "2001", "catchAverage": "0"},
                             {"year": "2002", "catchAverage": None}])
    assert rec[0]["catchAmount"] == 0.0
    assert rec[1]["catchAmount"] is None


def test_체장_0은_값없음으로_처리된다():
    assert normalize_size("0") is None
    assert normalize_size(0) is None
    assert normalize_size("6.4") == 6.4
    assert normalize_size("NA") is None


# ---------------------------------------------------------------- 이미지
def test_중복해시를_탐지하고_첫항목을_원본으로_둔다():
    metas = [
        {"sourceFileName": "a.jpg", "sha256": "H1", "isDuplicate": False, "duplicateOf": None},
        {"sourceFileName": "b.jpg", "sha256": "H1", "isDuplicate": False, "duplicateOf": None},
        {"sourceFileName": "c.jpg", "sha256": "H2", "isDuplicate": False, "duplicateOf": None},
    ]
    out = mark_duplicates(metas)
    assert out[0]["isDuplicate"] is False
    assert out[1]["isDuplicate"] is True and out[1]["duplicateOf"] == "a.jpg"
    assert out[2]["isDuplicate"] is False


def test_해시없는_실패이미지는_중복판정에서_제외된다():
    metas = [{"sourceFileName": "a.jpg", "sha256": None, "isDuplicate": False, "duplicateOf": None},
             {"sourceFileName": "b.jpg", "sha256": None, "isDuplicate": False, "duplicateOf": None}]
    out = mark_duplicates(metas)
    assert not any(m["isDuplicate"] for m in out)


def test_워터마크는_파일명으로만_판정한다():
    from src.image_client import WATERMARK_MARKER
    assert WATERMARK_MARKER in "MF0004253_DG0102_watermark.jpg"
    assert WATERMARK_MARKER not in "fish_123_456.jpg"


def test_상세이미지_역할은_순서로만_정한다():
    assert detail_role(0) == ROLE_DETAIL_PRIMARY
    assert detail_role(1) == ROLE_DETAIL_SECONDARY
    assert detail_role(5) == ROLE_DETAIL_SECONDARY


def test_실제_이미지메타에_역할과_해시가_있다():
    metas = json.loads((Path(__file__).parent / "fixtures" / "images-꽃게.json")
                       .read_text(encoding="utf-8"))
    assert metas, "fixture가 비어 있다"
    assert all(m["sourceRole"] in
               {"list_thumbnail", "detail_primary", "detail_secondary", "unknown"}
               for m in metas)
    assert all(m["sha256"] for m in metas if m["isValid"])


# ----------------------------------------------------------- 상태·resume
def test_완료항목은_건너뛴다():
    st = CrawlState()
    a = st.item("f1", "갈치"); a.detailStatus = COMPLETE
    st.item("f2", "고등어")
    pending = [s.sourceId for s in st.pending_details()]
    assert pending == ["f2"]


def test_force면_완료항목도_대상에_포함된다():
    st = CrawlState()
    st.item("f1").detailStatus = COMPLETE
    assert [s.sourceId for s in st.pending_details(force=True)] == ["f1"]


def test_실패항목만_재시도대상이다():
    st = CrawlState()
    st.item("f1").detailStatus = COMPLETE
    st.item("f2").detailStatus = FAILED
    st.item("f3").imageStatus = FAILED
    assert {s.sourceId for s in st.failed_items()} == {"f2", "f3"}


def test_상태_저장과_로드가_왕복한다(tmp_path):
    st = CrawlState()
    it = st.item("f1", "갈치")
    it.detailStatus = COMPLETE
    it.attemptCount = 2
    it.lastError = "timeout"
    p = tmp_path / "state.json"
    st.save(p)
    back = CrawlState.load(p)
    assert back.items["f1"].detailStatus == COMPLETE
    assert back.items["f1"].attemptCount == 2
    assert back.items["f1"].lastError == "timeout"


def test_상태파일이_없으면_빈상태로_시작한다(tmp_path):
    assert CrawlState.load(tmp_path / "nope.json").items == {}


def test_partial은_완료가_아니다():
    it = ItemState(sourceId="f1", detailStatus=COMPLETE,
                   imageStatus=PARTIAL, normalizationStatus=COMPLETE)
    assert not it.is_done()
    assert it.is_retryable()


# ------------------------------------------------------- 원본 버전 보존
def test_원본이_바뀌면_기존파일을_versions로_보존한다(tmp_path, monkeypatch):
    monkeypatch.setattr(paths_mod, "VERSIONS", tmp_path / "versions")
    target = tmp_path / "detail-response.json"
    target.write_bytes(b'{"v":1}')
    moved = archive_if_changed("f1", target, b'{"v":2}')
    assert moved is not None and moved.exists()
    assert moved.read_bytes() == b'{"v":1}'  # 옛 내용이 보존됨


def test_내용이_같으면_버전을_만들지_않는다(tmp_path, monkeypatch):
    monkeypatch.setattr(paths_mod, "VERSIONS", tmp_path / "versions")
    target = tmp_path / "d.json"
    target.write_bytes(b'{"v":1}')
    assert archive_if_changed("f1", target, b'{"v":1}') is None


def test_파일이_없으면_버전을_만들지_않는다(tmp_path, monkeypatch):
    monkeypatch.setattr(paths_mod, "VERSIONS", tmp_path / "versions")
    assert archive_if_changed("f1", tmp_path / "absent.json", b"x") is None


# --------------------------------------------------------- 원본/정규화 분리
def test_raw와_normalized는_다른_경로다():
    assert paths_mod.RAW_FISH != paths_mod.NORMALIZED_FISH
    assert "raw" in paths_mod.RAW_FISH.parts
    assert "normalized" in paths_mod.NORMALIZED_FISH.parts


def test_정규화결과에_원본추적정보가_있다(detail_payload):
    rec = build(detail_payload)
    for k in ("sourceUrl", "sourceCollectedAt", "sourceContentHash", "parserVersion"):
        assert rec[k], f"{k}가 비어 있다"


# ---------------------------------------------------------------- 검증기
def test_retMap이_없으면_검증에_실패한다():
    payload = {"retMap": None, "imgList": [], "periodList": [], "historyList": []}
    rec = build(payload)
    v = validator.validate_detail(FID, {"fishName": "꽃게"}, payload, rec)
    assert not v["passed"]
    assert any("retMap" in i for i in v["issues"])


def test_이름불일치를_잡는다(detail_payload):
    rec = build(detail_payload)
    v = validator.validate_detail(FID, {"fishName": "갈치"}, detail_payload, rec)
    assert not v["passed"]
    assert any("이름 불일치" in i for i in v["issues"])


def test_이미지가_없으면_지적한다(detail_payload):
    rec = build(detail_payload, images=[])
    v = validator.validate_detail(FID, {"fishName": "꽃게"}, detail_payload, rec)
    assert any("이미지 0개" in i for i in v["issues"])


def test_정상건은_통과한다(detail_payload):
    images = [{"sha256": "H", "isValid": True, "isDuplicate": False}]
    rec = build(detail_payload, images=images)
    v = validator.validate_detail(FID, {"fishName": "꽃게"}, detail_payload, rec)
    assert v["passed"], v["issues"]


def test_집계가_필드존재수를_센다(detail_payload):
    images = [{"sha256": "H", "isValid": True, "isDuplicate": False, "fileSize": 10}]
    rec = build(detail_payload, images=images)
    d = validator.validate_detail(FID, {"fishName": "꽃게"}, detail_payload, rec)
    agg = validator.aggregate([d], [rec])
    assert agg["detailPassed"] == 1
    assert agg["fieldPresence"]["koreanName"] == 1
    assert agg["images"]["total"] == 1
    assert agg["catchHistory"]["unit"] is None


def test_파서는_결정적이다(detail_payload):
    assert build(detail_payload) == build(detail_payload)
