"""fixture 로더. 실사이트 호출 없이 파서·정규화를 검증한다."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def list_rows():
    return load_fixture("list-response.json")["retList"]


@pytest.fixture
def detail_payload():
    """꽃게 — 모든 필드가 채워진 대표 샘플."""
    return load_fixture("detail-꽃게.json")


@pytest.fixture
def detail_payload_na():
    """갈치 — infoEat이 'NA'인 샘플."""
    return load_fixture("detail-갈치.json")


@pytest.fixture
def detail_payload_empty_period():
    """갯장어 — periodList가 비어 있는 샘플(전 월 권장)."""
    return load_fixture("detail-갯장어.json")
