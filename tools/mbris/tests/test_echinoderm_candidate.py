"""echinoderm 후보 234건 및 §4/§5/§6 리포트 검증.
자동 승인·자동 Tier 변경·낚시 대상 자동 확정이 전혀 없었는지가 핵심."""
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

ROOT = Path(__file__).resolve().parent.parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"


def load_echinoderm() -> list[dict]:
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    return [r for r in nonfish if r["organismGroup"] == "echinoderm"]


# --- Echinodermata 234건 분류 / organismGroup 정상 ---
def test_echinoderm_후보는_234건이다():
    assert len(load_echinoderm()) == 234


def test_echinoderm_class_분포가_정확하다():
    echino = load_echinoderm()
    dist = dict(Counter(r["taxonomy"]["class"] for r in echino))
    assert dist == {"Asteroidea": 78, "Ophiuroidea": 64, "Holothuroidea": 39,
                    "Echinoidea": 35, "Crinoidea": 18}


def test_모든_echinoderm_레코드의_organismGroup과_candidateType이_echinoderm이다():
    for r in load_echinoderm():
        assert r["organismGroup"] == "echinoderm"
        assert r["candidateType"] == "echinoderm"


def test_모든_echinoderm_후보의_phylum은_Echinodermata다():
    for r in load_echinoderm():
        assert r["taxonomy"]["phylum"] == "Echinodermata"


def test_echinoderm_fishingTargetStatus는_unreviewed다():
    """§1 주의사항: 낚시 대상 확정 금지 — 전부 unreviewed로 중립 상태여야 한다."""
    for r in load_echinoderm():
        assert r["fishingTargetStatus"] == "unreviewed"


def test_echinoderm_후보_각각은_고유한_internalId를_갖는다():
    ids = [r["internalId"] for r in load_echinoderm()]
    assert len(ids) == len(set(ids)) == 234


# --- 기존 fish 1,399건 불변 ---
def test_fish_1399건_불변():
    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    assert len(fish) == 1399


def test_nonfish_전체는_기존4그룹_2933_plus_echinoderm234_3167건이다():
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    assert len(nonfish) == 3167


# --- approved alias 78건 불변 ---
def test_approved_alias_78건_불변():
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    counts = Counter(r["status"] for r in registry)
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4


def test_불가사리_성게_해삼_alias_상태는_이번_작업으로_바뀌지_않았다():
    """§4/§5는 '연결 가능 여부 확인'만 한다 — Registry의 status는 그대로 manual_review."""
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    by_name = {r["sourceName"]: r for r in registry}
    for name in ("불가사리", "성게", "해삼"):
        assert by_name[name]["status"] == "manual_review", name


