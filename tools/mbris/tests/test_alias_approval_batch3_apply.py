"""Batch3 승인 3건(광어/장대/참굴)의 Alias Registry 실반영 검증.

이번 작업은 예외적으로 원본(fish-alias-registry.json)을 실제로 수정한다 — 그래서
"기존 파일 불변"은 fish-data.ts·MBRIS 원본에 대해서만 검증하고, Registry 자체는
"이전 75/72/4 → 이후 78/69/4로 정확히 바뀌었는가"를 검증한다.
"""
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from apply_batch3_approvals import apply, load_approved_batch3, ALIAS_TYPE_OVERRIDE
from build_resolved_mapping import build_from_registry, diff_resolved

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
REPORTS = ROOT / "data" / "mbris" / "reports"


def load_registry() -> list[dict]:
    return json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))


# --- 승인 3건이 실제로 반영됐다 ---
def test_광어_장대_참굴이_approved_상태다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name in ("광어", "장대", "참굴"):
        assert by_name[name]["status"] == "approved", name


def test_승인3건의_canonicalName_internalId_scientificName이_정확하다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    assert by_name["광어"]["canonicalName"] == "넙치"
    assert by_name["광어"]["internalId"] == "BM-SPECIES-000465"
    assert by_name["광어"]["scientificName"] == "Paralichthys olivaceus"
    assert by_name["장대"]["canonicalName"] == "양태"
    assert by_name["장대"]["internalId"] == "BM-SPECIES-000065"
    assert by_name["참굴"]["canonicalName"] == "굴"
    assert by_name["참굴"]["internalId"] == "BM-SPECIES-002965"


def test_승인3건은_기존_MBRIS_internalId를_재사용했다_새_species_아니다():
    fish = json.loads((ROOT / "data/mbris/normalized/blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((ROOT / "data/mbris/normalized/blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    known_ids = {r["internalId"] for r in fish + nonfish}
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name in ("광어", "장대", "참굴"):
        assert by_name[name]["internalId"] in known_ids, name


def test_승인3건은_reviewBatch에_batch3가_기록됐다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name in ("광어", "장대", "참굴"):
        assert "batch3" in by_name[name]["reviewBatch"].split(","), name


def test_승인3건은_기존_evidence를_보존하고_batch3_근거를_추가했다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name in ("광어", "장대", "참굴"):
        ev = by_name[name]["evidence"]
        assert any(e["type"] == "batch3_official_evidence" for e in ev), name
        # phase1_candidates/queue 등 이전 조사 이력도 그대로 남아있어야 한다(삭제 없음)
        assert any(e["type"] != "batch3_official_evidence" for e in ev), name


def test_aliasType은_사람이_직접_정한_값을_따른다():
    by_name = {r["sourceName"]: r for r in load_registry()}
    for name, expected in ALIAS_TYPE_OVERRIDE.items():
        assert by_name[name]["aliasType"] == expected, name


# --- approved 총 78건, 중복 없음 ---
def test_approved_총_78건이다():
    counts = Counter(r["status"] for r in load_registry())
    assert counts["approved"] == 78
    assert counts["manual_review"] == 69
    assert counts["rejected"] == 4


def test_aliasId_중복이_없다():
    ids = [r["aliasId"] for r in load_registry()]
    assert len(ids) == len(set(ids))


def test_sourceName_중복이_없다():
    names = [r["sourceName"] for r in load_registry()]
    assert len(names) == len(set(names))


# --- 재실행 시 중복 반영 방지 ---
def test_재실행하면_이미_반영된_3건은_건너뛴다():
    result = apply(dry_run=True)
    assert result["applied"] == []
    assert set(result["skipped"]) == {"광어", "장대", "참굴"}


# --- Resolved: 78건, 재실행 동일 결과 ---
def test_resolved가_78건이다():
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    assert len(resolved) == 78


def test_resolved에_광어_장대_참굴이_포함된다():
    resolved = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    names = {r["sourceName"] for r in resolved}
    assert {"광어", "장대", "참굴"} <= names


def test_resolved은_Registry에서_재생성해도_동일하다():
    registry = load_registry()
    current = json.loads((MAPPINGS / "fish-data-link-resolved.json").read_text(encoding="utf-8"))
    rebuilt = build_from_registry(registry)
    d = diff_resolved(current, rebuilt)
    assert d["identical"], d


def test_resolved_재생성_결정성():
    registry = load_registry()
    r1 = build_from_registry(registry)
    r2 = build_from_registry(registry)
    assert r1 == r2


# --- Service Priority 재검증 ---
def test_tier_a_resolved_87건이다():
    tier_a = json.loads((PRIORITY / "service-tier-a-resolved.json").read_text(encoding="utf-8"))
    assert len(tier_a) == 87


def test_굴이_tier_a에_신규_편입됐다():
    impact = json.loads((REPORTS / "service-priority-alias-impact.json").read_text(encoding="utf-8"))
    assert impact["tierAChange"] == 1
    newly = {x["koreanName"] for x in impact["newlyEnteredTierA"]}
    assert "굴" in newly


def test_기존_service_tier_a_86건은_변경되지_않았다():
    """service-tier-a.json은 '원본'이고 -resolved.json이 파생본이다 — 원본은 불변."""
    tier_a_original = json.loads((PRIORITY / "service-tier-a.json").read_text(encoding="utf-8"))
    assert len(tier_a_original) == 86


# --- 기존 원본 파일 불변 ---
def test_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    for name in ("광어", "장대", "참굴"):
        assert name in ts, name


def test_fish_data_link_원본_72건은_불변이다():
    original = json.loads((MAPPINGS / "fish-data-link.json").read_text(encoding="utf-8"))
    assert len(original) == 72


def test_manual_review_queue_원본은_수정되지_않았다():
    """queue는 batch3가 참조만 하는 이력 자료이며, 이번 반영으로 직접 수정하지 않는다."""
    queue = json.loads((MAPPINGS / "fish-data-manual-review-queue.json").read_text(encoding="utf-8"))
    assert len(queue) == 76


# --- batch3 approved 원본 로직 검증 ---
def test_load_approved_batch3는_정확히_3건을_반환한다():
    approved = load_approved_batch3()
    assert {r["sourceName"] for r in approved} == {"광어", "장대", "참굴"}
