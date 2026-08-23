"""Batch2(보류 6건 공식 근거 조사) 검증. 집합명·시장명·이름오염의 단일종 매핑 금지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_alias_review_batch2 import build_records, load_target_6
from src.review_batch2_data import (
    DECISIONS, TARGET_NAMES, VALID_DECISIONS, VALID_CONFIDENCE,
    NO_SINGLE_SPECIES_DECISIONS, APPROVED_ALIAS, APPROVED_SPECIES, AGGREGATE_NAME,
    MARKET_NAME, SPELLING_VARIANT, SOURCE_NAME_ISSUE, KEEP_MANUAL_REVIEW,
)
from build_batch2_impact import REFLECTABLE_DECISIONS

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"


# --- 대상 6건 ---
def test_대상은_정확히_6건이다():
    assert len(TARGET_NAMES) == 6
    assert len(load_target_6()) == 6


def test_대상은_batch1_보류6건과_동일하다():
    expected = {"점벵에돔", "흑벵에돔", "대삼치", "쭈꾸미", "한치", "쥐치포용 쥐치"}
    assert set(TARGET_NAMES) == expected


def test_모든_대상이_DECISIONS에_판정을_갖는다():
    assert set(DECISIONS.keys()) == set(TARGET_NAMES)


def test_decision과_confidence_값이_유효하다():
    for name, d in DECISIONS.items():
        assert d["decision"] in VALID_DECISIONS, name
        assert d["confidence"] in VALID_CONFIDENCE, name


# --- 공식 출처 없는 항목 high 금지 ---
def test_공식출처_없이는_high_신뢰도를_주지_않는다():
    """점벵에돔/흑벵에돔은 6개 공식 출처 모두 '확인 안 됨'이었다 — high가 되면 안 된다."""
    assert DECISIONS["점벵에돔"]["confidence"] != "high"
    assert DECISIONS["흑벵에돔"]["confidence"] != "high"


def test_high_판정은_반드시_officialEvidence가_있다():
    for name, d in DECISIONS.items():
        if d["confidence"] == "high":
            assert d["officialEvidence"], f"{name}이 high인데 공식 근거가 없다"
            for ev in d["officialEvidence"]:
                assert ev["organization"] and ev["url"] and ev["evidence"], name


def test_점벵에돔_흑벵에돔은_후보없이_보류다():
    assert DECISIONS["점벵에돔"]["decision"] == KEEP_MANUAL_REVIEW
    assert DECISIONS["흑벵에돔"]["decision"] == KEEP_MANUAL_REVIEW
    assert DECISIONS["점벵에돔"]["candidateInternalId"] is None
    assert DECISIONS["흑벵에돔"]["candidateInternalId"] is None


# --- 집합명 단일종 매핑 금지 ---
def test_한치는_집합명으로_판정됐다():
    assert DECISIONS["한치"]["decision"] == AGGREGATE_NAME


def test_집합명은_candidateInternalId가_null이다():
    for name, d in DECISIONS.items():
        if d["decision"] in NO_SINGLE_SPECIES_DECISIONS:
            assert d["candidateInternalId"] is None, f"{name}: 집합명/시장명인데 ID가 있다"
            assert d["canonicalKoreanName"] is None, f"{name}: 집합명/시장명인데 표준국명이 있다"


def test_한치_판정근거는_국립수산물품질관리원이다():
    orgs = {e["organization"] for e in DECISIONS["한치"]["officialEvidence"]}
    assert any("수산물품질관리원" in o for o in orgs)


# --- 시장명 자동승인 금지 ---
def test_대삼치는_시장명으로_판정됐다():
    assert DECISIONS["대삼치"]["decision"] == MARKET_NAME
    assert DECISIONS["대삼치"]["candidateInternalId"] is None


def test_시장명은_reflectable_집합에_없다():
    assert MARKET_NAME not in REFLECTABLE_DECISIONS
    assert AGGREGATE_NAME not in REFLECTABLE_DECISIONS


# --- 표기 변형은 공식 근거 필요 ---
def test_쭈꾸미는_표기변형으로_판정됐고_공식근거가_있다():
    d = DECISIONS["쭈꾸미"]
    assert d["decision"] == SPELLING_VARIANT
    assert d["canonicalKoreanName"] == "주꾸미"
    assert d["confidence"] == "high"
    orgs = {e["organization"] for e in d["officialEvidence"]}
    assert any("국립국어원" in o for o in orgs)


def test_spelling_variant도_이번_시뮬레이션에서는_반영대상이_아니다():
    """§7 지시가 approved_alias/approved_species만 반영한다고 명시했으므로,
    쭈꾸미가 high+ID를 가져도 이번 배치 시뮬레이션에는 포함되지 않아야 한다."""
    assert SPELLING_VARIANT not in REFLECTABLE_DECISIONS
    assert DECISIONS["쭈꾸미"]["candidateInternalId"] is not None  # ID는 있지만


# --- 이름오염 자동반영 금지 ---
def test_쥐치포용쥐치는_이름오염으로_판정됐다():
    d = DECISIONS["쥐치포용 쥐치"]
    assert d["decision"] == SOURCE_NAME_ISSUE
    assert d["candidateInternalId"] is None  # '쥐치'로 자동 축약하지 않음


def test_source_name_issue는_reflectable_집합에_없다():
    assert SOURCE_NAME_ISSUE not in REFLECTABLE_DECISIONS


def test_쥐치포용쥐치_근거는_표준국어대사전이다():
    orgs = {e["organization"] for e in DECISIONS["쥐치포용 쥐치"]["officialEvidence"]}
    assert any("표준국어대사전" in o for o in orgs)


# --- 이번 배치에는 approved가 없다(실제 조사 결과) ---
def test_이번_배치는_approved_판정이_없다():
    """조사 결과 국내 공식 DB 이명 등재로 직접 확인된 건이 없어 approved류는 0건이다."""
    approved_count = sum(1 for d in DECISIONS.values()
                         if d["decision"] in (APPROVED_ALIAS, APPROVED_SPECIES))
    assert approved_count == 0


# --- 산출물 ---
def test_레코드_필드가_전부_있다():
    required = {"sourceName", "sourceDescription", "decision", "canonicalKoreanName",
                "acceptedScientificName", "candidateInternalId", "nameType", "confidence",
                "officialEvidence", "conflicts", "recommendedAction"}
    for r in build_records():
        assert required <= set(r.keys())


def test_재실행_결정성():
    assert build_records() == build_records()


def test_산출파일이_생성됐다():
    assert (MAPPINGS / "fish-data-alias-review-batch2.json").exists()
    assert (MAPPINGS / "fish-data-alias-review-batch2.csv").exists()
    assert (REPORTS / "fish-data-alias-batch2-impact.json").exists()


# --- 기존 파일 불변 ---
def test_batch2_자체는_resolved를_건드리지_않는다():
    """batch2는 조사·판정만 하고 반영은 별도 승인 라운드(approve_alias.py)의 몫이다."""
    before = (MAPPINGS / "fish-data-link-resolved.json").read_bytes()
    build_records()
    after = (MAPPINGS / "fish-data-link-resolved.json").read_bytes()
    assert before == after


def test_resolved은_최소_74건_이상이다():
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    assert len(resolved) >= 74


def test_기존_service_tier_a_86건_불변():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86


def test_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    assert "쥐치포용 쥐치" in ts
    assert "한치" in ts


# --- 시뮬레이션 결과 ---
def test_impact_반영가능_0건이라_TierA_변화없다():
    impact = json.loads((REPORTS / "fish-data-alias-batch2-impact.json").read_text(encoding="utf-8"))
    assert impact["approvableHighConfidenceCount"] == 0
    assert impact["tierAChangeIfApplied"] == 0
    assert impact["beforeTierACount"] == impact["afterTierACountIfApplied"] == 86


def test_impact_newSpeciesCreated는_항상_False():
    impact = json.loads((REPORTS / "fish-data-alias-batch2-impact.json").read_text(encoding="utf-8"))
    assert impact["newSpeciesCreated"] is False


def test_impact_집계값이_6건과_일치한다():
    impact = json.loads((REPORTS / "fish-data-alias-batch2-impact.json").read_text(encoding="utf-8"))
    assert impact["reviewedCount"] == 6
    total = (impact["approvableHighConfidenceCount"] + impact["aggregateNameCount"]
            + impact["marketNameCount"] + impact["sourceNameIssueCount"]
            + impact["keepManualReviewCount"] + impact["rejectedCount"]
            + impact["spellingVariantNotReflectedCount"])
    assert total == 6
