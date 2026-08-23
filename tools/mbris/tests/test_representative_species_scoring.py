"""§3/§4 대표종 후보 점수 계산 검증. 점수는 순서를 정할 뿐 승인이 아니라는 게 핵심 —
어떤 점수를 받아도 자동으로 representativeSpecies가 채워지면 안 된다."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.representative_species_scoring import score_representative_candidate, WEIGHTS
from build_aggregate_species_priority import build_priority_for_aggregate, load_taxonomy_by_id

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"


def species(**kw):
    base = {"internalId": "BM-X", "koreanName": "해삼test",
            "scientificNameParsing": {"isUncertain": False, "uncertaintyType": None},
            "holdingInstitutions": []}
    base.update(kw)
    return base


# --- 개별 가점/감점 항목 ---
def test_국명_존재하면_10점():
    r = score_representative_candidate(species(koreanName="해삼가짜"), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "MBRIS_KOREAN_NAME_EXISTS" in r["reasons"]


def test_국명_없으면_10점_안준다():
    r = score_representative_candidate(species(koreanName=None), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "MBRIS_KOREAN_NAME_EXISTS" not in r["reasons"]


def test_보유기관_있으면_5점():
    r = score_representative_candidate(species(holdingInstitutions=["국립해양생물자원관"]),
                                       source_name="해삼", nifs_linked=False, fish_data_linked=False)
    assert "HOLDING_INSTITUTION_EXISTS" in r["reasons"]
    assert 5 in [WEIGHTS[x][0] for x in r["reasons"]]


def test_NIFS_연결시_30점():
    r = score_representative_candidate(species(), source_name="해삼",
                                       nifs_linked=True, fish_data_linked=False)
    assert "NIFS_LINKED" in r["reasons"]
    assert WEIGHTS["NIFS_LINKED"][0] == 30


def test_fish_data_연결시_30점():
    r = score_representative_candidate(species(), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=True)
    assert "FISH_DATA_LINKED" in r["reasons"]
    assert WEIGHTS["FISH_DATA_LINKED"][0] == 30


def test_미동정이면_20점_감점():
    r = score_representative_candidate(
        species(scientificNameParsing={"isUncertain": True, "uncertaintyType": "unidentified_species"}),
        source_name="해삼", nifs_linked=False, fish_data_linked=False)
    assert "UNIDENTIFIED_SPECIES" in r["reasons"]
    assert "SCIENTIFIC_NAME_UNCERTAIN" not in r["reasons"]  # 미동정과 중복 감점 안 함


def test_학명_불확실이면_10점_감점():
    r = score_representative_candidate(
        species(scientificNameParsing={"isUncertain": True, "uncertaintyType": "unconfirmed_similar"}),
        source_name="해삼", nifs_linked=False, fish_data_linked=False)
    assert "SCIENTIFIC_NAME_UNCERTAIN" in r["reasons"]


def test_국명에_sourceName이_없으면_10점_감점():
    r = score_representative_candidate(species(koreanName="아무개고둥"), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "NAME_ONLY_CANDIDATE" in r["reasons"]


def test_국명에_sourceName이_있으면_감점_없다():
    r = score_representative_candidate(species(koreanName="가시닻해삼"), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "NAME_ONLY_CANDIDATE" not in r["reasons"]


def test_총점은_reasons_가중치_합과_같다():
    r = score_representative_candidate(species(koreanName="가시닻해삼",
                                               holdingInstitutions=["기관"]),
                                       source_name="해삼", nifs_linked=True, fish_data_linked=False)
    expected = sum(WEIGHTS[x][0] for x in r["reasons"])
    assert r["score"] == expected


# --- 데이터 소스가 없어 항상 미충족인 두 항목 ---
def test_국내분포_데이터_없으면_기본값_False로_점수_안준다():
    r = score_representative_candidate(species(), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "DOMESTIC_DISTRIBUTION_DATA_EXISTS" not in r["reasons"]


def test_상업대중성_데이터_없으면_기본값_False로_점수_안준다():
    r = score_representative_candidate(species(), source_name="해삼",
                                       nifs_linked=False, fish_data_linked=False)
    assert "COMMERCIAL_POPULARITY_DATA_EXISTS" not in r["reasons"]


def test_명시적으로_True를_주면_국내분포_점수가_반영된다():
    """항상 False라는 게 함수 자체의 한계가 아니라 '현재 이 실행에 데이터가 없어서'
    임을 확인한다 — 함수는 인자를 받으면 정상적으로 점수를 준다."""
    r = score_representative_candidate(species(), source_name="해삼", nifs_linked=False,
                                       fish_data_linked=False, has_domestic_distribution_data=True,
                                       has_commercial_popularity_data=True)
    assert "DOMESTIC_DISTRIBUTION_DATA_EXISTS" in r["reasons"]
    assert "COMMERCIAL_POPULARITY_DATA_EXISTS" in r["reasons"]


# --- 자동 승인 금지: 점수 계산 자체는 확정이 아니다 ---
def test_score_representative_candidate는_representativeSpecies_필드를_만들지_않는다():
    r = score_representative_candidate(species(), source_name="해삼",
                                       nifs_linked=True, fish_data_linked=True)
    assert "representativeSpecies" not in r
    assert set(r.keys()) == {"internalId", "koreanName", "scientificName", "score", "reasons"}


# --- 실제 산출물(§4) 검증 ---
def load_agg_priority() -> list[dict]:
    return json.loads((PRIORITY / "aggregate-species-priority.json").read_text(encoding="utf-8"))


def test_aggregate_species_priority_3건_생성():
    data = load_agg_priority()
    assert {a["aggregateName"] for a in data} == {"불가사리", "성게", "해삼"}


def test_각_aggregate의_candidateSpecies_건수가_registry와_일치한다():
    registry = json.loads((MAPPINGS / "aggregate-alias-registry.json").read_text(encoding="utf-8"))
    priority = load_agg_priority()
    reg_by_name = {r["sourceName"]: r for r in registry}
    for p in priority:
        assert len(p["candidateSpecies"]) == len(reg_by_name[p["aggregateName"]]["candidateSpecies"])


def test_candidateSpecies는_score_내림차순_정렬이다():
    for p in load_agg_priority():
        scores = [c["score"] for c in p["candidateSpecies"]]
        assert scores == sorted(scores, reverse=True)


def test_현재_NIFS_fish_data_연결이_전무해서_모든_점수가_60미만이다():
    """NIFS_LINKED(+30)+FISH_DATA_LINKED(+30) 둘 다 없으므로 최고점도 60에 못 미친다
    (실제로 지금 이 데이터셋 기준 최고점은 15)."""
    for p in load_agg_priority():
        for c in p["candidateSpecies"]:
            assert c["score"] < 60


def test_build_priority_재실행_결정성():
    priority = json.loads((MAPPINGS / "aggregate-alias-registry.json").read_text(encoding="utf-8"))
    from src.priority_engine import resolve_nifs_links
    taxonomy_by_id = load_taxonomy_by_id()
    nifs_by_id = resolve_nifs_links(
        json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8")))
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    fish_data_ids = {r["internalId"] for r in resolved}

    agg = priority[0]
    r1 = build_priority_for_aggregate(agg, taxonomy_by_id=taxonomy_by_id, nifs_by_id=nifs_by_id,
                                      fish_data_ids=fish_data_ids)
    r2 = build_priority_for_aggregate(agg, taxonomy_by_id=taxonomy_by_id, nifs_by_id=nifs_by_id,
                                      fish_data_ids=fish_data_ids)
    assert r1 == r2
