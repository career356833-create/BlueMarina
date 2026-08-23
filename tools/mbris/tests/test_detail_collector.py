"""detail_collector 테스트. 가짜 API 클라이언트로 네트워크 없이 검증한다."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api_client import ApiResult, AUTH_ERROR, EMPTY_RESPONSE
from src.config import MbrisApiConfig
from src.detail_collector import DetailCollector, load_tier_a_candidates, select_best_item
from src.detail_state import COMPLETE, FAILED

VALID_XML = (
    "<response><header><resultCode>00</resultCode></header><body><items>"
    "<item><SpcTxnId>1</SpcTxnId><SpcScitfNm>Genus species</SpcScitfNm>"
    "<CommKorNm>테스트어종</CommKorNm></item>"
    "</items></body></response>"
).encode("utf-8")

ZERO_ITEM_XML = (
    "<response><header><resultCode>00</resultCode></header>"
    "<body><items/><totalCount>0</totalCount></body></response>"
).encode("utf-8")

TWO_ITEM_XML = (
    "<response><header><resultCode>00</resultCode></header><body><items>"
    "<item><SpcTxnId>1</SpcTxnId><SpcScitfNm>Other one</SpcScitfNm><CommKorNm>다른종</CommKorNm></item>"
    "<item><SpcTxnId>2</SpcTxnId><SpcScitfNm>Other two</SpcScitfNm><CommKorNm>다른종2</CommKorNm></item>"
    "</items></body></response>"
).encode("utf-8")


class FakeClient:
    """scientific_name 조회는 지정 결과를, korean_name 재검색은 별도 결과를 낸다."""

    def __init__(self, by_sci=None, by_ko=None):
        self.by_sci = by_sci or {}
        self.by_ko = by_ko or {}
        self.calls = []

    def fetch_species(self, *, spc_txn_id=None, scientific_name=None, korean_name=None,
                      family=None, family_kr=None, page_no=1, num_of_rows=10, client=None):
        self.calls.append({"scientific_name": scientific_name, "korean_name": korean_name})
        if scientific_name is not None:
            return self.by_sci.get(scientific_name, ApiResult(
                ok=False, url="x", error_type=EMPTY_RESPONSE, error_message="no data"))
        if korean_name is not None:
            return self.by_ko.get(korean_name, ApiResult(
                ok=False, url="x", error_type=EMPTY_RESPONSE, error_message="no data"))
        raise AssertionError("scientific_name 또는 korean_name이 있어야 한다")


# --- load_tier_a_candidates ---
def test_유효_후보만_남는다(tmp_path):
    path = tmp_path / "tier-a.json"
    path.write_text(json.dumps([
        {"internalId": "BM-1", "koreanName": "가", "scientificName": "A a"},
        {"internalId": None, "koreanName": "나", "scientificName": "B b"},
        {"internalId": "BM-3", "koreanName": "다", "scientificName": None},
    ], ensure_ascii=False), encoding="utf-8")
    valid, issues = load_tier_a_candidates(path)
    assert [c["internalId"] for c in valid] == ["BM-1"]
    assert len(issues) == 2


def test_중복_internalId는_한번만(tmp_path):
    path = tmp_path / "tier-a.json"
    path.write_text(json.dumps([
        {"internalId": "BM-1", "koreanName": "가", "scientificName": "A a"},
        {"internalId": "BM-1", "koreanName": "가", "scientificName": "A a"},
    ], ensure_ascii=False), encoding="utf-8")
    valid, issues = load_tier_a_candidates(path)
    assert len(valid) == 1
    assert any("중복" in i for i in issues)


def test_국명없어도_유효후보로_남되_기록된다(tmp_path):
    path = tmp_path / "tier-a.json"
    path.write_text(json.dumps([
        {"internalId": "BM-1", "koreanName": None, "scientificName": "A a"},
    ], ensure_ascii=False), encoding="utf-8")
    valid, issues = load_tier_a_candidates(path)
    assert len(valid) == 1
    assert any("koreanName" in i for i in issues)


# --- select_best_item ---
def test_학명_정확일치_단일이면_선택된다():
    item, note = select_best_item([{"SpcScitfNm": "Genus species"}], "Genus species")
    assert item is not None
    assert "정확 일치" in note


def test_학명_정확일치_복수면_None():
    items = [{"SpcScitfNm": "Genus species"}, {"SpcScitfNm": "Genus species"}]
    item, note = select_best_item(items, "Genus species")
    assert item is None


def test_결과없으면_None():
    item, note = select_best_item([], "Genus species")
    assert item is None
    assert "0건" in note


def test_학명불일치_단일결과는_수동검토로_표시되며_선택은_된다():
    item, note = select_best_item([{"SpcScitfNm": "Other name"}], "Genus species")
    assert item is not None
    assert "수동 검토" in note


def test_학명불일치_복수결과는_자동선택하지_않는다():
    items = [{"SpcScitfNm": "Other1"}, {"SpcScitfNm": "Other2"}]
    item, note = select_best_item(items, "Genus species")
    assert item is None


# --- DetailCollector.collect_one ---
def make_collector(tmp_path, client):
    return DetailCollector(
        config=MbrisApiConfig(api_key="k", base_url="https://x.test"),
        raw_detail_dir=tmp_path / "raw", normalized_detail_dir=tmp_path / "norm",
        api_dir=tmp_path / "api", state_path=tmp_path / "state.json", client=client)


def test_성공하면_원본과_정규화파일이_저장되고_상태가_complete(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                    "scientificName": "Genus species"})
    assert status == COMPLETE
    assert (tmp_path / "raw" / "BM-1" / "response.xml").exists()
    assert (tmp_path / "raw" / "BM-1" / "metadata.json").exists()
    assert (tmp_path / "raw" / "BM-1" / "parsed-preview.json").exists()
    assert (tmp_path / "norm" / "BM-1.json").exists()
    detail = json.loads((tmp_path / "norm" / "BM-1.json").read_text(encoding="utf-8"))
    assert detail["basic"]["koreanName"] == "테스트어종"
    st = collector.state.item("BM-1")
    assert st.status == COMPLETE
    assert st.spcTxnId == "1"


def test_학명검색_빈응답이면_국명으로_재시도한다(tmp_path):
    client = FakeClient(
        by_sci={"Genus species": ApiResult(ok=False, url="x", error_type=EMPTY_RESPONSE,
                                           error_message="no data")},
        by_ko={"테스트어종": ApiResult(ok=True, url="x", status_code=200,
                                     body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                    "scientificName": "Genus species"})
    assert status == COMPLETE
    assert len(client.calls) == 2
    assert client.calls[1]["korean_name"] == "테스트어종"


def test_인증실패는_국명재시도없이_바로_실패(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=False, url="x", error_type=AUTH_ERROR, error_message="401")})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                    "scientificName": "Genus species"})
    assert status == FAILED
    assert len(client.calls) == 1  # 국명 재시도 없음
    st = collector.state.item("BM-1")
    assert "auth_error" in st.lastError


def test_이미완료된_항목은_다시_호출하지_않는다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    cand = {"internalId": "BM-1", "koreanName": "테스트어종", "scientificName": "Genus species"}
    collector.collect_one(cand)
    assert len(client.calls) == 1
    status = collector.collect_one(cand)  # 재호출
    assert status == COMPLETE
    assert len(client.calls) == 1  # 늘지 않음 — skip됨


def test_force면_완료항목도_재수집한다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    cand = {"internalId": "BM-1", "koreanName": "테스트어종", "scientificName": "Genus species"}
    collector.collect_one(cand)
    collector.collect_one(cand, force=True)
    assert len(client.calls) == 2


def test_원본_XML은_변경되지_않는다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                           "scientificName": "Genus species"})
    saved = (tmp_path / "raw" / "BM-1" / "response.xml").read_bytes()
    assert saved == VALID_XML


def test_모든_API_호출이_로그에_남는다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                           "scientificName": "Genus species"})
    log_path = tmp_path / "api" / "logs" / "call-log.jsonl"
    assert log_path.exists()
    lines = log_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    entry = json.loads(lines[0])
    assert entry["internalId"] == "BM-1"
    assert "serviceKey" not in entry["params"]  # 키는 로그에 남기지 않는다


# --- 학명검색이 HTTP는 성공했지만 0건을 반환하는 실제 케이스(갯강구로 발견) ---
def test_학명검색_0건이어도_국명재검색으로_매칭되면_성공한다(tmp_path):
    client = FakeClient(
        by_sci={"Genus species": ApiResult(ok=True, url="x", status_code=200,
                                           body=ZERO_ITEM_XML, attempts=1)},
        by_ko={"테스트어종": ApiResult(ok=True, url="x", status_code=200,
                                     body=VALID_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                    "scientificName": "Genus species"})
    assert status == COMPLETE
    assert len(client.calls) == 2
    assert client.calls[1]["korean_name"] == "테스트어종"
    st = collector.state.item("BM-1")
    assert "국명 재검색으로 매칭" in st.lastError if st.lastError else True


def test_학명검색_0건이고_국명재검색도_실패하면_두_이유_모두_기록한다(tmp_path):
    """실제 갯강구(BM-SPECIES-006084) 케이스 재현 — 학명 0건, 국명 재검색은 2건이라
    자동 선택하지 않는다. 실패 사유에 두 시도 결과가 전부 남아야 진단 가능하다."""
    client = FakeClient(
        by_sci={"Genus species": ApiResult(ok=True, url="x", status_code=200,
                                           body=ZERO_ITEM_XML, attempts=1)},
        by_ko={"테스트어종": ApiResult(ok=True, url="x", status_code=200,
                                     body=TWO_ITEM_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                    "scientificName": "Genus species"})
    assert status == FAILED
    st = collector.state.item("BM-1")
    assert "학명검색" in st.lastError
    assert "국명재검색도 실패" in st.lastError


def test_학명검색_0건이고_국명이_없으면_그냥_실패한다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=ZERO_ITEM_XML, attempts=1)})
    collector = make_collector(tmp_path, client)
    status = collector.collect_one({"internalId": "BM-1", "koreanName": None,
                                    "scientificName": "Genus species"})
    assert status == FAILED
    assert len(client.calls) == 1  # 국명이 없으니 재시도 자체를 안 한다


def test_resume_상태파일이_재로드된다(tmp_path):
    client = FakeClient(by_sci={"Genus species": ApiResult(
        ok=True, url="x", status_code=200, body=VALID_XML, attempts=1)})
    collector1 = make_collector(tmp_path, client)
    collector1.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                            "scientificName": "Genus species"})

    collector2 = make_collector(tmp_path, client)  # 새 인스턴스 — 파일에서 재로드
    assert collector2.state.item("BM-1").status == COMPLETE
    status = collector2.collect_one({"internalId": "BM-1", "koreanName": "테스트어종",
                                     "scientificName": "Genus species"})
    assert status == COMPLETE
    assert len(client.calls) == 1  # collector2에서 새 호출 없음(skip)
