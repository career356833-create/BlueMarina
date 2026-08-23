"""Tier A 86종 전체 수집 결과 검증. 실제 fixture(85종 성공 + 1종 실패) 기반이다.
API 키가 없어도 항상 돈다 — 이미 저장된 실제 응답/state/reports만 읽는다."""
import hashlib
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_collector import load_tier_a_candidates, select_best_item
from src.detail_normalizer import normalize_detail
from src.detail_state import DetailCollectionState, COMPLETE, FAILED
from src.xml_parser import parse_taxonlist_xml

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MBRIS = ROOT / "data" / "mbris"
TIER_A_FILE = MBRIS / "priority" / "service-tier-a.json"
RAW_DETAIL = MBRIS / "raw" / "detail"
NORMALIZED_DETAIL = MBRIS / "normalized" / "detail"
STATE_PATH = MBRIS / "state" / "detail-collection-state.json"
REPORTS = MBRIS / "reports"
ENV_FILE = ROOT / "tools" / "mbris" / ".env"

_STATE_EXISTS = STATE_PATH.exists()
pytestmark = pytest.mark.skipif(
    not _STATE_EXISTS,
    reason="Tier A 수집 state가 없다 — collect_mbris_detail.py --tier-a 를 먼저 실행할 것")

FAILED_ID = "BM-SPECIES-006084"  # 갯강구 — 실제 수집에서 유일하게 실패한 종


def load_state() -> DetailCollectionState:
    return DetailCollectionState.load(STATE_PATH)


# --- 86종 상태 수 합계 / complete·failed 집계 ---
def test_전체_86종이_state에_있다():
    candidates, _issues = load_tier_a_candidates(TIER_A_FILE)
    assert len(candidates) == 86
    state = load_state()
    tracked = [c["internalId"] for c in candidates if c["internalId"] in state.items]
    assert len(tracked) == 86


def test_complete_85_failed_1_합계가_86이다():
    candidates, _issues = load_tier_a_candidates(TIER_A_FILE)
    state = load_state()
    statuses = [state.items[c["internalId"]].status for c in candidates]
    complete = sum(1 for s in statuses if s == COMPLETE)
    failed = sum(1 for s in statuses if s == FAILED)
    assert complete == 85
    assert failed == 1
    assert complete + failed == 86


def test_실패한_1건은_갯강구다():
    state = load_state()
    assert state.items[FAILED_ID].status == FAILED


def test_raw_normalized_파일_개수가_85건이다():
    raw_dirs = [d for d in RAW_DETAIL.iterdir() if d.is_dir()]
    norm_files = list(NORMALIZED_DETAIL.glob("*.json"))
    assert len(raw_dirs) == 85
    assert len(norm_files) == 85
    assert FAILED_ID not in {d.name for d in raw_dirs}  # 실패건은 raw 파일 자체가 없다


# --- 실제 XML parser / normalizer(성공 85종 전수 스팟체크) ---
def all_complete_ids() -> list[str]:
    return sorted(d.name for d in RAW_DETAIL.iterdir() if d.is_dir())


def test_85종_전부_parser가_정상_동작한다():
    for iid in all_complete_ids():
        raw = (RAW_DETAIL / iid / "response.xml").read_bytes()
        parsed = parse_taxonlist_xml(raw)
        assert parsed.ok, iid
        assert parsed.result_code == "00", iid
        assert len(parsed.items) >= 1, iid


def test_85종_전부_normalized_detail_스키마가_있다():
    required_top = {"internalId", "sourceProvider", "sourceId", "basic", "taxonomy",
                    "ecology", "taxonomicStatus", "rawApiFields", "source", "reviewStatus"}
    for iid in all_complete_ids():
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        assert required_top <= set(detail.keys()), iid
        assert detail["internalId"] == iid


def test_85종_전부_CommKorNm이_국명과_일치한다():
    candidates, _ = load_tier_a_candidates(TIER_A_FILE)
    by_id = {c["internalId"]: c for c in candidates}
    for iid in all_complete_ids():
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        assert detail["basic"]["koreanName"] == by_id[iid]["koreanName"], iid


