"""Tier 분류 경계값 테스트."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.priority_engine import classify_tier, detail_collection_status


@pytest.mark.parametrize("score,tier", [
    (100, "tier1"), (85, "tier1"), (61, "tier1"), (60, "tier1"),  # tier1 경계
    (59, "tier2"), (35, "tier2"), (31, "tier2"), (30, "tier2"),   # tier2 경계
    (29, "tier3"), (10, "tier3"), (0, "tier3"),                    # tier3 경계
])
def test_tier_경계값(score, tier):
    assert classify_tier(score) == tier


def test_tier1은_60점_미만을_포함하지_않는다():
    assert classify_tier(59) != "tier1"


def test_tier3은_30점_이상을_포함하지_않는다():
    assert classify_tier(30) != "tier3"


def test_tier1은_최초_수집_selected():
    assert detail_collection_status("tier1") == "selected"


def test_tier2와_tier3은_not_selected():
    assert detail_collection_status("tier2") == "not_selected"
    assert detail_collection_status("tier3") == "not_selected"


def test_collected_상태는_이번_단계에서_생성되지_않는다():
    """상세 데이터를 실제로 받지 않았으므로 'collected'는 나올 수 없다."""
    for tier in ("tier1", "tier2", "tier3"):
        assert detail_collection_status(tier) != "collected"
