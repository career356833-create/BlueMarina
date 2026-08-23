"""Batch1(단일후보·분류군일치 10건) 검토 검증. 자동 승인이 없는지가 핵심이다."""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_alias_review_batch1 import load_target_10, build_records, TARGET_BUCKET
from src.review_batch1_data import DECISIONS, APPROVED, REJECTED, KEEP_MANUAL_REVIEW

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"

POLLUTED_KNOWN = {"가오리 꼬리주의", "쏨뱅이 독가시", "성게가시"}
COLLECTIVE_KNOWN_SUFFIX = "류"


# --- §1/§8: 대상 추출 ---
def test_대상은_정확히_10건이다():
    target = load_target_10()
    assert len(target) == 10


def test_대상은_전부_단일후보다():
    for r in load_target_10():
        assert len(r["candidates"]) == 1, f"{r['sourceName']}은 후보가 {len(r['candidates'])}개"


def test_대상에_집합명_류접미는_없다():
    for r in load_target_10():
        assert not r["sourceName"].endswith(COLLECTIVE_KNOWN_SUFFIX), r["sourceName"]


def test_대상에_기존에_식별된_이름오염_3건은_없다():
    names = {r["sourceName"] for r in load_target_10()}
    assert names.isdisjoint(POLLUTED_KNOWN)


def test_대상에_후보없음_항목은_없다():
    for r in load_target_10():
        assert len(r["candidates"]) >= 1


def test_모든_대상은_DECISIONS에_판정이_있다():
    """src/review_batch1_data.py가 10건 전부를 다뤘는지 확인."""
    names = {r["sourceName"] for r in load_target_10()}
    assert names == set(DECISIONS.keys())


# --- §3/§8: 자동 승인 금지 ---
def test_approved_판정은_전부_증거가_존재한다():
    """approved라면 evidence가 비어있으면 안 된다(자동승인 방지의 최소 조건)."""
    for name, d in DECISIONS.items():
        if d["decision"] == APPROVED:
            assert d["evidence"], f"{name}이 approved인데 evidence가 없다"
            assert not d["conflicts"], f"{name}이 approved인데 conflicts가 남아있다: {d['conflicts']}"


def test_이름_유사도만으로는_approved가_되지_않는다():
    """쭈꾸미·한치처럼 이름 근거만 강하고 설명 근거가 약한 항목은 approved가 아니어야 한다."""
    assert DECISIONS["쭈꾸미"]["decision"] != APPROVED
    assert DECISIONS["한치"]["decision"] != APPROVED


def test_설명이_명백히_모순되면_rejected다():
    assert DECISIONS["긴꼬리상어"]["decision"] == REJECTED  # 상어 vs 뱀장어목
    assert DECISIONS["무늬벵에돔"]["decision"] == REJECTED  # 원문 "다른 어종" 명시
    assert DECISIONS["좁쌀문어"]["decision"] == REJECTED    # 초소형 vs 대형종
    assert DECISIONS["파란고리문어"]["decision"] == REJECTED  # 독성·크기 모순


def test_새로_발견된_이름오염_쥐치포용쥐치는_승인되지_않는다():
    """카테고리 조건 때문에 기존 오염탐지 로직을 피해간 사례 — 이번 검토에서 걸러야 한다."""
    assert DECISIONS["쥐치포용 쥐치"]["decision"] != APPROVED


def test_현재_배치는_승인0_거절4_보류6이다():
    counts = {"approved": 0, "rejected": 0, "keep_manual_review": 0}
    for d in DECISIONS.values():
        counts[d["decision"]] += 1
    assert counts == {"approved": 0, "rejected": 4, "keep_manual_review": 6}


# --- 산출물 스키마 ---
def test_레코드_필드가_전부_있다():
    records = build_records()
    required = {"sourceName", "candidateInternalId", "candidateKoreanName",
                "candidateScientificName", "decision", "confidence", "evidence",
                "conflicts", "reviewNote"}
    for r in records:
        assert required <= set(r.keys())


def test_decision_값은_세가지_중_하나다():
    valid = {APPROVED, REJECTED, KEEP_MANUAL_REVIEW}
    for r in build_records():
        assert r["decision"] in valid


def test_재실행_결정성():
    r1 = build_records()
    r2 = build_records()
    assert r1 == r2


# --- 원본/기존 파일 불변 ---
def test_batch1_자체는_resolved를_건드리지_않는다():
    """batch1 실행 시점(72+2=74건) 이후 resolved가 늘었다면(75건) 그건 이후
    승인 라운드(쭈꾸미)가 한 일이지 batch1 탓이 아니다 — batch1 재실행이
    resolved 파일에 아무 영향을 주지 않는지만 확인한다."""
    before = (MAPPINGS / "fish-data-link-resolved.json").read_bytes()
    build_records()
    after = (MAPPINGS / "fish-data-link-resolved.json").read_bytes()
    assert before == after


def test_resolved은_최소_74건_이상이다():
    """72(원본) + 2(1차 승인: 참소라·은갈치) 이상은 항상 유지돼야 한다.
    이후 승인 라운드가 더해질수록 늘어날 수 있다(현재 75건: +쭈꾸미)."""
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    assert len(resolved) >= 74


def test_기존_service_tier_a_86건_불변():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86


def test_fish_data_ts_는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    assert "쥐치포용 쥐치" in ts
    assert "긴꼬리상어" in ts


# --- §7 시뮬레이션 결과 ---
def test_batch1_impact_승인0건이라_Tier_A_변화없다():
    impact = json.loads((REPORTS / "fish-data-alias-batch1-impact.json").read_text(encoding="utf-8"))
    assert impact["approvedCount"] == 0
    assert impact["tierAChangeIfApplied"] == 0
    assert impact["beforeTierACount"] == impact["afterTierACountIfApplied"] == 86


def test_batch1_impact_resolvedMappingCount는_변화없다():
    impact = json.loads((REPORTS / "fish-data-alias-batch1-impact.json").read_text(encoding="utf-8"))
    assert impact["resolvedMappingCountIfApplied"] == 74


def test_batch1_impact_거절보류_합계는_10건():
    impact = json.loads((REPORTS / "fish-data-alias-batch1-impact.json").read_text(encoding="utf-8"))
    assert impact["reviewedCount"] == 10
    assert impact["rejectedCount"] + impact["keepManualReviewCount"] + impact["approvedCount"] == 10
