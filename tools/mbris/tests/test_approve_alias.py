"""approve_alias.py 검증. 실제 파일에 쓰는 유일한 도구라 안전장치가 핵심이다."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from approve_alias import validate_eligible, already_applied, find_batch_record

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"


def make_record(**overrides):
    base = {"decision": "spelling_variant", "confidence": "high",
            "candidateInternalId": "BM-X", "officialEvidence": [{"organization": "국립국어원"}]}
    base.update(overrides)
    return base


# --- validate_eligible: 승인 가능 조건 ---
def test_적격한_레코드는_통과한다():
    validate_eligible(make_record())  # 예외 없어야 함


@pytest.mark.parametrize("decision", ["aggregate_name", "market_name", "source_name_issue",
                                      "keep_manual_review", "rejected_candidate"])
def test_승인불가_decision은_거부된다(decision):
    with pytest.raises(SystemExit):
        validate_eligible(make_record(decision=decision))


@pytest.mark.parametrize("confidence", ["medium", "low"])
def test_high_미만_confidence는_거부된다(confidence):
    with pytest.raises(SystemExit):
        validate_eligible(make_record(confidence=confidence))


def test_candidateInternalId_없으면_거부된다():
    """집합명·시장명처럼 ID가 없는 판정은 여기서 걸러진다(2차 방어선)."""
    with pytest.raises(SystemExit):
        validate_eligible(make_record(candidateInternalId=None))


def test_근거없으면_거부된다():
    with pytest.raises(SystemExit):
        validate_eligible(make_record(officialEvidence=[], candidates=None))


def test_candidates필드로도_근거인정된다():
    """batch1 스타일 레코드(officialEvidence 없이 candidates만 있는 경우)도 허용."""
    validate_eligible({"decision": "spelling_variant", "confidence": "high",
                       "candidateInternalId": "BM-X", "officialEvidence": [],
                       "candidates": [{"note": "x"}]})


# --- 실제 적용된 결과 검증 ---
def test_쭈꾸미는_approved_aliases에_있다():
    aliases = json.loads((MAPPINGS / "fish-data-approved-aliases.json").read_text(encoding="utf-8"))
    names = {a["sourceName"] for a in aliases}
    assert "쭈꾸미" in names
    entry = next(a for a in aliases if a["sourceName"] == "쭈꾸미")
    assert entry["canonicalKoreanName"] == "주꾸미"
    assert entry["internalId"] == "BM-SPECIES-003107"
    assert entry["matchConfidence"] == "high"


def test_approved_aliases는_이제_3건이다():
    """1차 승인(참소라·은갈치) + 이번 라운드(쭈꾸미) = 3건."""
    aliases = json.loads((MAPPINGS / "fish-data-approved-aliases.json").read_text(encoding="utf-8"))
    assert len(aliases) == 3
    assert {a["sourceName"] for a in aliases} == {"참소라", "은갈치", "쭈꾸미"}


def test_resolved_매핑에_쭈꾸미가_추가됐다():
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    entry = next((r for r in resolved if r["sourceName"] == "쭈꾸미"), None)
    assert entry is not None
    assert entry["internalId"] == "BM-SPECIES-003107"
    assert entry["matchType"] == "approved_alias"
    assert entry["confidence"] == "high"
    assert entry["resolutionStatus"] == "resolved"


def test_resolved_매핑에_sourceName_중복이_없다():
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    names = [r["sourceName"] for r in resolved]
    assert len(names) == len(set(names))


def test_manual_review_큐에서_쭈꾸미가_제거됐다():
    queue = json.loads((MAPPINGS / "fish-data-manual-review-queue.json").read_text(encoding="utf-8"))
    names = {q["sourceName"] for q in queue}
    assert "쭈꾸미" not in names


def test_already_applied는_반영후_True를_반환한다():
    assert already_applied("쭈꾸미") is True


def test_already_applied는_미반영_이름에_False():
    assert already_applied("존재하지않는이름") is False


def test_find_batch_record는_batch2에서_쭈꾸미를_찾는다():
    rec = find_batch_record("쭈꾸미")
    assert rec["decision"] == "spelling_variant"
    assert rec["candidateInternalId"] == "BM-SPECIES-003107"


def test_find_batch_record는_없는이름에_예외():
    with pytest.raises(SystemExit):
        find_batch_record("이런이름은없다")


# --- 원본 불변(승인 라운드에서도 원본은 절대 건드리지 않음) ---
def test_fish_data_ts는_여전히_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    assert "쭈꾸미" in ts  # 원본에는 그대로 있어야 함(fish-data.ts 자체는 안 바뀜)


def test_원본_fish_data_link_은_72건_그대로다():
    """이번 승인 라운드가 건드린 건 fish-data-link-resolved.json이지
    최초 원본 fish-data-link.json이 아니다."""
    original = json.loads((MAPPINGS / "fish-data-link.json").read_text(encoding="utf-8"))
    assert len(original) == 72
    assert not any(r["sourceName"] == "쭈꾸미" for r in original)


def test_비resolved_service_priority_산출물은_불변이다():
    """service-priority.json(비-resolved 원본)은 이 승인 라운드로 바뀌면 안 된다."""
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86
    names = {t["koreanName"] for t in tier_a}
    # 원본 산출물은 이번 승인과 무관하게 그대로여야 하므로 특정 종수만 재확인
    assert len(names) == 86


# --- Tier A 영향 재계산 결과 ---
def test_주꾸미는_이미_TierA였으므로_신규편입이_아니다():
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    newly = {x["koreanName"] for x in impact["newlyEnteredTierA"]}
    assert "주꾸미" not in newly


def test_주꾸미는_점수만_오르고_티어는_유지된다():
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    entry = next((x for x in impact["scoreIncreasedTierUnchanged"]
                 if x["koreanName"] == "주꾸미"), None)
    assert entry is not None
    assert entry["scoreBefore"] < entry["scoreAfter"]
    assert entry["tier"] == "A"


def test_TierA_beforeCount는_원본_기준_86종으로_불변이다():
    """beforeTierACount는 항상 정적 원본(service-priority.json) 기준이라 이후
    라운드(Batch3 승인 등)가 몇 번 반영되든 바뀌지 않는다. afterTierACount는
    이후 라운드가 실제 반영될 때마다 달라질 수 있으므로 여기서 고정값으로 검증하지
    않는다(Batch3 반영 후 87로 바뀐 것을 test_alias_approval_batch3_apply.py가 검증)."""
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    assert impact["beforeTierACount"] == 86


# --- 중복 반영 방지 ---
def test_이미_반영된_이름을_다시_반영하면_예외():
    from approve_alias import apply
    with pytest.raises(SystemExit):
        apply("쭈꾸미", dry_run=False)
