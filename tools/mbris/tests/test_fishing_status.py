"""fishingTargetStatus 판정 테스트. 분류군만으로 낚시 대상을 확정하지 않는다."""
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.priority_engine import fishing_target_status
from build_species_profile import build_profile


def test_NIFS연결이면_confirmed():
    assert fishing_target_status("fish", nifs_linked=True,
                                 has_existing_fishing_data=False) == "confirmed"


def test_기존_블루마리나_낚시데이터_존재해도_confirmed():
    assert fishing_target_status("gastropod", nifs_linked=False,
                                 has_existing_fishing_data=True) == "confirmed"


def test_어류_비어류_그룹만이면_possible():
    for g in ("fish", "cephalopod", "crustacean", "gastropod", "bivalve"):
        assert fishing_target_status(g, nifs_linked=False,
                                     has_existing_fishing_data=False) == "possible"


def test_대상군이_아니면_unknown():
    assert fishing_target_status("other", nifs_linked=False,
                                 has_existing_fishing_data=False) == "unknown"


def test_분류군만으로_confirmed가_되지_않는다():
    """어류라는 이유만으로는 confirmed가 아니라 possible이어야 한다."""
    assert fishing_target_status("fish", nifs_linked=False,
                                 has_existing_fishing_data=False) != "confirmed"


def test_NIFS와_기존데이터_둘다_있어도_confirmed_한번만():
    assert fishing_target_status("fish", nifs_linked=True,
                                 has_existing_fishing_data=True) == "confirmed"


# --- 국명 없는 종 처리 및 원본 불변 ---
def _sample_record(korean_name=None):
    return {
        "internalId": "BM-SPECIES-000001",
        "koreanName": korean_name,
        "scientificNameRaw": "Genus species",
        "scientificNameCanonical": "Genus species",
        "scientificNameParsing": {
            "isUncertain": False, "uncertaintyType": None,
        },
        "organismGroup": "fish",
        "taxonomy": {"class": "Teleostei", "order": "Perciformes", "family": "Fam"},
    }


def test_국명없는_종도_오류없이_처리된다():
    rec = _sample_record(korean_name=None)
    profile = build_profile(rec, nifs_match_type=None, fish_data_match=None)
    assert profile["koreanName"] is None
    assert profile["dataPriorityScore"] >= 0
    assert profile["servicePriorityScore"] >= 0


def test_원본_레코드는_변경되지_않는다():
    rec = _sample_record(korean_name="테스트어종")
    before = copy.deepcopy(rec)
    build_profile(rec, nifs_match_type="scientific_exact", fish_data_match=None)
    assert rec == before


def test_taxonomy_master_파일이_실행후_변경되지_않는다():
    """정적 산출물의 mtime/내용이 이 빌드 단계로 인해 바뀌지 않아야 한다(읽기 전용 입력)."""
    path = (Path(__file__).parent.parent.parent.parent / "data" / "mbris" /
            "normalized" / "taxonomy-master.json")
    if not path.exists():
        return  # 이전 단계 산출물이 없는 환경에서는 스킵
    before = path.read_bytes()
    from build_species_profile import load_nifs_links, load_fish_data_links
    load_nifs_links()
    load_fish_data_links()
    after = path.read_bytes()
    assert before == after
