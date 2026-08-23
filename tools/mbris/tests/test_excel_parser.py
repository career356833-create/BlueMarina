"""컬럼 매핑·정제 유틸 단위 테스트 + 원본 행 수 불변 확인(통합)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.schema import (
    row_to_record, holding_institutions, clean, COLUMNS,
    HOLDING_PRESENT, SHEETS, DATA_START_ROW,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
XLSX = (ROOT / "data" / "mbris" / "raw" / "catalog" / "original" /
        "mbris-national-species-catalog.xlsx")


def make_row(**overrides) -> tuple:
    row = [None] * 24
    for idx, (_path, key) in COLUMNS.items():
        if key in overrides:
            row[idx] = overrides[key]
    return tuple(row)


def test_clean_공백만_있으면_None():
    assert clean("   ") is None
    assert clean(None) is None
    assert clean(" 갈치 ") == "갈치"
    assert clean(1.0) == "1.0"


def test_row_to_record_컬럼매핑():
    row = make_row(kingdomGroup="척추동물", koreanName="갈치",
                    scientificNameRaw="Trichiurus japonicus", className="Teleostei")
    rec = row_to_record(row, "척추동물", 446)
    assert rec["sourceSheet"] == "척추동물"
    assert rec["sourceRow"] == 446
    assert rec["koreanName"] == "갈치"
    assert rec["scientificNameRaw"] == "Trichiurus japonicus"
    assert rec["className"] == "Teleostei"


def test_holding_institutions_보유만_포함():
    row = make_row(holdingMabik=HOLDING_PRESENT, holdingDepository="미보유",
                   holdingNifs=HOLDING_PRESENT)
    rec = row_to_record(row, "척추동물", 1)
    assert holding_institutions(rec) == ["국립해양생물자원관", "국립수산과학원"]


def test_holding_institutions_전부_미보유면_빈배열():
    row = make_row(holdingMabik="미보유", holdingDepository="미보유", holdingNifs="미보유")
    rec = row_to_record(row, "척추동물", 1)
    assert holding_institutions(rec) == []


@pytest.mark.skipif(not XLSX.exists(), reason="원본 XLSX가 없다")
def test_원본_전체행수는_16587이다():
    """다운로드한 원본이 이번 분석 전제(16,587건)와 어긋나지 않는지 확인한다."""
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning)
    import openpyxl
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    total = 0
    for sheet in SHEETS:
        ws = wb[sheet]
        rows = list(ws.iter_rows(min_row=DATA_START_ROW, values_only=True))
        total += sum(1 for r in rows if any(c not in (None, "") for c in r))
    assert total == 16_587
