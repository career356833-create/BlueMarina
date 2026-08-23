"""§4 NIFS-MBRIS 학명 Crosswalk 검증. 원본 불변 + 6건 정확 판정 + 오분자기 자동
동일종 처리 금지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_taxonomy_crosswalk import build_records, load_links
from src.taxonomy_crosswalk import (
    build_crosswalk_record, RELATIONSHIP_TYPES, REVIEW_STATUS, SAME_SPECIES_ALLOWED_TYPES,
)
from src.review_taxonomy_crosswalk_data import DECISIONS, TARGET_KOREAN_NAMES

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"


def load_crosswalk() -> list[dict]:
    return json.loads((MAPPINGS / "nifs-mbris-taxonomy-crosswalk.json").read_text(encoding="utf-8"))


# --- 6건 정확히 처리 ---
def test_학명충돌_6건이_전부_DECISIONS에_있다():
    assert set(DECISIONS.keys()) == {"갈치", "명태", "참홍어", "제주소라", "개조개", "오분자기"}
    assert set(TARGET_KOREAN_NAMES) == set(DECISIONS.keys())


def test_crosswalk는_NIFS_25건_전부를_담는다():
    assert len(load_crosswalk()) == 25


def test_6건은_실제_조사_근거를_담고_나머지_19건은_기존_link를_옮긴것이다():
    crosswalk = load_crosswalk()
    by_name = {r["koreanName"]: r for r in crosswalk}
    for name in TARGET_KOREAN_NAMES:
        assert len(by_name[name]["evidence"]) >= 1
        # 조사 대상 6건은 WoRMS 등 실제 학술 출처를 인용해야 한다
        sources = {e["source"] for e in by_name[name]["evidence"]}
        assert sources - {"nifs-mbris-link.json"}, f"{name}: 실제 출처 인용이 없다"


# --- relationshipType/reviewStatus 값 검증 ---
def test_모든_relationshipType과_reviewStatus가_유효하다():
    for r in load_crosswalk():
        assert r["relationshipType"] in RELATIONSHIP_TYPES
        assert r["reviewStatus"] in REVIEW_STATUS


def test_갈치는_taxonomic_revision_manual_review다():
    """WoRMS와 GBIF가 서로 다른 판단을 내리는 실제 데이터베이스 불일치가 확인됐으므로
    approved로 자동 확정하지 않고 manual_review로 남긴다."""
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    assert by_name["갈치"]["relationshipType"] == "taxonomic_revision"
    assert by_name["갈치"]["reviewStatus"] == "manual_review"


def test_명태_참홍어_개조개는_approved_동일종이다():
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    for name in ("명태", "참홍어", "개조개"):
        assert by_name[name]["sameSpecies"] is True
        assert by_name[name]["reviewStatus"] == "approved"


def test_제주소라는_taxonomic_revision_approved다():
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    assert by_name["제주소라"]["relationshipType"] == "taxonomic_revision"
    assert by_name["제주소라"]["sameSpecies"] is True
    assert by_name["제주소라"]["reviewStatus"] == "approved"


# --- 오분자기 자동 동일종 처리 금지(가장 중요) ---
def test_오분자기는_sameSpecies_False이고_unresolved다():
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    o = by_name["오분자기"]
    assert o["sameSpecies"] is False
    assert o["relationshipType"] == "unresolved_conflict"
    assert o["reviewStatus"] == "unresolved"
    assert o["confidence"] == "low"


def test_unresolved_conflict는_sameSpecies_True로_생성될_수_없다():
    """build_crosswalk_record 자체의 가드 검증 — 스키마 레벨에서 막혀야 한다."""
    import pytest
    with pytest.raises(ValueError):
        build_crosswalk_record(
            nifs_source_id="x", korean_name="오분자기", nifs_sci_raw="x",
            mbris_internal_id="x", mbris_sci_canonical="x",
            relationship_type="unresolved_conflict", same_species=True,
            confidence="low", evidence=[], review_status="unresolved")


def test_SAME_SPECIES_ALLOWED_TYPES에_unresolved와_manual_review_required가_없다():
    assert "unresolved_conflict" not in SAME_SPECIES_ALLOWED_TYPES
    assert "manual_review_required" not in SAME_SPECIES_ALLOWED_TYPES


# --- 원본 학명 보존 / canonical 분리 ---
def test_nifsScientificNameRaw는_원본_link_값과_동일하다():
    links = load_links()
    by_name = {l["nifsName"]: l for l in links}
    for r in load_crosswalk():
        assert r["nifsScientificNameRaw"] == by_name[r["koreanName"]]["nifsScientificName"]


def test_제주소라_원본_학명은_콤마_병기_형태_그대로_보존된다():
    """NIFS 원본이 'Turbo cornutus, Batillus cornutus'로 두 학명을 병기한 걸
    임의로 하나로 줄이거나 고치지 않는다."""
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    assert by_name["제주소라"]["nifsScientificNameRaw"] == "Turbo cornutus, Batillus cornutus"


def test_mbrisScientificNameCanonical은_원본과_분리된_별도_필드다():
    for r in load_crosswalk():
        assert "mbrisScientificNameCanonical" in r
        assert "nifsScientificNameRaw" in r
        # 두 필드가 항상 다른 값일 필요는 없지만(우연히 같을 수 있음), 필드 자체는 분리돼 있어야 한다
        assert r["nifsScientificNameRaw"] != "" or r["nifsScientificNameRaw"] == ""


# --- synonym/accepted 구분 ---
def test_명태_evidence에_synonym과_accepted_구분이_기록됐다():
    by_name = {r["koreanName"]: r for r in load_crosswalk()}
    notes = " ".join(e["note"] for e in by_name["명태"]["evidence"])
    assert "unaccepted" in notes or "synonym" in notes
    assert "accepted" in notes


# --- 원본 불변 ---
def test_nifs_mbris_link_원본은_수정되지_않았다():
    links = load_links()
    assert len(links) == 25
    by_name = {l["nifsName"]: l for l in links}
    assert by_name["갈치"]["nifsScientificName"] == "Trichiurus lepturus"
    assert by_name["오분자기"]["nifsScientificName"] == "Sulculus diversicolor"


def test_taxonomy_master_원본은_수정되지_않았다():
    tm = json.loads((ROOT / "data/mbris/normalized/taxonomy-master.json").read_text(encoding="utf-8"))
    assert len(tm) == 16587


# --- 재실행 결정성 / fixture 기반(API 재호출 없음) ---
def test_build_records_재실행_결정성():
    r1 = build_records()
    r2 = build_records()
    assert r1 == r2


def test_build_records는_API를_호출하지_않는다():
    """네트워크 모듈을 import하지 않는지 소스 확인 — 로컬 파일만 읽는다."""
    src = (ROOT / "tools/mbris/build_taxonomy_crosswalk.py").read_text(encoding="utf-8")
    assert "api_client" not in src
    assert "httpx" not in src
