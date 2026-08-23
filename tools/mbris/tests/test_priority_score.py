"""Priority Score 계산 테스트. 임의의 인기 점수를 만들지 않고 명시된 가중치만 쓴다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.priority_engine import compute_score, WEIGHTS


def score(**kw):
    defaults = dict(organism_group="fish", has_korean_name=True,
                    is_uncertain=False, uncertainty_type=None, nifs_linked=False)
    defaults.update(kw)
    return compute_score(**defaults)


def test_동일입력_동일점수():
    a = score(nifs_linked=True)
    b = score(nifs_linked=True)
    assert a.score == b.score
    assert a.reasons == b.reasons


def test_NIFS연결_가중치_50():
    with_nifs = score(nifs_linked=True)
    without = score(nifs_linked=False)
    assert with_nifs.score - without.score == 50
    assert "NIFS_RESOURCE_DATA" in with_nifs.reasons
    assert "NIFS_RESOURCE_DATA" not in without.reasons


def test_어류_가중치_20():
    fish = score(organism_group="fish")
    other = score(organism_group="other")
    assert fish.score - other.score == 20
    assert "FISH_CORE_TARGET" in fish.reasons


@pytest.mark.parametrize("group", ["cephalopod", "crustacean", "gastropod", "bivalve"])
def test_비어류_대상군_가중치_10(group):
    g = score(organism_group=group)
    other = score(organism_group="other")
    assert g.score - other.score == 10
    assert "NONFISH_TARGET_GROUP" in g.reasons


def test_국명존재_플러스10_없으면_마이너스10():
    has = score(has_korean_name=True)
    none = score(has_korean_name=False)
    assert has.score - none.score == 20
    assert "HAS_KOREAN_NAME" in has.reasons
    assert "NO_KOREAN_NAME" in none.reasons


def test_학명정상_플러스5():
    normal = score(is_uncertain=False)
    assert "SCIENTIFIC_NAME_NORMAL" in normal.reasons


def test_학명불확실_마이너스10():
    unc = score(is_uncertain=True, uncertainty_type="unmarked_trinomial")
    normal = score(is_uncertain=False)
    assert normal.score - unc.score == 15  # +5 -> -10
    assert "SCIENTIFIC_NAME_UNCERTAIN" in unc.reasons


def test_미동정은_불확실보다_더_감점된다():
    unidentified = score(is_uncertain=True, uncertainty_type="unidentified_species")
    uncertain = score(is_uncertain=True, uncertainty_type="unmarked_trinomial")
    assert unidentified.score < uncertain.score
    assert "UNIDENTIFIED_SPECIES" in unidentified.reasons
    assert "SCIENTIFIC_NAME_UNCERTAIN" not in unidentified.reasons


def test_점수는_0에서_100사이로_clamp된다():
    best = score(organism_group="fish", has_korean_name=True,
                is_uncertain=False, nifs_linked=True)
    worst = score(organism_group="other", has_korean_name=False,
                 is_uncertain=True, uncertainty_type="unidentified_species",
                 nifs_linked=False)
    assert 0 <= best.score <= 100
    assert 0 <= worst.score <= 100


def test_최고점_조합값_검증():
    """NIFS 연결 + 어류 + 국명 + 정상학명 = 50+20+10+5 = 85."""
    r = score(organism_group="fish", has_korean_name=True,
             is_uncertain=False, nifs_linked=True)
    assert r.score == 85


def test_최저점_조합값_검증():
    """other + 국명없음 + 미동정 = 0-10-20 = -30 -> clamp 0."""
    r = score(organism_group="other", has_korean_name=False,
             is_uncertain=True, uncertainty_type="unidentified_species",
             nifs_linked=False)
    assert r.score == 0


def test_가중치_테이블에_음수와_양수가_모두_있다():
    assert any(w[0] > 0 for w in WEIGHTS.values())
    assert any(w[0] < 0 for w in WEIGHTS.values())