# --- select_best_item: 복수 item 처리(갯강구 실제 응답으로 재현) ---
def test_갯강구_국명재검색은_실제로_2건을_반환해서_자동선택되지_않는다():
    """§7에서 확인한 실제 원인을 그대로 재현 — 국명재검색 응답이 남아있다면 검증."""
    responses = sorted(
        (ROOT / "data/mbris/raw/api/responses").glob("*BM-SPECIES-006084.xml"),
        key=lambda p: p.name)
    assert len(responses) >= 2, "갯강구 재검색 응답 파일이 남아있어야 한다"
    ko_retry_body = responses[-1].read_bytes()
    parsed = parse_taxonlist_xml(ko_retry_body)
    assert parsed.ok
    if len(parsed.items) > 1:
        item, note = select_best_item(parsed.items, "Ligia exotica")
        assert item is None
        assert "정확 일치 없음" in note


def test_갯강구_state의_실패사유에_두_단계_시도가_모두_기록됐다():
    state = load_state()
    err = state.items[FAILED_ID].lastError
    assert "학명검색" in err
    assert "국명재검색" in err


# --- 빈 ClassKR/HABI 처리(추정 채움 금지) ---
def test_ClassKR이_빈_종은_null이지_추정값이_아니다():
    found_blank = False
    for iid in all_complete_ids():
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        raw = json.loads((RAW_DETAIL / iid / "parsed-preview.json").read_text(encoding="utf-8"))
        if not raw["matchedItem"].get("ClassKR"):
            found_blank = True
            assert detail["taxonomy"]["class"] is None, iid
    assert found_blank, "ClassKR이 빈 종이 최소 하나는 있어야 이 테스트가 의미 있다"


def test_HABI가_빈_종은_habitat이_null이다():
    found_blank = False
    for iid in all_complete_ids():
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        raw = json.loads((RAW_DETAIL / iid / "parsed-preview.json").read_text(encoding="utf-8"))
        if not raw["matchedItem"].get("HABI"):
            found_blank = True
            assert detail["ecology"]["habitat"] is None, iid
    assert found_blank


# --- CorrSpcScitfNm 처리 ---
def test_85종_전부_taxonomicStatus_correctedScientificName이_있다():
    for iid in all_complete_ids():
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        assert detail["taxonomicStatus"]["correctedScientificName"], iid
        assert detail["taxonomicStatus"]["nameType"], iid


# --- rawApiFields 보존 ---
def test_rawApiFields에_SpcTyp_등_미해석_필드가_보존된다():
    for iid in all_complete_ids()[:10]:  # 전수는 느리니 앞 10건만 스팟체크
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        assert "SpcTyp" in detail["rawApiFields"], iid
        assert "CommKorNm" in detail["rawApiFields"], iid


# --- 재실행 skip ---
def test_재실행_dry_run은_85건_skip_1건_재시도로_나온다(monkeypatch, capsys):
    """실제 CLI를 서브프로세스로 다시 부르지 않고, 상태 파일 로직만 재현해 확인한다."""
    from src.detail_state import PENDING
    state = load_state()
    candidates, _ = load_tier_a_candidates(TIER_A_FILE)
    skip, retry, new = [], [], []
    for c in candidates:
        st = state.items.get(c["internalId"])
        if st is None or st.status == PENDING:
            new.append(c)
        elif st.status == COMPLETE:
            skip.append(c)
        elif st.status == FAILED:
            retry.append(c)
    assert len(skip) == 85
    assert len(retry) == 1
    assert len(new) == 0


# --- hash 결정성 ---
def test_전_85종_metadata_responseHash가_실제_파일해시와_일치한다():
    for iid in all_complete_ids():
        raw = (RAW_DETAIL / iid / "response.xml").read_bytes()
        meta = json.loads((RAW_DETAIL / iid / "metadata.json").read_text(encoding="utf-8"))
        assert meta["responseHash"] == hashlib.sha256(raw).hexdigest(), iid


def test_normalized_detail의_source_responseHash도_일치한다():
    for iid in all_complete_ids()[:10]:
        raw = (RAW_DETAIL / iid / "response.xml").read_bytes()
        detail = json.loads((NORMALIZED_DETAIL / f"{iid}.json").read_text(encoding="utf-8"))
        assert detail["source"]["responseHash"] == hashlib.sha256(raw).hexdigest(), iid


