"""build_resolved_mapping.py 검증. Registry→Resolved 파생이 기존 결과와 동일한지가 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_resolved_mapping import derive_resolved_record, build_from_registry, diff_resolved

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"


def reg(**kw):
    base = {"sourceName": "테스트", "internalId": "BM-X", "confidence": "high",
            "status": "approved", "evidence": []}
    base.update(kw)
    return base


# --- derive_resolved_record ---
def test_원본_MBRIS_매칭이_있으면_그_matchType을_복원한다():
    r = reg(evidence=[{"source": "MBRIS_KOREAN_NAME_MATCH", "type": "korean_candidate", "value": "x"}])
    out = derive_resolved_record(r)
    assert out["matchType"] == "korean_candidate"
    assert out["evidenceSource"] == "MBRIS_KOREAN_NAME_MATCH"


def test_NIFS_경유_매칭도_복원된다():
    r = reg(evidence=[{"source": "NIFS_TRANSITIVE", "type": "synonym", "value": "x"}])
    out = derive_resolved_record(r)
    assert out["matchType"] == "synonym"
    assert out["evidenceSource"] == "NIFS_TRANSITIVE"


def test_순수_alias_승인은_approved_alias로_고정된다():
    r = reg(evidence=[{"source": "NIFS_DIALECT", "type": "approval", "value": "x"}])
    out = derive_resolved_record(r)
    assert out["matchType"] == "approved_alias"
    assert out["evidenceSource"] == "NIFS_DIALECT"


def test_approval_근거도_없으면_기본값으로_떨어진다():
    r = reg(evidence=[])
    out = derive_resolved_record(r)
    assert out["matchType"] == "approved_alias"
    assert out["evidenceSource"] == "REGISTRY_APPROVAL"


# --- build_from_registry ---
def test_approved만_포함되고_나머지는_제외된다():
    registry = [reg(sourceName="가", status="approved"),
               reg(sourceName="나", status="manual_review"),
               reg(sourceName="다", status="rejected")]
    out = build_from_registry(registry)
    assert {r["sourceName"] for r in out} == {"가"}


def test_출력은_sourceName_정렬순이다():
    registry = [reg(sourceName="다"), reg(sourceName="가"), reg(sourceName="나")]
    out = build_from_registry(registry)
    assert [r["sourceName"] for r in out] == ["가", "나", "다"]


# --- diff_resolved ---
def test_동일하면_identical_true():
    old = [{"sourceName": "가", "internalId": "ID1"}]
    new = [{"sourceName": "가", "internalId": "ID1"}]
    d = diff_resolved(old, new)
    assert d["identical"] is True


def test_필드가_다르면_changedFields에_기록():
    old = [{"sourceName": "가", "internalId": "ID1"}]
    new = [{"sourceName": "가", "internalId": "ID2"}]
    d = diff_resolved(old, new)
    assert not d["identical"]
    assert len(d["changedFields"]) == 1


def test_새로생긴_항목은_onlyInNew():
    old = []
    new = [{"sourceName": "가", "internalId": "ID1"}]
    d = diff_resolved(old, new)
    assert d["onlyInNew"] == ["가"]
    assert not d["identical"]


def test_사라진_항목은_onlyInOld():
    old = [{"sourceName": "가", "internalId": "ID1"}]
    new = []
    d = diff_resolved(old, new)
    assert d["onlyInOld"] == ["가"]


# --- 실제 파일 기반: Registry 재생성 결과가 현재 resolved와 동일한지 ---
def test_registry에서_재생성한_resolved는_현재파일과_동일하다():
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    current = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    rebuilt = build_from_registry(registry)
    d = diff_resolved(current, rebuilt)
    assert d["identical"], d


def test_resolved_78건_유지():
    """Batch3 승인 3건(광어/장대/참굴) 실반영으로 75 -> 78건이 됐다."""
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    assert len(resolved) == 78


def test_TierA_86건_불변():
    tier_a = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 86


def test_재실행_결정성():
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    r1 = build_from_registry(registry)
    r2 = build_from_registry(registry)
    assert r1 == r2


def test_원본_fish_data_link_72건은_이_과정에서도_불변이다():
    original = json.loads((MAPPINGS / "fish-data-link.json").read_text(encoding="utf-8"))
    assert len(original) == 72
