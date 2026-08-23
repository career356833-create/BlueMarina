"""Batch3(복수후보 17건 검토) 검증. 자동 승인 금지·복수후보 충돌 처리·기존 파일 불변이 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_alias_review_batch3 import build_records, load_targets
from src.review_batch3_data import (
    DECISIONS, TARGET_NAMES, VALID_DECISIONS, VALID_CONFIDENCE,
    APPROVED, REJECTED, KEEP_MANUAL_REVIEW, AGGREGATE_NAME, MARKET_NAME, SOURCE_ISSUE,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"


# --- 대상 17건 정확성 ---
def test_대상은_정확히_17건이다():
    assert len(TARGET_NAMES) == 17
    assert len(load_targets()) == 17


def test_대상은_추출_당시_targets_스냅샷과_일치한다():
    """TARGET_NAMES는 §2 추출 시점(fish-alias-batch3-targets.json)의 스냅샷이다.
    이후 별도 작업(Batch3 승인 3건의 Registry 실반영)이 광어/장대/참굴의 status를
    manual_review에서 approved로 바꿨으므로, 현재 시점 Registry를 다시 조회해
    비교하면 더 이상 일치하지 않는다 — 그건 정상이다(그 3건이 정확히 반영됐다는
    증거이기도 하다). 그래서 여기서는 라이브 Registry가 아니라 추출 당시 저장된
    targets 파일과 비교한다."""
    targets = load_targets()
    assert set(TARGET_NAMES) == set(targets.keys())


def test_모든_대상이_DECISIONS에_판정을_갖는다():
    assert set(DECISIONS.keys()) == set(TARGET_NAMES)


def test_decision과_confidence_값이_유효하다():
    for name, d in DECISIONS.items():
        assert d["decision"] in VALID_DECISIONS, name
        assert d["confidence"] in VALID_CONFIDENCE, name


# --- approved 조건 ---
def test_approved는_반드시_internalId_canonicalName_scientificName을_갖는다():
    for name, d in DECISIONS.items():
        if d["decision"] == APPROVED:
            assert d["internalId"], f"{name}: approved인데 internalId 없음"
            assert d["canonicalName"], f"{name}: approved인데 canonicalName 없음"
            assert d["scientificName"], f"{name}: approved인데 scientificName 없음"


def test_approved는_반드시_공식근거가_있다():
    for name, d in DECISIONS.items():
        if d["decision"] == APPROVED:
            assert d["evidence"], f"{name}이 approved인데 근거가 없다"
            for ev in d["evidence"]:
                assert ev["organization"] and ev["source"] and ev["value"], name


def test_approved_3건은_광어_장대_참굴이다():
    approved = {n for n, d in DECISIONS.items() if d["decision"] == APPROVED}
    assert approved == {"광어", "장대", "참굴"}


def test_광어는_넙치로_참굴은_굴로_장대는_양태로_승인됐다():
    assert DECISIONS["광어"]["canonicalName"] == "넙치"
    assert DECISIONS["참굴"]["canonicalName"] == "굴"
    assert DECISIONS["장대"]["canonicalName"] == "양태"


# --- 안전 관련종: 참복은 후보 중 하나로 임의 승인하지 않는다 ---
def test_참복은_안전상_5개후보_중_하나로_승인되지_않는다():
    d = DECISIONS["참복"]
    assert d["decision"] != APPROVED
    assert d["internalId"] is None


# --- aggregate_name / market_name 자동승인 방지 ---
def test_aggregate_market은_internalId와_canonicalName이_null이다():
    for name, d in DECISIONS.items():
        if d["decision"] in (AGGREGATE_NAME, MARKET_NAME):
            assert d["internalId"] is None, f"{name}: 집합명/시장명인데 ID가 있다(자동 승인 금지 위반)"
            assert d["canonicalName"] is None, f"{name}: 집합명/시장명인데 canonicalName이 있다"


def test_가자미_갑오징어_전복_줄돔은_집합명으로_판정됐다():
    for name in ("가자미", "갑오징어", "전복", "줄돔"):
        assert DECISIONS[name]["decision"] == AGGREGATE_NAME, name


def test_가자미_집합명_근거는_국립수산과학원이다():
    orgs = {e["organization"] for e in DECISIONS["가자미"]["evidence"]}
    assert any("수산과학원" in o or "NIFS" in o for o in orgs)


def test_이번_배치에는_market_name_판정이_없다():
    """이번 17건 조사 결과 순수 상품명/유통등급명으로 확정된 건은 없었다."""
    assert sum(1 for d in DECISIONS.values() if d["decision"] == MARKET_NAME) == 0


def test_build_records가_aggregate_market에_internalId를_주면_예외를_던진다():
    """build_records의 자동승인 방지 assert가 실제로 작동하는지 회귀 테스트."""
    import build_alias_review_batch3 as mod
    broken = dict(DECISIONS)
    broken["가자미"] = dict(broken["가자미"])
    broken["가자미"]["internalId"] = "BM-SPECIES-000468"
    original = mod.DECISIONS
    try:
        mod.DECISIONS = broken
        try:
            mod.build_records()
            assert False, "aggregate_name에 internalId가 있는데 예외가 발생하지 않았다"
        except AssertionError as e:
            assert "자동 승인 금지" in str(e)
    finally:
        mod.DECISIONS = original


# --- 복수후보 충돌 처리 ---
def test_모든_대상은_candidateBefore에_원래_복수후보가_그대로_보존된다():
    targets = load_targets()
    for r in build_records():
        assert r["candidateBefore"] == targets[r["sourceName"]]["candidates"]
        assert len(r["candidateBefore"]) > 1


def test_참굴_참복_승인복수후보_충돌사유가_기록된다():
    """5개 후보 중 정답이 없거나(참복) 후보 대부분이 오답인 경우(참굴) conflicts에 명시돼야 한다."""
    assert DECISIONS["참굴"]["conflicts"]
    assert DECISIONS["참복"]["conflicts"]


def test_불가사리_성게_해삼은_전_후보가_wrong_organism으로_기각된다():
    for name in ("불가사리", "성게", "해삼"):
        d = DECISIONS[name]
        assert d["decision"] == REJECTED, name
        assert d["conflicts"], f"{name}: 기각 사유(conflicts)가 없다"


# --- 산출물 ---
def test_레코드_필드가_전부_있다():
    required = {"sourceName", "decision", "canonicalName", "internalId", "scientificName",
                "confidence", "candidateBefore", "evidence", "conflicts", "reviewNote"}
    for r in build_records():
        assert required <= set(r.keys())


def test_재실행_결정성():
    assert build_records() == build_records()


def test_산출파일이_생성됐다():
    assert (MAPPINGS / "fish-alias-review-batch3.json").exists()
    assert (MAPPINGS / "fish-alias-review-batch3.csv").exists()
    assert (REPORTS / "fish-alias-batch3-impact.json").exists()
    assert (REPORTS / "fish-alias-batch3-targets.json").exists()


# --- 기존 Registry / 파일 불변 ---
def test_batch3_산출물_생성_자체는_Registry_파일을_건드리지_않는다():
    """build_alias_review_batch3.py(§6 산출물 생성)는 Registry를 읽기만 한다.
    (Registry에 실제 반영하는 것은 별도 작업(apply_batch3_approvals.py)의 몫이며,
    그 반영 결과는 test_alias_approval_batch3_apply.py가 검증한다.)"""
    before = (MAPPINGS / "fish-alias-registry.json").read_bytes()
    build_records()
    after = (MAPPINGS / "fish-alias-registry.json").read_bytes()
    assert before == after


def test_Registry_현재상태는_78_69_4이다():
    """Batch3 승인 3건(광어/장대/참굴)이 별도 작업으로 Registry에 실반영되어
    75/72/4 → 78/69/4로 바뀌었다(자세한 반영 검증은 test_alias_approval_batch3_apply.py)."""
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    from collections import Counter
    counts = Counter(r["status"] for r in registry)
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4


def test_resolved은_78건이다():
    """Batch3 승인 3건 반영으로 75 -> 78건이 됐다."""
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    assert len(resolved) == 78


def test_기존_service_tier_a_86건_불변():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86


def test_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    for name in TARGET_NAMES:
        assert name in ts, name


def test_manual_review_queue_원본은_수정되지_않았다():
    queue = json.loads((MAPPINGS / "fish-data-manual-review-queue.json").read_text(encoding="utf-8"))
    assert len(queue) == 76


# --- 시뮬레이션(§7) 결과 검증 ---
def test_impact_승인3건이_반영되면_approved_78_manual_review_69이다():
    impact = json.loads((REPORTS / "fish-alias-batch3-impact.json").read_text(encoding="utf-8"))
    assert impact["approvedCount"] == 3
    assert impact["registryStatusBefore"] == {"approved": 75, "manual_review": 72, "rejected": 4}
    assert impact["registryStatusIfApplied"]["approved"] == 78
    assert impact["registryStatusIfApplied"]["manual_review"] == 69
    assert impact["registryStatusIfApplied"]["rejected"] == 4


def test_impact_resolved는_75에서_78로_증가한다():
    impact = json.loads((REPORTS / "fish-alias-batch3-impact.json").read_text(encoding="utf-8"))
    assert impact["resolvedMappingCountExisting"] == 75
    assert impact["resolvedMappingCountIfApplied"] == 78


def test_impact_newSpeciesCreated는_항상_False():
    impact = json.loads((REPORTS / "fish-alias-batch3-impact.json").read_text(encoding="utf-8"))
    assert impact["newSpeciesCreated"] is False


def test_impact_집계값이_17건과_일치한다():
    impact = json.loads((REPORTS / "fish-alias-batch3-impact.json").read_text(encoding="utf-8"))
    assert impact["reviewedCount"] == 17
    total = (impact["approvedCount"] + impact["rejectedCount"] + impact["aggregateNameCount"]
            + impact["marketNameCount"] + impact["sourceIssueCount"]
            + impact["keepManualReviewCount"])
    assert total == 17


def test_impact_승인항목의_internalId는_기존_MBRIS_종을_재사용한다():
    """새 species를 만들지 않는다는 정책 — 승인 3건 모두 기존 후보 풀에 실존하는 ID여야 한다."""
    impact = json.loads((REPORTS / "fish-alias-batch3-impact.json").read_text(encoding="utf-8"))
    fish = json.loads((ROOT / "data/mbris/normalized/blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((ROOT / "data/mbris/normalized/blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    known_ids = {r["internalId"] for r in fish + nonfish}
    for item in impact["approvedItems"]:
        assert item["internalId"] in known_ids, item
