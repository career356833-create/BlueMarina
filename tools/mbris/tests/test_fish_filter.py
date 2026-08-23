"""어류/비어류 분류 기준 테스트. 척추동물 시트라고 전부 어류로 넣지 않는지 확인한다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_taxonomy_master import organism_group


def rec(sheet="척추동물", detail_group="어류", class_name="Teleostei"):
    return {"sourceSheet": sheet, "detailGroup": detail_group, "className": class_name}


def test_척추동물_어류는_fish():
    assert organism_group(rec()) == "fish"


def test_척추동물_조류는_fish가_아니다():
    assert organism_group(rec(detail_group="바다새", class_name="Aves")) != "fish"


def test_척추동물_포유류는_fish가_아니다():
    assert organism_group(rec(detail_group="포유류", class_name="Mammalia")) != "fish"


def test_척추동물_파충류는_fish가_아니다():
    assert organism_group(rec(detail_group="파충류", class_name="Reptilia")) != "fish"


def test_육상담수종_시트의_어류도_fish다():
    assert organism_group(rec(sheet="육상담수종", detail_group="어류",
                              class_name="Teleostei")) == "fish"


def test_육상담수종_시트라도_어류_아니면_fish가_아니다():
    assert organism_group(rec(sheet="육상담수종", detail_group="연체동물",
                              class_name="Gastropoda")) == "gastropod"


def test_무척추동물_두족류():
    assert organism_group(rec(sheet="무척추동물", detail_group="연체동물",
                              class_name="Cephalopoda Cuvier, 1795")) == "cephalopod"


def test_무척추동물_갑각류():
    assert organism_group(rec(sheet="무척추동물", detail_group="절지동물",
                              class_name="Malacostraca")) == "crustacean"


def test_무척추동물_복족류():
    assert organism_group(rec(sheet="무척추동물", detail_group="연체동물",
                              class_name="Gastropoda Cuvier, 1795")) == "gastropod"


def test_무척추동물_이매패류():
    assert organism_group(rec(sheet="무척추동물", detail_group="연체동물",
                              class_name="Bivalvia Linnaeus, 1758")) == "bivalve"


def test_해당없는_강은_other():
    assert organism_group(rec(sheet="무척추동물", detail_group="극피동물",
                              class_name="Asteroidea")) == "other"


def test_class가_None이어도_에러없이_other():
    assert organism_group(rec(sheet="무척추동물", detail_group="선형동물",
                              class_name=None)) == "other"


def test_식물_시트는_항상_other():
    assert organism_group(rec(sheet="식물", detail_group="홍조류",
                              class_name="Florideophyceae")) == "other"
