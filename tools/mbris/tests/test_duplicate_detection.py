"""내부 ID 레지스트리: 중복 없음, 재실행 안정성, 완전 중복 행 처리."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.id_registry import IdRegistry, assign_ids, natural_key


def rec(sheet, sci, ko):
    return {"sourceSheet": sheet, "scientificNameRaw": sci, "koreanName": ko}


def test_서로_다른_레코드는_서로_다른_ID(tmp_path):
    reg = IdRegistry(tmp_path / "registry.json")
    ids = assign_ids([rec("척추동물", "A a", "가"), rec("척추동물", "B b", "나")], reg)
    assert len(set(ids)) == 2


def test_ID는_BM_SPECIES_형식이다(tmp_path):
    reg = IdRegistry(tmp_path / "registry.json")
    ids = assign_ids([rec("척추동물", "A a", "가")], reg)
    assert ids[0].startswith("BM-SPECIES-")
    assert len(ids[0]) == len("BM-SPECIES-") + 6


def test_완전동일_내용의_중복행은_서로_다른_ID를_받는다(tmp_path):
    """(시트,학명,국명)이 완전히 같은 행이 2개면 등장 순서로 구분해 별개 ID를 준다."""
    reg = IdRegistry(tmp_path / "registry.json")
    ids = assign_ids([rec("무척추동물", "X y", "다"), rec("무척추동물", "X y", "다")], reg)
    assert ids[0] != ids[1]


def test_저장후_재로드하면_같은_키는_같은_ID를_유지한다(tmp_path):
    path = tmp_path / "registry.json"
    reg1 = IdRegistry(path)
    ids1 = assign_ids([rec("척추동물", "A a", "가"), rec("척추동물", "B b", "나")], reg1)
    reg1.save()

    reg2 = IdRegistry(path)
    ids2 = assign_ids([rec("척추동물", "A a", "가"), rec("척추동물", "B b", "나")], reg2)
    assert ids1 == ids2


def test_재실행시_기존_ID는_바뀌지_않고_신규만_새_번호를_받는다(tmp_path):
    path = tmp_path / "registry.json"
    reg1 = IdRegistry(path)
    first_ids = assign_ids([rec("척추동물", "A a", "가")], reg1)
    reg1.save()

    # 정렬이 바뀐 채로 재실행 — 신규 레코드가 앞에 와도 기존 것은 그대로여야 한다
    reg2 = IdRegistry(path)
    second_ids = assign_ids([rec("무척추동물", "Z z", "새"), rec("척추동물", "A a", "가")], reg2)
    reg2.save()

    assert second_ids[1] == first_ids[0]  # 기존 레코드 ID 불변
    assert second_ids[0] != first_ids[0]  # 신규 레코드는 별개 ID


def test_natural_key에_시트가_포함되어_다른시트_동일학명을_구분한다():
    k1 = natural_key("척추동물", "Genus species", "국명", 0)
    k2 = natural_key("무척추동물", "Genus species", "국명", 0)
    assert k1 != k2


def test_레지스트리_길이가_발급건수와_일치한다(tmp_path):
    reg = IdRegistry(tmp_path / "r.json")
    assign_ids([rec("척추동물", "A a", "가"), rec("척추동물", "B b", "나"),
               rec("척추동물", "C c", "다")], reg)
    assert len(reg) == 3
