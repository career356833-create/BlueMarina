"""Aggregate Alias Registry(§1/§2/§5/§6) 검증.
단일 종 자동 확정 금지 + 기존 Alias Registry/Tier A 완전 불변이 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_aggregate_alias_registry import build_records, load_echinoderm
from build_aggregate_alias_links import build_links
from src.aggregate_alias import AGGREGATE_TARGETS, build_candidate_pool, VALID_STATUS

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"


def load_registry() -> list[dict]:
    return json.loads((MAPPINGS / "aggregate-alias-registry.json").read_text(encoding="utf-8"))


# --- 대상 3건 / 스키마 ---
def test_대상은_불가사리_성게_해삼_3건이다():
    names = {t["sourceName"] for t in AGGREGATE_TARGETS}
    assert names == {"불가사리", "성게", "해삼"}
    assert len(load_registry()) == 3


def test_taxonomicScope가_정확하다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    assert by_name["불가사리"]["taxonomicScope"] == "Asteroidea"
    assert by_name["성게"]["taxonomicScope"] == "Echinoidea"
    assert by_name["해삼"]["taxonomicScope"] == "Holothuroidea"


def test_organismGroup은_echinoderm이다():
    for r in load_registry():
        assert r["organismGroup"] == "echinoderm"


def test_aggregateId가_전부_유일하다():
    ids = [r["aggregateId"] for r in load_registry()]
    assert len(ids) == len(set(ids)) == 3


def test_status는_유효한_값이다():
    for r in load_registry():
        assert r["status"] in VALID_STATUS


def test_필수_필드가_전부_있다():
    required = {"aggregateId", "sourceName", "organismGroup", "taxonomicScope", "status",
               "candidateSpecies", "representativeSpecies", "evidence", "createdAt", "updatedAt"}
    for r in load_registry():
        assert required <= set(r.keys())


# --- candidate pool: class 기준(이름 유사도 아님), 건수 정확 ---
def test_candidatePool_건수가_class_기준으로_정확하다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    assert len(by_name["불가사리"]["candidateSpecies"]) == 78   # Asteroidea
    assert len(by_name["성게"]["candidateSpecies"]) == 35       # Echinoidea
    assert len(by_name["해삼"]["candidateSpecies"]) == 39       # Holothuroidea


def test_candidatePool은_이름유사도가_아니라_class로만_걸러진다():
    """거미불가사리류(Ophiuroidea)는 국명에 '불가사리'가 들어가지만 class가 다르므로
    '불가사리' aggregate의 candidatePool에 포함되면 안 된다."""
    echino = load_echinoderm()
    ophiuroidea_with_name = [r for r in echino if r["taxonomy"]["class"] == "Ophiuroidea"
                             and "불가사리" in (r["koreanName"] or "")]
    assert len(ophiuroidea_with_name) > 0  # 전제 확인: 실제로 그런 종이 존재한다

    by_name = {r["sourceName"]: r for r in load_registry()}
    pool_ids = {c["internalId"] for c in by_name["불가사리"]["candidateSpecies"]}
    for r in ophiuroidea_with_name:
        assert r["internalId"] not in pool_ids, r["koreanName"]


def test_candidatePool의_모든_레코드는_지정된_class_소속이다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name, scope in (("불가사리", "Asteroidea"), ("성게", "Echinoidea"), ("해삼", "Holothuroidea")):
        pool = by_name[name]["candidateSpecies"]
        pool_ids = {c["internalId"] for c in pool}
        echino = load_echinoderm()
        for r in echino:
            if r["internalId"] in pool_ids:
                assert r["taxonomy"]["class"] == scope, r["koreanName"]


def test_build_candidate_pool_순수함수_직접_검증():
    fake = [
        {"internalId": "A", "koreanName": "가", "scientificNameCanonical": "Sci a",
         "taxonomy": {"class": "Asteroidea"}},
        {"internalId": "B", "koreanName": "나", "scientificNameCanonical": "Sci b",
         "taxonomy": {"class": "Ophiuroidea"}},
    ]
    pool = build_candidate_pool(fake, "Asteroidea")
    assert len(pool) == 1
    assert pool[0]["internalId"] == "A"


# --- 해삼 exact species 생성 금지 / representativeSpecies 자동 승인 금지 ---
def test_해삼은_특정_species로_확정되지_않았다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    assert by_name["해삼"]["representativeSpecies"] is None


def test_모든_aggregate의_representativeSpecies는_null이다():
    for r in load_registry():
        assert r["representativeSpecies"] is None, r["sourceName"]


def test_representativeSpecies는_candidateSpecies_형태의_단일_레코드가_아니다():
    """스키마 자체가 단일 species 객체({internalId, koreanName, ...})로 채워지는 걸
    허용하지만, 이번 실행 결과는 반드시 None이어야 한다(자동 확정 금지)."""
    for r in load_registry():
        assert not isinstance(r["representativeSpecies"], dict)


# --- §5 연결 파일: fish-alias-registry.json 수정 금지 ---
def test_aggregate_alias_links_3건_생성():
    links = json.loads((MAPPINGS / "aggregate-alias-links.json").read_text(encoding="utf-8"))
    assert len(links) == 3
    for l in links:
        assert l["aliasType"] == "aggregate_name"
        assert l["registryId"].startswith("AGG-")


def test_fish_alias_registry는_이번_작업으로_수정되지_않았다():
    before = (MAPPINGS / "fish-alias-registry.json").read_bytes()
    build_links()
    after = (MAPPINGS / "fish-alias-registry.json").read_bytes()
    assert before == after


def test_기존_Alias_Registry_상태는_78_69_4_그대로다():
    from collections import Counter
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    counts = Counter(r["status"] for r in registry)
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4


def test_links의_status는_fish_alias_registry_현재값을_그대로_읽어온것이다():
    links = json.loads((MAPPINGS / "aggregate-alias-links.json").read_text(encoding="utf-8"))
    alias_registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    alias_by_name = {r["sourceName"]: r for r in alias_registry}
    for l in links:
        assert l["status"] == alias_by_name[l["sourceName"]]["status"]


# --- §6 Priority 영향: 자동 Tier 변경 금지 ---
def test_impact_리포트는_representativeSpecies가_연결되지_않았다고_명시한다():
    impact = json.loads((REPORTS / "aggregate-alias-impact.json").read_text(encoding="utf-8"))
    assert impact["representativeSpeciesActuallyLinked"] is False
    assert impact["simulationOnly"] is True
    assert impact["tierAChangeIfApplied"] == 0


def test_impact_최고점후보들도_Tier_A가_아니다():
    impact = json.loads((REPORTS / "aggregate-alias-impact.json").read_text(encoding="utf-8"))
    for a in impact["aggregates"]:
        assert a["currentServiceTier"] != "A"
        assert a["alreadyInTierA"] is False


def test_기존_공식_TierA_산출물은_재생성되지_않았다():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    tier_a_resolved = json.loads((PRIORITY / "service-tier-a-resolved.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86
    assert len(tier_a_resolved) == 87


# --- 재실행 결정성 ---
def test_build_records_재실행_결정성():
    r1 = build_records()
    r2 = build_records()
    # createdAt/updatedAt은 실행 시각이라 다를 수 있으니 제외하고 비교
    def strip_ts(records):
        return [{k: v for k, v in r.items() if k not in ("createdAt", "updatedAt")} for r in records]
    assert strip_ts(r1) == strip_ts(r2)


def test_build_links_재실행_결정성():
    assert build_links() == build_links()


# --- 제한사항: fish-data.ts / MBRIS 원본 불변 ---
def test_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    for name in ("불가사리", "성게", "해삼"):
        assert name in ts, name


def test_taxonomy_master는_수정되지_않았다():
    master = json.loads((ROOT / "data/mbris/normalized/taxonomy-master.json").read_text(encoding="utf-8"))
    assert len(master) == 16587
