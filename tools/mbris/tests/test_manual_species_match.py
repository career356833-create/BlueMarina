"""§5 갯강구(BM-SPECIES-006084) 수동 매칭 검증. 복수후보 자동 선택 금지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_manual_species_match import build_record
from src.review_manual_match_data import DECISION, CANDIDATES, VALID_DECISIONS, INTERNAL_ID

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"


def load_match() -> dict:
    return json.loads((MAPPINGS / "mbris-tier-a-manual-match.json").read_text(encoding="utf-8"))


# --- 기본 스키마 ---
def test_internalId와_sourceName이_정확하다():
    m = load_match()
    assert m["internalId"] == "BM-SPECIES-006084"
    assert m["sourceName"] == "갯강구"


def test_decision이_유효한_값이다():
    m = load_match()
    assert m["decision"] in VALID_DECISIONS


def test_필수_필드가_전부_있다():
    required = {"internalId", "sourceName", "selectedSpcTxnId", "selectedScientificName",
               "decision", "confidence", "candidateComparison", "evidence", "reviewStatus"}
    assert required <= set(load_match().keys())


# --- 복수후보 자동 선택 금지(핵심) ---
def test_candidateComparison에_원래_후보_2건이_그대로_보존된다():
    m = load_match()
    assert len(m["candidateComparison"]) == 2
    assert m["candidateComparison"] == CANDIDATES


def test_두_후보의_국명_학명이_서로_다르다는_사실이_보존된다():
    """갯강구 vs 극동갯강구 — 이름이 다르다는 것 자체가 자동선택 금지 근거였다."""
    m = load_match()
    names = {c["koreanName"] for c in m["candidateComparison"]}
    sci = {c["scientificNameShort"] for c in m["candidateComparison"]}
    assert names == {"갯강구", "극동갯강구"}
    assert len(sci) == 2  # 서로 다른 학명


def test_선택된_종은_후보1_갯강구이지_극동갯강구가_아니다():
    m = load_match()
    assert m["selectedScientificName"] == "Ligia (Megaligia) exotica Roux, 1828"
    assert "cinerascens" not in (m["selectedScientificName"] or "")


def test_결정근거에_두_후보가_별개종이라는_사실이_명시된다():
    """WoRMS 조사로 극동갯강구가 명백히 다른 종임을 확인했다는 근거가 evidence에 남아야
    나중에 왜 후보2를 배제했는지 감사 추적이 가능하다."""
    m = load_match()
    notes = " ".join(e["note"] for e in m["evidence"])
    assert "cinerascens" in notes or "별개" in notes or "다른" in notes


# --- 판정 근거: 아속 표기 차이(공식 근거 기반, 추측 아님) ---
def test_evidence는_WoRMS_등_실제_출처를_인용한다():
    m = load_match()
    sources = {e["source"] for e in m["evidence"]}
    assert "WoRMS" in sources


def test_confidence는_high이고_reviewStatus는_approved다():
    """WoRMS가 명시적으로 exact_subgenus 매칭을 확인해줬으므로 이 케이스는 승인 가능."""
    m = load_match()
    assert m["confidence"] == "high"
    assert m["reviewStatus"] == "approved"
    assert m["decision"] == "exact_manual_match"


# --- 원본 불변 ---
def test_이_판정은_Alias_Registry나_Taxonomy_Master를_전혀_건드리지_않는다():
    """산출물이 별도 파일(mbris-tier-a-manual-match.json)에만 저장됐는지 확인."""
    assert (MAPPINGS / "mbris-tier-a-manual-match.json").exists()
    tm = json.loads((ROOT / "data/mbris/normalized/taxonomy-master.json").read_text(encoding="utf-8"))
    assert len(tm) == 16587


def test_taxonomy_master에서_갯강구_원본_학명은_그대로다():
    tm = json.loads((ROOT / "data/mbris/normalized/taxonomy-master.json").read_text(encoding="utf-8"))
    r = next(x for x in tm if x["internalId"] == INTERNAL_ID)
    assert r["scientificNameCanonical"] == "Ligia exotica"
    assert r["koreanName"] == "갯강구"


# --- 재실행 결정성 ---
def test_build_record_재실행_결정성():
    r1 = build_record()
    r2 = build_record()
    assert r1 == r2


def test_DECISION이_None이면_build_record가_예외를_던진다():
    """build_manual_species_match.py는 `from ... import DECISION`으로 값을 직접
    바인딩하므로, 원본 모듈(src.review_taxonomy_...)의 속성을 바꿔도 이미 로드된
    바인딩에는 반영되지 않는다 — builder 쪽 바인딩을 직접 패치해야 한다."""
    import pytest
    import build_manual_species_match as builder
    original = builder.DECISION
    try:
        builder.DECISION = None
        with pytest.raises(AssertionError):
            builder.build_record()
    finally:
        builder.DECISION = original
