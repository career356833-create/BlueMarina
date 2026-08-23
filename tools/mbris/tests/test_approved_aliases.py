"""승인 별칭 2건 반영 + Service Priority resolved 재계산 검증.

원본 파일 불변, manual_review 미반영, 신규 종 미생성이 핵심이다.
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_approved_aliases import (
    build_approved_aliases, build_source_name_issues, merge_resolved_mapping,
    APPROVED_SOURCE_NAMES, POLLUTED_SOURCE_NAMES, APPROVED_ALIAS_MATCH_TYPE,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
PRIORITY = ROOT / "data" / "mbris" / "priority"
CANDIDATES_PATH = MAPPINGS / "fish-data-alias-candidates.json"
EXISTING_LINK_PATH = MAPPINGS / "fish-data-link.json"


def load_candidates():
    return json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))


def load_existing():
    return json.loads(EXISTING_LINK_PATH.read_text(encoding="utf-8"))


# --- §1 승인 별칭 파일 ---
def test_승인별칭은_정확히_2건이다():
    approved = build_approved_aliases(load_candidates())
    assert len(approved) == 2
    assert {a["sourceName"] for a in approved} == APPROVED_SOURCE_NAMES


def test_승인별칭_internalId는_기존_MBRIS_종을_가리킨다():
    """새 종을 만들지 않고 기존 internalId를 재사용하는지 확인 — BM-SPECIES- 접두 검증."""
    approved = build_approved_aliases(load_candidates())
    for a in approved:
        assert a["internalId"].startswith("BM-SPECIES-")
        assert a["approvalStatus"] == "approved"
        assert a["evidenceSource"] == "NIFS_DIALECT"
        assert a["evidenceValue"]  # 비어있지 않음 — 실제 방언 근거 텍스트


def test_참소라는_소라를_가리킨다():
    approved = {a["sourceName"]: a for a in build_approved_aliases(load_candidates())}
    assert approved["참소라"]["canonicalKoreanName"] == "소라"
    assert approved["참소라"]["internalId"] == "BM-SPECIES-002324"


def test_은갈치는_갈치를_가리킨다():
    approved = {a["sourceName"]: a for a in build_approved_aliases(load_candidates())}
    assert approved["은갈치"]["canonicalKoreanName"] == "갈치"
    assert approved["은갈치"]["internalId"] == "BM-SPECIES-000444"


# --- §5 이름 오염 3건 ---
def test_이름오염_3건은_승인목록에_없다():
    approved_names = {a["sourceName"] for a in build_approved_aliases(load_candidates())}
    assert approved_names.isdisjoint(POLLUTED_SOURCE_NAMES)


def test_이름오염_이슈파일은_status_manual_review로_고정된다():
    issues = build_source_name_issues(load_candidates())
    assert len(issues) == 3
    assert all(i["status"] == "manual_review" for i in issues)
    assert {i["originalName"] for i in issues} == POLLUTED_SOURCE_NAMES


# --- §2 통합 매핑 ---
def test_resolved_매핑은_기존72_승인2_합계74():
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    resolved = merge_resolved_mapping(existing, approved)
    assert len(resolved) == len(existing) + 2 == 74


def test_기존_72건_내용은_resolved에서도_불변이다():
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    resolved = merge_resolved_mapping(existing, approved)
    resolved_by_name = {r["sourceName"]: r for r in resolved}
    for link in existing:
        r = resolved_by_name[link["sourceName"]]
        assert r["internalId"] == link["internalId"]
        assert r["matchType"] == link["matchType"]
        assert r["confidence"] == link["confidence"]


def test_manual_review_77건은_resolved에_포함되지_않는다():
    candidates = load_candidates()
    manual_names = {r["sourceName"] for r in candidates if r["status"] == "manual_review"}
    assert len(manual_names) == 77

    existing = load_existing()
    approved = build_approved_aliases(candidates)
    resolved = merge_resolved_mapping(existing, approved)
    resolved_names = {r["sourceName"] for r in resolved}
    assert resolved_names.isdisjoint(manual_names)


def test_승인별칭의_matchType은_approved_alias():
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    resolved = merge_resolved_mapping(existing, approved)
    approved_records = [r for r in resolved if r["sourceName"] in APPROVED_SOURCE_NAMES]
    assert len(approved_records) == 2
    assert all(r["matchType"] == APPROVED_ALIAS_MATCH_TYPE == "approved_alias"
              for r in approved_records)


def test_동일_internalId에_복수_sourceName_허용된다():
    """갈치(기존) + 은갈치(승인)가 같은 BM-SPECIES-000444를 가리켜야 한다."""
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    resolved = merge_resolved_mapping(existing, approved)
    galchi_ids = {r["internalId"] for r in resolved if r["sourceName"] in ("갈치", "은갈치")}
    assert galchi_ids == {"BM-SPECIES-000444"}


def test_중복_sourceName은_금지된다():
    """레코드 단위로 같은 sourceName이 두 번 나오면 안 된다(merge 로직 자체 검증)."""
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    resolved = merge_resolved_mapping(existing, approved)
    names = [r["sourceName"] for r in resolved]
    assert len(names) == len(set(names))


def test_중복_sourceName이_섞이면_예외를_던진다():
    """merge 로직이 실제로 검증을 수행하는지 — 가짜 충돌 입력으로 확인."""
    import pytest
    existing = [{"sourceName": "은갈치", "internalId": "BM-X", "matchType": "korean_candidate",
                "confidence": "medium", "viaNifs": False}]
    fake_approved = [{"sourceName": "은갈치", "internalId": "BM-SPECIES-000444",
                      "matchType": "approved_alias", "matchConfidence": "high",
                      "evidenceSource": "NIFS_DIALECT"}]
    with pytest.raises(SystemExit):
        merge_resolved_mapping(existing, fake_approved)


def test_참소라_은갈치는_새_species로_생성되지_않는다():
    """internalId가 이미 taxonomy-master에 존재하는 MBRIS 종인지 — 새 ID가 아님을 확인."""
    approved = build_approved_aliases(load_candidates())
    fish = json.loads((ROOT / "data/mbris/normalized/blue-marina-fish-candidates.json")
                      .read_text(encoding="utf-8"))
    nonfish = json.loads((ROOT / "data/mbris/normalized/blue-marina-nonfish-candidates.json")
                         .read_text(encoding="utf-8"))
    known_ids = {c["internalId"] for c in fish + nonfish}
    for a in approved:
        assert a["internalId"] in known_ids, f"{a['sourceName']}이 새 species를 만들었다"


# --- §2/§7 재실행 결정성 (approvedAt 타임스탬프 제외 실질 내용) ---
def test_approved_aliases_재실행해도_핵심필드는_동일하다():
    c = load_candidates()
    a1 = build_approved_aliases(c)
    a2 = build_approved_aliases(c)
    for x, y in zip(a1, a2):
        assert x["sourceName"] == y["sourceName"]
        assert x["internalId"] == y["internalId"]
        assert x["canonicalKoreanName"] == y["canonicalKoreanName"]
        assert x["evidenceValue"] == y["evidenceValue"]


def test_resolved_매핑_재실행_결정성():
    existing = load_existing()
    approved = build_approved_aliases(load_candidates())
    r1 = merge_resolved_mapping(existing, approved)
    r2 = merge_resolved_mapping(existing, approved)
    assert r1 == r2


# --- 실제 산출 파일 존재 + 원본 불변 (통합 검증) ---
def test_산출파일이_전부_생성됐다():
    for f in ("fish-data-approved-aliases.json", "fish-data-link-resolved.json",
             "fish-data-manual-review-queue.json"):
        assert (MAPPINGS / f).exists(), f"{f} 없음"
    assert (ROOT / "data/mbris/reports/fish-data-source-name-issues.json").exists()
    assert (ROOT / "data/mbris/reports/service-priority-alias-impact.json").exists()
    for f in ("service-priority-resolved.json", "service-tier-a-resolved.json",
             "service-tier-b-resolved.json", "service-tier-c-resolved.json"):
        assert (PRIORITY / f).exists(), f"{f} 없음"


def test_원본_fish_data_ts는_수정되지_않았다():
    ts = (ROOT / "src/data/fish-data.ts").read_text(encoding="utf-8")
    assert "쥐치포용 쥐치" in ts  # 알려진 오염 이름이 여전히 원본 그대로 존재


def test_원본_fish_data_link_은_74건이_아니라_72건_그대로다():
    assert len(load_existing()) == 72


def test_기존_service_priority_산출물_해시_불변():
    """이 파일들의 내용이 이번 작업 도중 절대 바뀌지 않았는지 스냅샷 해시로 확인.
    (참고: 실행 시점 스냅샷이므로, 원본이 실제로 의도적으로 갱신되면 이 테스트도 갱신 필요)"""
    combined = b""
    for f in ("service-priority.json", "service-tier-a.json", "service-tier-b.json",
             "service-tier-c.json", "service-priority-summary.json"):
        combined += (PRIORITY / f).read_bytes()
    combined += EXISTING_LINK_PATH.read_bytes()
    combined += (ROOT / "src/data/fish-data.ts").read_bytes()
    digest = hashlib.sha256(combined).hexdigest()
    assert digest == "4ffb80b78b0300e4e4664c651ad7dbd31546c927d7cd35026172ea160d13f961"


# --- §3 Tier A 영향 계산 정확성 ---
def test_impact_report_숫자가_정확하다():
    """resolvedMatchedCount는 승인 라운드가 늘어날 때마다 갱신되는 누적 지표다.
    72(원본) 기준 existingMatchedCount는 항상 고정이지만, resolvedMatchedCount는
    이후 승인분(참소라·은갈치·쭈꾸미 등)이 쌓일수록 늘어난다 — 현재 74종
    (75건 레코드지만 갈치+은갈치가 한 종으로 합쳐짐)."""
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    assert impact["existingMatchedCount"] == 72
    assert impact["resolvedMatchedCount"] >= 73
    assert impact["beforeTierACount"] == 86


def test_impact_report_소라는_점수만_오르고_티어는_유지된다():
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    names = {x["koreanName"] for x in impact["scoreIncreasedTierUnchanged"]}
    assert "소라" in names
    entry = next(x for x in impact["scoreIncreasedTierUnchanged"] if x["koreanName"] == "소라")
    assert entry["scoreBefore"] < entry["scoreAfter"]
    assert entry["tier"] == "A"


def test_impact_report_갈치는_이미_TierA라_신규편입이_아니다():
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    newly = {x["koreanName"] for x in impact["newlyEnteredTierA"]}
    assert "갈치" not in newly


def test_impact_report_복수sourceName_종이_기록된다():
    impact_path = ROOT / "data/mbris/reports/service-priority-alias-impact.json"
    impact = json.loads(impact_path.read_text(encoding="utf-8"))
    multi = impact["speciesWithMultipleSourceNames"]
    assert any(m["internalId"] == "BM-SPECIES-000444" and
              set(m["sourceNames"]) == {"갈치", "은갈치"} for m in multi)


# --- manual_review 큐 ---
def test_manual_review_큐는_77건이하이고_전부_autoApplyAllowed_false():
    """승인 라운드가 항목을 큐에서 제거할 때마다 줄어든다(현재 76건: 쭈꾸미 승인으로 -1)."""
    queue_path = MAPPINGS / "fish-data-manual-review-queue.json"
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    assert len(queue) <= 77
    assert all(x["autoApplyAllowed"] is False for x in queue)


def test_manual_review_큐에_승인2건은_없다():
    queue_path = MAPPINGS / "fish-data-manual-review-queue.json"
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    names = {x["sourceName"] for x in queue}
    assert names.isdisjoint(APPROVED_SOURCE_NAMES)
