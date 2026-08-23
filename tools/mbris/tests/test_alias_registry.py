"""fish-alias-registry.json 병합 로직 검증. 우선순위·evidence 병합·특정 종 상태가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.alias_registry import (
    Assertion, merge_assertions, detect_conflicts, assertions_from_link72,
    assertions_from_candidates, assertions_from_batch1, assertions_from_batch2,
    assertions_from_approved_aliases, assertions_from_queue,
    APPROVED, REJECTED, MANUAL_REVIEW, CANDIDATE, DIALECT, SPELLING_VARIANT,
    AGGREGATE_NAME, MARKET_NAME, SOURCE_ISSUE, COMMON_NAME,
)
from build_alias_registry import build_records, assign_ids

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"


def a(status, alias_type=None, internal_id=None, canonical=None, sci=None,
     confidence="medium", evidence=None, batch=None):
    return Assertion(status=status, aliasType=alias_type, internalId=internal_id,
                     canonicalName=canonical, scientificName=sci, confidence=confidence,
                     evidence=evidence or [{"source": "x", "type": "y", "value": "z"}],
                     reviewBatch=batch)


# --- 우선순위: approved > rejected > manual_review > candidate ---
def test_approved가_manual_review를_이긴다():
    merged = merge_assertions([{"X": [a(MANUAL_REVIEW), a(APPROVED, internal_id="ID1")]}])
    assert merged["X"]["status"] == APPROVED


def test_rejected가_manual_review를_이긴다():
    merged = merge_assertions([{"X": [a(MANUAL_REVIEW), a(REJECTED)]}])
    assert merged["X"]["status"] == REJECTED


def test_manual_review가_candidate를_이긴다():
    merged = merge_assertions([{"X": [a(CANDIDATE), a(MANUAL_REVIEW)]}])
    assert merged["X"]["status"] == MANUAL_REVIEW


def test_approved가_전부를_이긴다():
    merged = merge_assertions([{"X": [a(CANDIDATE), a(MANUAL_REVIEW), a(REJECTED), a(APPROVED)]}])
    assert merged["X"]["status"] == APPROVED


# --- 동률 시 authority 순서로 필드를 고른다(회귀 테스트) ---
def test_동률이면_최신_authority가_필드를_이긴다():
    """phase1_candidates(오래됨)와 approval_round(최신)가 둘 다 approved면,
    approval_round의 aliasType/canonicalName이 이겨야 한다."""
    old = a(APPROVED, alias_type=COMMON_NAME, canonical="구이름", batch="phase1_candidates")
    new = a(APPROVED, alias_type=DIALECT, canonical="새이름", batch="approval_round")
    merged = merge_assertions([{"X": [old, new]}])
    assert merged["X"]["aliasType"] == DIALECT
    assert merged["X"]["canonicalName"] == "새이름"


def test_동률이어도_순서를_바꿔_넣으면_결과가_같다():
    """입력 리스트 순서와 무관하게 authority 순서로 결정돼야 한다."""
    old = a(APPROVED, alias_type=COMMON_NAME, batch="phase1_candidates")
    new = a(APPROVED, alias_type=DIALECT, batch="approval_round")
    m1 = merge_assertions([{"X": [old, new]}])
    m2 = merge_assertions([{"X": [new, old]}])
    assert m1["X"]["aliasType"] == m2["X"]["aliasType"] == DIALECT


# --- evidence는 삭제하지 않고 전부 병합 ---
def test_evidence는_모든_assertion에서_합쳐진다():
    e1 = [{"source": "A", "type": "t1", "value": "v1"}]
    e2 = [{"source": "B", "type": "t2", "value": "v2"}]
    merged = merge_assertions([{"X": [a(MANUAL_REVIEW, evidence=e1), a(APPROVED, evidence=e2)]}])
    sources = {e["source"] for e in merged["X"]["evidence"]}
    assert sources == {"A", "B"}  # 패자(manual_review)의 evidence도 안 버림


def test_evidence_중복은_한번만_남는다():
    e = [{"source": "A", "type": "t", "value": "v"}]
    merged = merge_assertions([{"X": [a(APPROVED, evidence=e), a(APPROVED, evidence=e)]}])
    assert len(merged["X"]["evidence"]) == 1


def test_internalId가_없는_승자는_패자에서_보충된다():
    merged = merge_assertions([{"X": [a(CANDIDATE, internal_id="ID-FROM-CANDIDATE"),
                                      a(MANUAL_REVIEW, internal_id=None)]}])
    assert merged["X"]["internalId"] == "ID-FROM-CANDIDATE"


# --- detect_conflicts ---
def test_같은_canonical_다른_id는_충돌로_잡힌다():
    records = {
        "가": {"canonicalName": "표준명", "internalId": "ID1", "status": "manual_review",
              "aliasType": "common_name"},
        "나": {"canonicalName": "표준명", "internalId": "ID2", "status": "manual_review",
              "aliasType": "common_name"},
    }
    conflicts = detect_conflicts(records)
    assert any(c["type"] == "same_canonical_name_multiple_species" for c in conflicts)


def test_source_issue인데_approved면_충돌():
    records = {"가": {"canonicalName": None, "internalId": "ID1", "status": "approved",
                     "aliasType": "source_issue", "sourceName": "가"}}
    conflicts = detect_conflicts(records)
    assert any(c["type"] == "source_issue_but_approved" for c in conflicts)


# --- 실제 파일 기반 통합 테스트: 핵심 종들이 올바른 상태인지 ---
def test_승인alias_3건이_approved다():
    merged = build_records()
    for name, canonical in [("참소라", "소라"), ("은갈치", "갈치"), ("쭈꾸미", "주꾸미")]:
        assert merged[name]["status"] == APPROVED, name
        assert merged[name]["canonicalName"] == canonical, name


def test_참소라_은갈치는_dialect_타입이다():
    merged = build_records()
    assert merged["참소라"]["aliasType"] == DIALECT
    assert merged["은갈치"]["aliasType"] == DIALECT


def test_쭈꾸미는_spelling_variant_타입이다():
    merged = build_records()
    assert merged["쭈꾸미"]["aliasType"] == SPELLING_VARIANT


def test_한치는_manual_review_aggregate다():
    merged = build_records()
    assert merged["한치"]["status"] == MANUAL_REVIEW
    assert merged["한치"]["aliasType"] == AGGREGATE_NAME
    assert merged["한치"]["confidence"] == "high"


def test_대삼치는_manual_review_market이다():
    merged = build_records()
    assert merged["대삼치"]["status"] == MANUAL_REVIEW
    assert merged["대삼치"]["aliasType"] == MARKET_NAME


def test_쥐치포용쥐치는_manual_review_source_issue다():
    merged = build_records()
    assert merged["쥐치포용 쥐치"]["status"] == MANUAL_REVIEW
    assert merged["쥐치포용 쥐치"]["aliasType"] == SOURCE_ISSUE


def test_긴꼬리상어_등_batch1_거절4건은_rejected로_승격된다():
    """큐에는 여전히 manual_review로 남아있지만, batch1의 명시적 거절이 이겨야 한다
    (이게 이번 Registry 통합의 핵심 목적 — 파일 간 불일치 해소)."""
    merged = build_records()
    for name in ("긴꼬리상어", "무늬벵에돔", "좁쌀문어", "파란고리문어"):
        assert merged[name]["status"] == REJECTED, name


def test_전체_레코드수는_151건이다():
    """72(원본 매칭) + 79(미매칭 검토 파이프라인) = 151(fish-data.ts 고유 이름 전체)."""
    merged = build_records()
    assert len(merged) == 151


# --- assign_ids ---
def test_aliasId는_ALIAS_형식이고_유일하다():
    merged = build_records()
    records = assign_ids(merged)
    ids = [r["aliasId"] for r in records]
    assert len(ids) == len(set(ids))
    assert all(i.startswith("ALIAS-") and len(i) == len("ALIAS-000000") for i in ids)


def test_assign_ids_재실행_결정성():
    merged = build_records()
    r1 = assign_ids(merged)
    r2 = assign_ids(merged)
    ids1 = [(r["aliasId"], r["sourceName"]) for r in r1]
    ids2 = [(r["aliasId"], r["sourceName"]) for r in r2]
    assert ids1 == ids2


# --- 원본 입력 파일 불변 ---
def test_registry_생성은_입력파일을_건드리지_않는다():
    inputs = ["fish-data-link.json", "fish-data-alias-candidates.json",
             "fish-data-alias-review-batch1.json", "fish-data-alias-review-batch2.json",
             "fish-data-approved-aliases.json", "fish-data-manual-review-queue.json"]
    before = {f: (MAPPINGS / f).read_bytes() for f in inputs}
    build_records()
    after = {f: (MAPPINGS / f).read_bytes() for f in inputs}
    assert before == after
