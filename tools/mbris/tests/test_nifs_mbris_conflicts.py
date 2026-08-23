"""§3/§6 NIFS-MBRIS 학명 충돌 6건 개별 검증 + 전체 85종 Tier A 수집 결과 불변 확인.
공식 근거 없는 동일종 판정 금지가 전체를 관통하는 원칙이다."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.review_taxonomy_crosswalk_data import DECISIONS

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
RAW_DETAIL = ROOT / "data" / "mbris" / "raw" / "detail"
NORMALIZED_DETAIL = ROOT / "data" / "mbris" / "normalized" / "detail"
STATE_PATH = ROOT / "data" / "mbris" / "state" / "detail-collection-state.json"


def load_crosswalk() -> dict:
    records = json.loads((MAPPINGS / "nifs-mbris-taxonomy-crosswalk.json").read_text(encoding="utf-8"))
    return {r["koreanName"]: r for r in records}


# --- 갈치: WoRMS/GBIF 불일치 확인됨 → manual_review 유지 ---
def test_갈치는_WoRMS와_GBIF_불일치가_evidence에_기록된다():
    d = DECISIONS["갈치"]
    notes = " ".join(e["note"] for e in d["evidence"])
    assert "GBIF" in notes and ("상반" in notes or "다르" in notes or "불일치" in notes or "synonym" in notes)


def test_갈치는_confidence가_high가_아니다():
    """공식 출처 간 불일치가 있으므로 high 확신을 주지 않는다."""
    assert DECISIONS["갈치"]["confidence"] != "high"


# --- 명태: Theragra -> Gadus 속 재분류 ---
def test_명태는_속_재분류_근거가_명시된다():
    d = DECISIONS["명태"]
    notes = " ".join(e["note"] for e in d["evidence"])
    assert "Gadus" in notes and "Theragra" in notes


# --- 참홍어: Raja -> Beringraja 속 재분류 ---
def test_참홍어는_Beringraja_속_신설_근거가_명시된다():
    d = DECISIONS["참홍어"]
    notes = " ".join(e["note"] for e in d["evidence"])
    assert "Beringraja" in notes
    assert "2012" in notes


# --- 제주소라: 국명 차이와 학명 개정 분리 판정 ---
def test_제주소라는_국명_소라와의_차이가_별도로_코멘트된다():
    d = DECISIONS["제주소라"]
    assert "제주소라" in d["reviewNote"]
    assert "산지" in d["reviewNote"] or "유통명" in d["reviewNote"] or "국명" in d["reviewNote"]


def test_제주소라_Batillus_cornutus는_별도종이_아니라_구식_아속표기로_설명된다():
    d = DECISIONS["제주소라"]
    notes = " ".join(e["note"] for e in d["evidence"]) + d["reviewNote"]
    assert "아속" in notes or "Batillus" in notes


# --- 개조개: 성어미 변형 ---
def test_개조개는_gender_ending_변형_근거가_명시된다():
    d = DECISIONS["개조개"]
    notes = " ".join(e["note"] for e in d["evidence"])
    assert "gender" in notes.lower() or "성" in d["reviewNote"] or "어미" in d["reviewNote"]


# --- 오분자기: 가장 엄격한 검토, 자동 동일종 처리 금지 ---
def test_오분자기는_diversicolor와_supertexta가_각각_독립종임이_명시된다():
    d = DECISIONS["오분자기"]
    notes = " ".join(e["note"] for e in d["evidence"])
    assert "diversicolor" in notes and "supertexta" in notes
    assert "별개" in notes or "별도" in notes


def test_오분자기는_NIBR_국가목록_근거를_인용한다():
    d = DECISIONS["오분자기"]
    sources = {e["source"] for e in d["evidence"]}
    assert any("NIBR" in s or "국립생물자원관" in s for s in sources)


def test_오분자기_reviewNote에_마대오분자기와_오분자기가_다른_국명임이_명시된다():
    d = DECISIONS["오분자기"]
    assert "마대오분자기" in d["reviewNote"]
    assert "오분자기" in d["reviewNote"]


def test_오분자기는_확실성_없이_같은_종으로_단정하지_않았다():
    """제한사항: 공식 근거 없는 동일종 판정 금지 — 오분자기가 정확히 이 원칙의 시험대다."""
    d = DECISIONS["오분자기"]
    assert d["sameSpecies"] is False
    assert d["relationshipType"] == "unresolved_conflict"
    assert d["confidence"] == "low"


# --- 6건 전체가 crosswalk 파일에 정확히 반영됐다 ---
def test_crosswalk_파일의_6건이_DECISIONS와_완전히_일치한다():
    crosswalk = load_crosswalk()
    for name, d in DECISIONS.items():
        r = crosswalk[name]
        assert r["relationshipType"] == d["relationshipType"]
        assert r["sameSpecies"] == d["sameSpecies"]
        assert r["confidence"] == d["confidence"]
        assert r["reviewStatus"] == d["reviewStatus"]


# --- 기존 85종 Tier A 수집 결과 불변 ---
def test_기존_85종_raw_normalized_파일_불변():
    from src.detail_state import DetailCollectionState, COMPLETE
    state = DetailCollectionState.load(STATE_PATH)
    complete = [iid for iid, st in state.items.items() if st.status == COMPLETE]
    assert len(complete) == 85
    raw_dirs = {d.name for d in RAW_DETAIL.iterdir() if d.is_dir()}
    assert raw_dirs == set(complete)


def test_기존_86종_state_실패1건_불변():
    from src.detail_state import DetailCollectionState, FAILED
    state = DetailCollectionState.load(STATE_PATH)
    failed = [iid for iid, st in state.items.items() if st.status == FAILED]
    assert failed == ["BM-SPECIES-006084"]


def test_기존_fish_alias_registry_불변():
    from collections import Counter
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    counts = Counter(r["status"] for r in registry)
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4


# --- DB 적재 준비 판정 근거(§6) ---
def test_DB적재_판정_근거_unresolved가_1건_존재한다():
    """전체 25건 중 unresolved_conflict가 정확히 1건(오분자기)만 있어야 한다 —
    '조건부 적재'(그 1건만 nullable 처리, 나머지는 진행)의 근거."""
    crosswalk = load_crosswalk()
    unresolved = [r for r in crosswalk.values() if r["relationshipType"] == "unresolved_conflict"]
    assert len(unresolved) == 1
    assert unresolved[0]["koreanName"] == "오분자기"


def test_DB적재_판정_근거_manual_review가_1건_존재한다():
    crosswalk = load_crosswalk()
    manual = [r for r in crosswalk.values() if r["reviewStatus"] == "manual_review"]
    assert len(manual) == 1
    assert manual[0]["koreanName"] == "갈치"
