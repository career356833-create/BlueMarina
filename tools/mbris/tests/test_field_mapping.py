"""FIELD_MAP/EXTRA_FIELD_MAP 자체의 정확성 테스트.

'매핑 딕셔너리가 있다'가 아니라 '각 API 필드가 정확히 그 정규화 필드로
간다'를 개별 검증한다 — 매핑을 하나 잘못 바꿔도 여기서 잡힌다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detail_normalizer import (
    normalize_detail, FIELD_MAP, EXTRA_FIELD_MAP, TAXONOMIC_STATUS_FIELD_MAP,
)


def item_with(**kw):
    return dict(kw)


def test_FIELD_MAP에_1차_생태필드_5개가_있다():
    """Tier A 5종 실응답 검증(2026-08-03)으로 ECOL(생태 서술)이 FORM과 별개
    필드임을 확인해 추가했다 — [mbris-api-field-map.md] 참고."""
    ecology_keys = {k.split(".", 1)[1] for k in FIELD_MAP if k.startswith("ecology.")}
    assert ecology_keys == {"habitat", "form", "ecologyNotes",
                            "domesticDistribution", "internationalDistribution"}


def test_FIELD_MAP에_taxonomy_필드가_5개_있다():
    """실응답 검증으로 kingdom/phylum이 추가됐다(v2까지는 class/order/family만 있었음)."""
    taxonomy_keys = {k.split(".", 1)[1] for k in FIELD_MAP if k.startswith("taxonomy.")}
    assert taxonomy_keys == {"kingdom", "phylum", "class", "order", "family"}


def test_FIELD_MAP과_EXTRA_FIELD_MAP은_소스필드가_겹치지_않는다():
    """같은 API 필드가 1차 필드와 extra 양쪽에 동시에 매핑되면 데이터가 헷갈린다."""
    primary_sources = set(FIELD_MAP.values())
    extra_sources = set(EXTRA_FIELD_MAP.values())
    assert primary_sources.isdisjoint(extra_sources)


def test_CommKorNm_은_basic_koreanName으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(CommKorNm="갈치"), raw_body=b"")
    assert d["basic"]["koreanName"] == "갈치"


def test_SpcScitfNm_은_basic_scientificName으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(SpcScitfNm="Trichiurus japonicus"), raw_body=b"")
    assert d["basic"]["scientificName"] == "Trichiurus japonicus"


def test_ClassKR_OrderKR_FamilyKR_매핑():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(ClassKR="조기어강", OrderKR="농어목", FamilyKR="갈치과"),
                         raw_body=b"")
    assert (d["taxonomy"]["class"], d["taxonomy"]["order"], d["taxonomy"]["family"]) == \
        ("조기어강", "농어목", "갈치과")


def test_HABI_은_ecology_habitat으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(HABI="암초 지대"), raw_body=b"")
    assert d["ecology"]["habitat"] == "암초 지대"


def test_FORM_은_ecology_form으로_feature가_아니다():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(FORM="몸이 길다"), raw_body=b"")
    assert d["ecology"]["form"] == "몸이 길다"
    assert "feature" not in d["ecology"]


def test_NADI_는_domesticDistribution으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(NADI="한국 전 연안"), raw_body=b"")
    assert d["ecology"]["domesticDistribution"] == "한국 전 연안"


def test_INDI_는_internationalDistribution으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(INDI="일본, 중국"), raw_body=b"")
    assert d["ecology"]["internationalDistribution"] == "일본, 중국"


def test_ABST_UTLZ_CULTIVINF_BIOCHEMICAL_ACTIVINFO는_extra로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(ABST="개요", UTLZ="활용", CULTIVINF="양식",
                                       BIOCHEMICAL="생화학", ACTIVINFO="활성"),
                         raw_body=b"")
    assert d["ecology"]["extra"] == {
        "overview": "개요", "utilization": "활용", "aquacultureInfo": "양식",
        "biochemicalInfo": "생화학", "activityInfo": "활성",
    }


def test_SpcTxnId는_basic_taxonomy_어디에도_직접_매핑되지_않고_sourceId로만_쓰인다():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(SpcTxnId="999"), raw_body=b"")
    assert d["sourceId"] == "999"
    assert "SpcTxnId" not in d["basic"]
    assert "SpcTxnId" not in d["taxonomy"]


# --- 실응답 검증(2026-08-03)으로 새로 확인된 필드 ---
def test_SpcScitfNmShort_은_basic_scientificNameShort로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(SpcScitfNm="Trichiurus japonicus Temminck & Schlegel, 1844",
                                       SpcScitfNmShort="Trichiurus japonicus"), raw_body=b"")
    assert d["basic"]["scientificName"] == "Trichiurus japonicus Temminck & Schlegel, 1844"
    assert d["basic"]["scientificNameShort"] == "Trichiurus japonicus"


def test_PhylumDivisionKR_은_taxonomy_phylum으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(PhylumDivisionKR="척삭동물문"), raw_body=b"")
    assert d["taxonomy"]["phylum"] == "척삭동물문"


def test_KingdomKR_은_taxonomy_kingdom으로():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(KingdomKR="동물계"), raw_body=b"")
    assert d["taxonomy"]["kingdom"] == "동물계"


def test_ECOL_은_ecology_ecologyNotes로_FORM과_분리된다():
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(FORM="몸이 길다", ECOL="수심 15~16도를 선호한다"),
                         raw_body=b"")
    assert d["ecology"]["form"] == "몸이 길다"
    assert d["ecology"]["ecologyNotes"] == "수심 15~16도를 선호한다"


def test_CorrNmTyp_CorrSpcScitfNm은_taxonomicStatus로_분리된다():
    """taxonomy/ecology가 아니라 '이 이름이 유효한지'를 나타내는 별도 개념이다."""
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(CorrNmTyp="정명",
                                       CorrSpcScitfNm="Trichiurus japonicus Temminck & Schlegel, 1844"),
                         raw_body=b"")
    assert d["taxonomicStatus"] == {
        "nameType": "정명",
        "correctedScientificName": "Trichiurus japonicus Temminck & Schlegel, 1844",
    }
    assert "CorrNmTyp" not in d["taxonomy"]
    assert "CorrNmTyp" not in d["ecology"]


def test_TAXONOMIC_STATUS_FIELD_MAP과_출력_키가_일치한다():
    assert set(TAXONOMIC_STATUS_FIELD_MAP.keys()) == {"nameType", "correctedScientificName"}


def test_SpcTyp은_어떤_정규화_필드에도_매핑되지_않지만_rawApiFields엔_보존된다():
    """의미가 불명확한 필드(5종 샘플 전부 '기타')를 추측해서 스키마에 넣지 않는다."""
    d = normalize_detail(internal_id="X", source_id=None,
                         item=item_with(SpcTyp="기타"), raw_body=b"")
    assert "SpcTyp" not in d["basic"]
    assert "SpcTyp" not in d["taxonomy"]
    assert "SpcTyp" not in d["ecology"]
    assert d["rawApiFields"]["SpcTyp"] == "기타"


def test_HABI가_없으면_habitat은_null이지_추측값이_아니다():
    """5종 실응답 전부 HABI가 비어 있었다 — 없는 데이터는 null로만 남긴다."""
    d = normalize_detail(internal_id="X", source_id=None, item=item_with(), raw_body=b"")
    assert d["ecology"]["habitat"] is None