# --- Tier A 기존 결과 영향 없음 ---
def test_공식_TierA_산출물은_이번_작업으로_재생성되지_않았다():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    tier_a_resolved = json.loads((PRIORITY / "service-tier-a-resolved.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86
    assert len(tier_a_resolved) == 87


def test_echinoderm은_전부_serviceTier_C이고_TierA와_겹치지_않는다():
    impact = json.loads((REPORTS / "echinoderm-priority-impact.json").read_text(encoding="utf-8"))
    assert impact["echinodermCandidateCount"] == 234
    assert impact["serviceTierDistribution"] == {"C": 234}
    assert impact["existingApprovedTierAOverlapCount"] == 0
    assert impact["simulationOnly"] is True


def test_echinoderm_fishingTargetStatus_시뮬레이션도_unknown이다():
    """priority_engine.py의 NONFISH_TARGET_GROUPS에 echinoderm을 넣지 않았으므로
    NIFS/fish-data 연결 없이는 낚시 대상이 '가능'조차 되지 않는다(자동 확정 방지)."""
    impact = json.loads((REPORTS / "echinoderm-priority-impact.json").read_text(encoding="utf-8"))
    assert impact["fishingTargetStatusDistribution"] == {"unknown": 234}


# --- §4 Taxonomy Gap 연결 확인 리포트 ---
def test_gap_resolution_리포트가_생성됐다():
    result = json.loads((REPORTS / "echinoderm-gap-resolution.json").read_text(encoding="utf-8"))
    assert result["gapGroup"] == "Echinodermata"
    assert result["resolved"] is True
    assert result["candidateCount"] == 234


def test_gap_resolution_examples가_비어있지_않다():
    result = json.loads((REPORTS / "echinoderm-gap-resolution.json").read_text(encoding="utf-8"))
    assert len(result["examples"]) > 0
    for ex in result["examples"]:
        assert ex["koreanName"] and ex["scientificName"] and ex["internalId"]


def test_gap_resolution은_exact_match가_전부_0건임을_기록한다():
    """불가사리/성게/해삼 단독 표제어는 MBRIS에 없다 — 단일종 연결 근거가 없다는 사실 자체가 중요."""
    result = json.loads((REPORTS / "echinoderm-gap-resolution.json").read_text(encoding="utf-8"))
    for t in result["byGapTarget"]:
        assert t["exactMatchCount"] == 0
        assert t["substringMatchCount"] > 0


def test_taxonomy_gap_registry_status는_이번_단계에서_바뀌지_않았다():
    gap = json.loads((MAPPINGS / "taxonomy-gap-registry.json").read_text(encoding="utf-8"))
    assert len(gap) == 3
    for g in gap:
        assert g["status"] == "planned"


# --- §5 Alias 영향 분석 리포트 ---
def test_alias_recheck_리포트가_생성됐다():
    result = json.loads((REPORTS / "echinoderm-alias-recheck.json").read_text(encoding="utf-8"))
    assert result["autoApproved"] is False
    assert len(result["items"]) == 3


def test_alias_recheck_모든_항목이_재검토_필요로_표시됐고_자동승인_아니다():
    result = json.loads((REPORTS / "echinoderm-alias-recheck.json").read_text(encoding="utf-8"))
    for item in result["items"]:
        assert item["reviewNeeded"] is True
        assert item["koreanName"] in ("불가사리", "성게", "해삼")


def test_alias_recheck_권장처리에_단일종_강제_연결이_없다():
    """recommendation 문자열 어디에도 특정 학명 하나로 확정하라는 문구가 없어야 한다
    (aggregate_name 검토 필요 / 추가 근거 확보 후 재검토만 허용)."""
    result = json.loads((REPORTS / "echinoderm-alias-recheck.json").read_text(encoding="utf-8"))
    allowed_prefixes = ("aggregate_name 검토 필요", "단일 종 확정 검토 가능", "추가 근거 확보 후 재검토")
    for item in result["items"]:
        assert item["recommendation"].startswith(allowed_prefixes), item


# --- 재실행 결정성 ---
def test_gap_resolution_재실행_결정성():
    import build_echinoderm_gap_resolution as mod
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        mod.main()
    r1 = json.loads((REPORTS / "echinoderm-gap-resolution.json").read_text(encoding="utf-8"))
    with contextlib.redirect_stdout(buf):
        mod.main()
    r2 = json.loads((REPORTS / "echinoderm-gap-resolution.json").read_text(encoding="utf-8"))
    r1.pop("generatedAt"); r2.pop("generatedAt")
    assert r1 == r2


def test_priority_impact_재실행_결정성():
    import build_echinoderm_priority_impact as mod
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        mod.main()
    r1 = json.loads((REPORTS / "echinoderm-priority-impact.json").read_text(encoding="utf-8"))
    with contextlib.redirect_stdout(buf):
        mod.main()
    r2 = json.loads((REPORTS / "echinoderm-priority-impact.json").read_text(encoding="utf-8"))
    r1.pop("generatedAt"); r2.pop("generatedAt")
    assert r1 == r2


# --- 제한사항: MBRIS 원본/운영 반영 없음 ---
def test_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    for name in ("불가사리", "성게", "해삼"):
        assert name in ts, name