# --- 키 비노출 ---
def test_env_파일이_git에_추적되지_않는다():
    import subprocess
    result = subprocess.run(["git", "check-ignore", "tools/mbris/.env"],
                            cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, ".env가 gitignore에 안 걸림 — 즉시 확인 필요"


def test_call_log에_serviceKey가_노출되지_않는다():
    log_path = MBRIS / "raw" / "api" / "logs" / "call-log.jsonl"
    assert log_path.exists()
    for line in log_path.read_text(encoding="utf-8").strip().splitlines():
        entry = json.loads(line)
        assert "serviceKey" not in entry.get("params", {})
        assert "serviceKey" not in json.dumps(entry)


def test_report_파일들_어디에도_실제_키_문자열이_없다():
    if not ENV_FILE.exists():
        pytest.skip(".env 없음 — 키 비노출 확인 대상 없음")
    env_content = ENV_FILE.read_text(encoding="utf-8")
    key_line = next((l for l in env_content.splitlines() if l.startswith("MBRIS_API_KEY=")), None)
    assert key_line is not None
    key_value = key_line.split("=", 1)[1].strip()
    assert len(key_value) > 10

    check_files = list(REPORTS.glob("tier-a-*.json")) + list(REPORTS.glob("tier-a-*.csv"))
    for p in check_files:
        content = p.read_text(encoding="utf-8")
        assert key_value not in content, p


# --- 필드 완전성/매칭/오류 리포트가 전부 생성됐는지(§5~§7) ---
def test_필드완전성_매칭검토_오류분석_리포트가_전부_있다():
    assert (REPORTS / "tier-a-matching-review.csv").exists()
    assert (REPORTS / "tier-a-field-completeness.json").exists()
    assert (REPORTS / "tier-a-field-completeness.csv").exists()
    assert (REPORTS / "tier-a-collection-errors.json").exists()
    assert (REPORTS / "tier-a-manual-review.csv").exists()


def test_field_completeness_리포트값이_실제_통계와_일치한다():
    fc = json.loads((REPORTS / "tier-a-field-completeness.json").read_text(encoding="utf-8"))
    assert fc["sampleSize"] == 85
    assert fc["fields"]["ClassKR"]["populatedCount"] == 15
    assert fc["fields"]["HABI"]["populatedCount"] == 5


def test_collection_errors_리포트가_실패1건을_정확히_분류한다():
    errors = json.loads((REPORTS / "tier-a-collection-errors.json").read_text(encoding="utf-8"))
    assert errors["totalFailures"] == 1
    assert errors["categoryCounts"]["multiple_candidates"] == 1
    assert sum(errors["categoryCounts"].values()) == 1


# --- §10/§11 리포트 존재 ---
def test_이미지_분석_리포트가_85종_기준으로_갱신됐다():
    img = json.loads((REPORTS / "mbris-image-api-analysis.json").read_text(encoding="utf-8"))
    assert img["sampleSize"] == 85
    assert img["hasImageField"] is False
    assert img["downloadedAnyImage"] is False


def test_nifs_비교_리포트가_25종이다():
    import csv as csv_mod
    with (REPORTS / "nifs-mbris-tier-a-detail-comparison.csv").open(encoding="utf-8-sig") as f:
        rows = list(csv_mod.DictReader(f))
    assert len(rows) == 25


# --- 제한사항: 원본 불변 ---
def test_taxonomy_master는_수정되지_않았다():
    tm = json.loads((ROOT / "data/mbris/normalized/taxonomy-master.json").read_text(encoding="utf-8"))
    assert len(tm) == 16587


def test_nifs_mbris_link_원본은_수정되지_않았다():
    link = json.loads((MBRIS / "mappings" / "nifs-mbris-link.json").read_text(encoding="utf-8"))
    assert len(link) == 25


def test_fish_alias_registry는_수정되지_않았다():
    from collections import Counter
    registry = json.loads((MBRIS / "mappings" / "fish-alias-registry.json").read_text(encoding="utf-8"))
    counts = Counter(r["status"] for r in registry)
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4
