"""Service Priority Score 테스트. 인기도 추측 없이 확보된 신호만 사용하는지 확인한다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.service_priority import compute_service_score, WEIGHTS, GROUP_BONUS


def score(**kw):
    defaults = dict(fish_data_linked=False, nifs_linked=False, fishing_confirmed=False,
                    organism_group="fish", has_korean_name=True,
                    is_uncertain=False, uncertainty_type=None)
    defaults.update(kw)
    return compute_service_score(**defaults)


def test_동일입력_동일점수():
    a = score(fish_data_linked=True, nifs_linked=True)
    b = score(fish_data_linked=True, nifs_linked=True)
    assert a.score == b.score
    assert a.reasons == b.reasons


def test_fish_data_존재_가중치_40():
    with_ = score(fish_data_linked=True)
    without = score(fish_data_linked=False)
    assert with_.score - without.score == 40
    assert "FISH_DATA_EXIST" in with_.reasons


def test_NIFS연결_가중치_25():
    with_ = score(nifs_linked=True)
    without = score(nifs_linked=False)
    assert with_.score - without.score == 25
    assert "NIFS_LINKED" in with_.reasons


def test_confirmed_가중치_20():
    with_ = score(fishing_confirmed=True)
    without = score(fishing_confirmed=False)
    assert with_.score - without.score == 20
    assert "CONFIRMED_FISHING_TARGET" in with_.reasons


@pytest.mark.parametrize("group,weight", [
    ("fish", 15), ("cephalopod", 12), ("crustacean", 10),
    ("gastropod", 8), ("bivalve", 8),
])
def test_organismGroup_가중치(group, weight):
    g = score(organism_group=group)
    other = score(organism_group="other")
    assert g.score - other.score == weight


def test_gastropod와_bivalve는_동일하게_패류로_취급된다():
    assert GROUP_BONUS["gastropod"] == GROUP_BONUS["bivalve"]
    assert GROUP_BONUS["gastropod"][0] == "ORGANISM_GROUP_SHELLFISH"


def test_국명존재_플러스5_없으면_마이너스10():
    has = score(has_korean_name=True)
    none = score(has_korean_name=False)
    assert has.score - none.score == 15
    assert "HAS_KOREAN_NAME" in has.reasons
    assert "NO_KOREAN_NAME" in none.reasons


def test_학명불확실_마이너스10():
    unc = score(is_uncertain=True, uncertainty_type="unmarked_trinomial")
    normal = score(is_uncertain=False)
    assert normal.score - unc.score == 15  # +5 -> -10
    assert "SCIENTIFIC_NAME_UNCERTAIN" in unc.reasons


def test_미동정은_가장_크게_감점된다():
    unidentified = score(is_uncertain=True, uncertainty_type="unidentified_species")
    uncertain = score(is_uncertain=True, uncertainty_type="unmarked_trinomial")
    assert unidentified.score < uncertain.score


def test_점수는_0_100사이로_clamp된다():
    best = score(fish_data_linked=True, nifs_linked=True, fishing_confirmed=True,
                organism_group="fish", has_korean_name=True, is_uncertain=False)
    worst = score(fish_data_linked=False, nifs_linked=False, fishing_confirmed=False,
                 organism_group="other", has_korean_name=False,
                 is_uncertain=True, uncertainty_type="unidentified_species")
    assert 0 <= best.score <= 100
    assert 0 <= worst.score <= 100
    assert best.score == 100  # 40+25+20+15+5+5=110 -> clamp 100
    assert worst.score == 0   # 0-10-20=-30 -> clamp 0


def test_인기도_검색량_관련_가중치_키가_없다():
    """가중치 테이블에 추측성 인기 지표가 섞이지 않았는지 방어적으로 확인한다."""
    forbidden = {"popularity", "search_volume", "trend", "community", "views"}
    keys_lower = {k.lower() for k in WEIGHTS}
    assert not (forbidden & keys_lower)
