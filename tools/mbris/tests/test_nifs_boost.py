"""NIFS 연결 종 우선 처리 테스트."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.priority_engine import compute_score, resolve_nifs_links, review_status


def link(internal_id, match_type):
    return {"mbrisInternalId": internal_id, "matchType": match_type,
            "nifsSourceId": "f", "nifsName": "n"}


def test_NIFS연결_종이_비연결_종보다_항상_점수가_높다():
    """동일 조건에서 NIFS 유무 외 모든 요소가 같을 때 연결된 쪽이 우선한다."""
    linked = compute_score(organism_group="fish", has_korean_name=True,
                           is_uncertain=False, uncertainty_type=None, nifs_linked=True)
    unlinked = compute_score(organism_group="fish", has_korean_name=True,
                             is_uncertain=False, uncertainty_type=None, nifs_linked=False)
    assert linked.score > unlinked.score


def test_resolve_nifs_links_미매칭은_제외된다():
    links = [link(None, "manual_review"), link("BM-1", "scientific_exact")]
    out = resolve_nifs_links(links)
    assert out == {"BM-1": "scientific_exact"}


def test_resolve_nifs_links_동일종에_복수매칭시_강한쪽이_남는다():
    links = [link("BM-1", "korean_candidate"), link("BM-1", "scientific_exact")]
    out = resolve_nifs_links(links)
    assert out["BM-1"] == "scientific_exact"


def test_resolve_nifs_links_먼저나온_강한값이_약한값에_덮이지_않는다():
    links = [link("BM-1", "scientific_exact"), link("BM-1", "korean_candidate")]
    out = resolve_nifs_links(links)
    assert out["BM-1"] == "scientific_exact"


def test_resolve_nifs_links_빈_리스트():
    assert resolve_nifs_links([]) == {}


def test_korean_candidate_매칭은_수동검토로_표시된다():
    status = review_status(is_uncertain=False, has_korean_name=True,
                           nifs_match_type="korean_candidate")
    assert status == "manual_review"


def test_scientific_exact_매칭은_자동승인될_수_있다():
    status = review_status(is_uncertain=False, has_korean_name=True,
                           nifs_match_type="scientific_exact")
    assert status == "auto"
