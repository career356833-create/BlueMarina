"""NIFS-MBRIS 매칭 로직 테스트. 국명 단독 매칭은 confidence를 낮춰야 한다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_nifs_mapping import build_indices, match_one, normalize_ko


def mbris(internal_id, korean, sci, canon=None, genus=None):
    return {"internalId": internal_id, "koreanName": korean, "scientificNameRaw": sci,
            "scientificNameCanonical": canon or sci,
            "taxonomy": {"genus": genus or (sci.split()[0] if sci else None)}}


def test_학명_정확일치는_scientific_exact_high():
    idx = build_indices([mbris("BM-1", "갈치", "Trichiurus japonicus")])
    r = match_one("f1", "갈치", "Trichiurus japonicus", idx)
    assert r["matchType"] == "scientific_exact"
    assert r["confidence"] == "high"
    assert r["mbrisInternalId"] == "BM-1"


def test_학명이_쉼표로_여러개면_하나라도_맞으면_매칭():
    idx = build_indices([mbris("BM-1", "제주소라", "Turbo sazae")])
    r = match_one("f1", "제주소라", "Turbo cornutus, Turbo sazae", idx)
    assert r["matchType"] == "scientific_exact"
    assert r["mbrisInternalId"] == "BM-1"


def test_국명만_일치하면_synonym이고_confidence가_낮아진다():
    """학명이 다르면(구명) 국명으로만 잡히고, 국명 단독 매칭이므로 confidence를 낮춘다."""
    idx = build_indices([mbris("BM-1", "명태", "Gadus chalcogrammus")])
    r = match_one("f1", "명태", "Theragra chalcogramma", idx)
    assert r["matchType"] == "synonym"
    assert r["confidence"] == "medium"  # high가 아니어야 한다
    assert r["mbrisInternalId"] == "BM-1"
    assert "synonym" in r["note"] or "학명" in r["note"]


def test_국명_공백기호_정규화_일치도_synonym():
    idx = build_indices([mbris("BM-1", "제 주 소라", "Turbo sazae")])
    r = match_one("f1", "제주소라", None, idx)
    assert r["matchType"] == "synonym"
    assert r["confidence"] == "medium"


def test_국명_복수후보면_confidence가_low로_더_낮아진다():
    idx = build_indices([mbris("BM-1", "놀래기", "Halichoeres tenuispinis"),
                         mbris("BM-2", "놀래기", "Dermonema pulvinatum")])
    r = match_one("f1", "놀래기", "Nonexistent species", idx)
    assert r["matchType"] == "synonym"
    assert r["confidence"] == "low"
    assert r["candidateCount"] == 2


def test_학명도_국명도_없으면_속단위_후보만_korean_candidate():
    idx = build_indices([mbris("BM-1", "소라", "Turbo sazae", genus="Turbo"),
                         mbris("BM-2", "민소라", "Turbo stenogyrus", genus="Turbo")])
    r = match_one("f1", "제주소라", "Turbo cornutus, Batillus cornutus", idx)
    assert r["matchType"] == "korean_candidate"
    assert r["confidence"] == "low"
    assert r["candidateCount"] == 2


def test_완전_미매칭은_manual_review_low():
    idx = build_indices([mbris("BM-1", "다른어종", "Aliud species")])
    r = match_one("f1", "존재안함", "Nonexistent species", idx)
    assert r["matchType"] == "manual_review"
    assert r["confidence"] == "low"
    assert r["mbrisInternalId"] is None


def test_normalize_ko_공백과_하이픈_제거():
    assert normalize_ko("제 주-소라") == "제주소라"
    assert normalize_ko(None) == ""


def test_학명이_없는_NIFS_행도_국명으로_시도된다():
    idx = build_indices([mbris("BM-1", "갈치", "Trichiurus japonicus")])
    r = match_one("f1", "갈치", None, idx)
    assert r["matchType"] == "synonym"
    assert r["mbrisInternalId"] == "BM-1"
