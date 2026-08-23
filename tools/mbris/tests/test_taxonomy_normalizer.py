"""학명 파서 단위 테스트. 실측 16,587건 스캔에서 확인된 실제 패턴만 다룬다."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sci_name_parser import parse_scientific_name, to_dict


def test_원문은_수정되지_않고_그대로_보존된다():
    p = parse_scientific_name("Corbicula papyracea var. colorata")
    assert p.raw == "Corbicula papyracea var. colorata"


def test_평범한_이명은_그대로_canonical이_된다():
    p = parse_scientific_name("Trichiurus japonicus")
    assert p.canonical == "Trichiurus japonicus"
    assert not p.isUncertain
    assert p.authority is None


def test_외부_권위자_컬럼을_우선한다():
    p = parse_scientific_name("Sebastes baramenuke", external_authority="(Wakiya, 1917)")
    assert p.authority == "(Wakiya, 1917)"
    assert p.authoritySource == "external_column"
    assert p.canonical == "Sebastes baramenuke"


@pytest.mark.parametrize("raw,marker,infra", [
    ("Corbicula papyracea var. colorata", "var.", "colorata"),
    ("Jania pedunculata var. adhaerens", "var.", "adhaerens"),
    ("Fucus distichus subsp. evanescens", "subsp.", "evanescens"),
    ("Porphyra suborbiculata f. latifolia", "f.", "latifolia"),
])
def test_아종_변종_품종_마커(raw, marker, infra):
    p = parse_scientific_name(raw)
    assert p.rankMarker == marker
    assert p.infraEpithet == infra
    assert p.isUncertain
    assert p.uncertaintyType == "infrasubspecific_rank"
    assert p.canonical == " ".join(raw.split()[:2])  # 마커 앞부분(속+종)만 canonical


def test_cf_는_잠정_종소명을_canonical에_포함한다():
    p = parse_scientific_name("Pseudopolydora cf. kempi")
    assert p.canonical == "Pseudopolydora kempi"
    assert p.rankMarker == "cf."
    assert p.uncertaintyType == "unconfirmed_similar"


def test_aff_도_cf와_동일하게_처리된다():
    p = parse_scientific_name("Genus aff. species")
    assert p.canonical == "Genus species"
    assert p.uncertaintyType == "unconfirmed_similar"


@pytest.mark.parametrize("raw", ["Genus sp.", "Genus spp."])
def test_미동정은_마커_자체가_이름이다(raw):
    p = parse_scientific_name(raw)
    assert p.canonical == raw
    assert p.uncertaintyType == "unidentified_species"


def test_아속_괄호는_분리되고_canonical에서_제거된다():
    p = parse_scientific_name("Balanophyllia (Balanophyllia) vanderhorsti")
    assert p.subgenus == "Balanophyllia"
    assert p.canonical == "Balanophyllia vanderhorsti"
    assert not p.isUncertain


def test_아속_다음에_마커없는_삼어절이_와도_처리된다():
    p = parse_scientific_name("Acartia (Odontacartia) erythraea erythraea")
    assert p.subgenus == "Odontacartia"
    assert p.canonical == "Acartia erythraea erythraea"
    assert p.infraEpithet == "erythraea"
    assert p.uncertaintyType == "unmarked_trinomial"


def test_마커없는_삼어절은_아종으로_추정되지만_불확실_표시된다():
    p = parse_scientific_name("Larus fuscus heuglini")
    assert p.canonical == "Larus fuscus heuglini"
    assert p.infraEpithet == "heuglini"
    assert p.isUncertain
    assert p.uncertaintyType == "unmarked_trinomial"


def test_species_complex_접미사가_분리된다():
    p = parse_scientific_name("Fusinus pauciliratus complex")
    assert p.canonical == "Fusinus pauciliratus"
    assert p.isSpeciesComplex
    assert not p.isUncertain  # complex는 불확실 동정이 아니라 별도 플래그


def test_속명에_직접_붙은_권위자를_연도_쉼표로_탐지한다():
    p = parse_scientific_name("Photobacterium Lucena et al., 2011")
    assert p.canonical == "Photobacterium"
    assert p.authority == "Lucena et al., 2011"
    assert p.authoritySource == "embedded_in_raw"
    assert not p.isUncertain


def test_해석불가_반복속명_패턴은_추측하지_않고_원문을_유지한다():
    """권위자로 오인하지 않도록: 쉼표+연도가 없으면 irregular_format으로만 표시한다."""
    p = parse_scientific_name("Nereicola Nereicola")
    assert p.canonical == "Nereicola Nereicola"  # 임의로 자르지 않음
    assert p.isUncertain
    assert p.uncertaintyType == "irregular_format"
    assert p.authority is None


def test_학명이_없으면_None을_반환한다():
    assert parse_scientific_name(None) is None
    assert parse_scientific_name("") is None


def test_to_dict_None_처리():
    d = to_dict(None)
    assert d["scientificNameRaw"] is None
    assert d["isUncertain"] is False


def test_to_dict_모든_필드_포함():
    d = to_dict(parse_scientific_name("Corbicula papyracea var. colorata"))
    assert set(d.keys()) == {
        "scientificNameRaw", "scientificNameCanonical", "authority", "subgenus",
        "infraEpithet", "rankMarker", "isSpeciesComplex", "isUncertain",
        "uncertaintyType", "authoritySource",
    }


def test_파서는_결정적이다():
    a = parse_scientific_name("Balanophyllia (Balanophyllia) vanderhorsti")
    b = parse_scientific_name("Balanophyllia (Balanophyllia) vanderhorsti")
    assert to_dict(a) == to_dict(b)
