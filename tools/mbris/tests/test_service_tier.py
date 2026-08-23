"""Service Tier 경계값 테스트. Data Tier와 완전히 분리된 임계값을 쓴다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.service_priority import classify_service_tier, DEFAULT_TIER_A_MIN, DEFAULT_TIER_B_MIN
from src.priority_engine import classify_tier


@pytest.mark.parametrize("score,tier", [
    (100, "A"), (85, "A"), (61, "A"), (60, "A"),
    (59, "B"), (45, "B"), (41, "B"), (40, "B"),
    (39, "C"), (10, "C"), (0, "C"),
])
def test_기본_경계값(score, tier):
    assert classify_service_tier(score) == tier


def test_A는_60점_미만을_포함하지_않는다():
    assert classify_service_tier(59) != "A"


def test_C는_40점_이상을_포함하지_않는다():
    assert classify_service_tier(40) != "C"


def test_경계값을_바꿔도_계산식은_그대로다():
    """§5: 목표 규모를 맞추기 위해 임계값 자체는 조정 가능하지만 점수식은 건드리지 않는다."""
    assert classify_service_tier(50, tier_a_min=45, tier_b_min=30) == "A"
    assert classify_service_tier(50) == "B"  # 기본값 기준으로는 여전히 B


def test_기본_임계값_상수가_명시적으로_노출된다():
    assert DEFAULT_TIER_A_MIN == 60
    assert DEFAULT_TIER_B_MIN == 40


def test_data_tier와_service_tier_라벨은_섞이지_않는다():
    """collectionTier는 tier1/2/3, serviceTier는 A/B/C — 값 공간이 겹치면 안 된다."""
    data_labels = {classify_tier(s) for s in (0, 30, 60, 100)}
    service_labels = {classify_service_tier(s) for s in (0, 40, 60, 100)}
    assert data_labels.isdisjoint(service_labels)
