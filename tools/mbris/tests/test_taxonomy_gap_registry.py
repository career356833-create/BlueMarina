"""Taxonomy Gap Registry(불가사리/성게/해삼, Echinodermata) 검증.
Alias Registry와 분리 관리되는지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_taxonomy_gap_registry import build_records, GAP_TARGETS
from src.validate_taxonomy_gap import (
    run_validation, validate_required_fields, validate_no_duplicate_registration,
    validate_no_alias_registry_confusion, VALID_GROUPS, VALID_ISSUE_TYPES, VALID_STATUS,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def load_gap() -> list[dict]:
    return json.loads((MAPPINGS / "taxonomy-gap-registry.json").read_text(encoding="utf-8"))


def load_alias() -> list[dict]:
    return json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))


# --- 3건 생성, Echinodermata 기록 ---
def test_대상은_정확히_3건이다():
    assert set(GAP_TARGETS) == {"불가사리", "성게", "해삼"}
    assert len(build_records()) == 3


def test_생성된_파일도_3건이다():
    assert len(load_gap()) == 3


def test_전부_Echinodermata_group이다():
    for r in load_gap():
        assert r["group"] == "Echinodermata"


def test_koreanName이_불가사리_성게_해삼이다():
    names = {r["koreanName"] for r in load_gap()}
    assert names == {"불가사리", "성게", "해삼"}


def test_issueType은_taxonomy_missing이다():
    for r in load_gap():
        assert r["issueType"] == "taxonomy_missing"


def test_status는_planned이다():
    for r in load_gap():
        assert r["status"] == "planned"


def test_reason이_명시돼있다():
    for r in load_gap():
        assert r["reason"] == "현재 Blue Marina 후보 분류 범위에 없음"


def test_relatedCandidates가_batch3_rejected_후보_그대로다():
    b3 = json.loads((MAPPINGS / "fish-alias-review-batch3.json").read_text(encoding="utf-8"))
    b3_by_name = {r["sourceName"]: r for r in b3}
    for r in load_gap():
        expected = b3_by_name[r["koreanName"]]["candidateBefore"]
        assert len(r["relatedCandidates"]) == len(expected)
        got_ids = {c["internalId"] for c in r["relatedCandidates"]}
        expected_ids = {c["internalId"] for c in expected}
        assert got_ids == expected_ids


# --- gapId unique ---
def test_gapId가_전부_유일하다():
    ids = [r["gapId"] for r in load_gap()]
    assert len(ids) == len(set(ids))


def test_gapId_중복시_에러를_잡는다():
    broken = [dict(r) for r in load_gap()]
    broken[1] = dict(broken[1])
    broken[1]["gapId"] = broken[0]["gapId"]
    errors = validate_required_fields(broken)
    assert any(e["rule"] == "gap_id_duplicate" for e in errors)


# --- group 존재 / issueType 검증 ---
def test_group이_유효하지_않으면_에러다():
    broken = [dict(load_gap()[0])]
    broken[0]["group"] = "Mollusca"
    errors = validate_required_fields(broken)
    assert any(e["rule"] == "invalid_group" for e in errors)


def test_issueType이_유효하지_않으면_에러다():
    broken = [dict(load_gap()[0])]
    broken[0]["issueType"] = "unknown_issue"
    errors = validate_required_fields(broken)
    assert any(e["rule"] == "invalid_issue_type" for e in errors)


def test_status가_유효하지_않으면_에러다():
    broken = [dict(load_gap()[0])]
    broken[0]["status"] = "done"
    errors = validate_required_fields(broken)
    assert any(e["rule"] == "invalid_status" for e in errors)


def test_유효한_group_issueType_status_집합이다():
    assert VALID_GROUPS == {"Echinodermata"}
    assert VALID_ISSUE_TYPES == {"taxonomy_missing"}
    assert {"planned", "in_progress", "resolved"} <= VALID_STATUS


# --- 중복 등록 방지 ---
def test_중복등록이_없다():
    conflicts = validate_no_duplicate_registration(load_gap())
    assert conflicts == []


def test_같은_koreanName_group_두번_등록하면_충돌을_잡는다():
    gap = load_gap()
    duplicated = gap + [dict(gap[0], gapId="GAP-000099")]
    conflicts = validate_no_duplicate_registration(duplicated)
    assert len(conflicts) == 1
    assert conflicts[0]["type"] == "duplicate_gap_registration"


# --- Alias Registry와 혼동 없음 ---
def test_불가사리_성게_해삼은_Alias_Registry에서_approved가_아니다():
    """batch3는 이 3건을 rejected로 판정했지만, 이번 작업은 approved 3건(광어/장대/참굴)
    만 Registry에 반영한다 — rejected 판정은 별도 반영 대상이 아니므로 Registry는
    이전 상태(manual_review)를 그대로 유지한다. 여기서 확인할 것은 '아직 approved로
    잘못 확정되지 않았다'는 사실이다."""
    alias_by_name = {r["sourceName"]: r for r in load_alias()}
    for name in GAP_TARGETS:
        assert alias_by_name[name]["status"] != "approved", name


def test_gap_대상이_alias에서_approved면_충돌로_잡는다():
    gap = load_gap()
    fake_alias = [{"sourceName": "불가사리", "status": "approved",
                  "aliasId": "ALIAS-FAKE", "internalId": "BM-SPECIES-999999"}]
    conflicts = validate_no_alias_registry_confusion(gap, fake_alias)
    assert len(conflicts) == 1
    assert conflicts[0]["type"] == "gap_target_already_approved_in_alias_registry"


def test_현재_상태로는_alias와_혼동_충돌이_없다():
    result = run_validation(load_gap(), load_alias())
    assert result["conflictCount"] == 0
    assert result["valid"] is True


# --- 재실행 결정성 ---
def test_재실행_결정성():
    assert build_records() == build_records()


# --- 산출물 존재 ---
def test_산출파일이_생성됐다():
    assert (MAPPINGS / "taxonomy-gap-registry.json").exists()
    assert (MAPPINGS / "taxonomy-gap-registry.csv").exists()
    assert (REPORTS / "taxonomy-gap-validation.json").exists()


def test_validation_리포트가_유효하다고_기록됐다():
    result = json.loads((REPORTS / "taxonomy-gap-validation.json").read_text(encoding="utf-8"))
    assert result["valid"] is True
    assert result["errorCount"] == 0


# --- 극피동물 자동 추가 금지(이 Taxonomy Gap 작업 자체의 제한사항) ---
def test_이_작업_시점에는_후보_분류에_Echinodermata가_자동추가되지_않았다():
    """Taxonomy Gap Registry를 만드는 이 작업은 gap을 '기록'만 한다 — normalized 후보 풀
    자체를 건드리지 않는다. (이후 별도로 명시 승인된 작업(MBRIS Echinodermata 후보 확장,
    build_candidates.py)에서 organismGroup="echinoderm"이 candidate 레이어에 추가됐다 —
    그건 이 gap 작업이 아니라 그 후속 작업이 authorized한 변경이므로 별개 검증
    (test_echinoderm_candidate.py)의 몫이다. phylum 원문 문자열 "Echinodermata"이
    organismGroup 값으로 그대로 새어나오지 않았는지만 여기서 계속 확인한다.)"""
    fish = json.loads((ROOT / "data/mbris/normalized/blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((ROOT / "data/mbris/normalized/blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    groups = {r["organismGroup"] for r in fish + nonfish}
    assert "Echinodermata" not in groups  # phylum 원문 문자열이 그대로 새어나오면 안 된다
    assert groups <= {"fish", "cephalopod", "crustacean", "gastropod", "bivalve", "echinoderm"}
