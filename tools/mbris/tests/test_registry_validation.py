"""validate_alias_registry.py 검증. 필수 필드·enum·충돌 탐지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.validate_alias_registry import validate_required_fields, validate_conflicts, run_validation

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def rec(**kw):
    base = {"aliasId": "ALIAS-000001", "sourceName": "테스트", "canonicalName": None,
            "internalId": None, "scientificName": None, "aliasType": "common_name",
            "status": "manual_review", "confidence": "medium",
            "evidence": [{"source": "x", "type": "y", "value": "z"}], "reviewBatch": "test"}
    base.update(kw)
    return base


# --- 필수 검증 ---
def test_정상_레코드는_오류없음():
    errors = validate_required_fields([rec()])
    assert errors == []


def test_aliasId_중복은_오류():
    errors = validate_required_fields([rec(aliasId="A1"), rec(aliasId="A1", sourceName="다른이름")])
    assert any(e["rule"] == "alias_id_duplicate" for e in errors)


def test_aliasId_없으면_오류():
    errors = validate_required_fields([rec(aliasId=None)])
    assert any(e["rule"] == "alias_id_missing" for e in errors)


def test_sourceName_없으면_오류():
    errors = validate_required_fields([rec(sourceName=None)])
    assert any(e["rule"] == "source_name_missing" for e in errors)


def test_잘못된_status는_오류():
    errors = validate_required_fields([rec(status="invalid_status")])
    assert any(e["rule"] == "invalid_status" for e in errors)


def test_잘못된_aliasType은_오류():
    errors = validate_required_fields([rec(aliasType="not_a_real_type")])
    assert any(e["rule"] == "invalid_alias_type" for e in errors)


def test_잘못된_confidence는_오류():
    errors = validate_required_fields([rec(confidence="very_high")])
    assert any(e["rule"] == "invalid_confidence" for e in errors)


def test_approved인데_internalId_없으면_오류():
    errors = validate_required_fields([rec(status="approved", internalId=None)])
    assert any(e["rule"] == "approved_missing_internal_id" for e in errors)


def test_approved이고_internalId_있으면_통과():
    errors = validate_required_fields([rec(status="approved", internalId="BM-X")])
    assert not any(e["rule"] == "approved_missing_internal_id" for e in errors)


def test_rejected는_internalId_없어도_통과():
    """§4: rejected는 internalId optional."""
    errors = validate_required_fields([rec(status="rejected", internalId=None)])
    assert not any("internal_id" in e["rule"] for e in errors)


def test_manual_review는_evidence_없으면_오류():
    errors = validate_required_fields([rec(status="manual_review", evidence=[])])
    assert any(e["rule"] == "manual_review_missing_candidate_info" for e in errors)


# --- 충돌 탐지 ---
def test_동일_alias_다른_internalId는_충돌():
    records = [rec(aliasId="A1", sourceName="같은이름", internalId="ID1"),
              rec(aliasId="A2", sourceName="같은이름", internalId="ID2")]
    conflicts = validate_conflicts(records)
    assert any(c["type"] == "same_alias_different_internal_id" for c in conflicts)


def test_같은_canonicalName_다른_종은_충돌():
    records = [rec(aliasId="A1", sourceName="가", canonicalName="표준명", internalId="ID1"),
              rec(aliasId="A2", sourceName="나", canonicalName="표준명", internalId="ID2")]
    conflicts = validate_conflicts(records)
    assert any(c["type"] == "same_canonical_name_different_species" for c in conflicts)


def test_approved_source_issue는_충돌():
    records = [rec(status="approved", aliasType="source_issue")]
    conflicts = validate_conflicts(records)
    assert any(c["type"] == "source_issue_but_approved" for c in conflicts)


def test_한_종에_여러_alias는_정상으로_기록되되_충돌목록에_노트와_함께_남는다():
    records = [rec(aliasId="A1", sourceName="갈치", canonicalName="갈치",
                   internalId="BM-1", status="approved"),
              rec(aliasId="A2", sourceName="은갈치", canonicalName="갈치",
                  internalId="BM-1", status="approved")]
    conflicts = validate_conflicts(records)
    hit = next(c for c in conflicts if c["type"] == "approved_alias_multiple_species_link")
    assert "정상" in hit["note"]


def test_충돌없는_정상데이터는_빈리스트():
    records = [rec(aliasId="A1", sourceName="가", internalId="ID1", status="manual_review")]
    assert validate_conflicts(records) == []


# --- run_validation 통합 ---
def test_run_validation_오류있으면_valid_false():
    result = run_validation([rec(status="invalid")])
    assert result["valid"] is False
    assert result["errorCount"] >= 1


def test_run_validation_정상이면_valid_true():
    result = run_validation([rec()])
    assert result["valid"] is True
    assert result["errorCount"] == 0


# --- 실제 산출물 검증 ---
def test_실제_registry는_오류0건이다():
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    result = run_validation(registry)
    assert result["errorCount"] == 0, result["errors"]


def test_검증_리포트_파일이_생성됐다():
    path = REPORTS / "alias-registry-validation.json"
    assert path.exists()
    result = json.loads(path.read_text(encoding="utf-8"))
    assert result["totalRecords"] == 151
