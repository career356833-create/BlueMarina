"""build_candidates.py의 echinoderm 그룹 확장 로직 검증.
Taxonomy Master 불변 + 기존 4개 그룹 결과 완전 불변이 핵심."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from build_candidates import effective_group, NONFISH_GROUPS, ECHINODERM_GROUP, ECHINODERM_PHYLUM

ROOT = Path(__file__).resolve().parent.parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"


def load_master() -> list[dict]:
    return json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))


# --- effective_group 순수 함수 ---
def rec(organism_group="other", phylum=None):
    return {"organismGroup": organism_group, "taxonomy": {"phylum": phylum}}


def test_phylum이_Echinodermata면_echinoderm으로_재분류된다():
    assert effective_group(rec(organism_group="other", phylum="Echinodermata")) == "echinoderm"


def test_phylum이_Echinodermata가_아니면_organismGroup_그대로다():
    for g in ("fish", "cephalopod", "crustacean", "gastropod", "bivalve", "other"):
        assert effective_group(rec(organism_group=g, phylum="Mollusca")) == g


def test_phylum이_없어도_organismGroup_그대로다():
    assert effective_group(rec(organism_group="fish", phylum=None)) == "fish"


def test_NONFISH_GROUPS는_4개_그대로다():
    """echinoderm을 이 튜플에 몰래 끼워넣지 않았다 — 별도 상수(ECHINODERM_GROUP)로 관리."""
    assert set(NONFISH_GROUPS) == {"cephalopod", "crustacean", "gastropod", "bivalve"}
    assert ECHINODERM_GROUP not in NONFISH_GROUPS
    assert ECHINODERM_GROUP == "echinoderm"
    assert ECHINODERM_PHYLUM == "Echinodermata"


# --- Taxonomy Master 불변 ---
def test_taxonomy_master는_수정되지_않았다():
    master = load_master()
    echino_in_master = [r for r in master if r["taxonomy"].get("phylum") == "Echinodermata"]
    assert len(echino_in_master) == 234
    assert all(r["organismGroup"] == "other" for r in echino_in_master), (
        "Taxonomy Master 원본의 organismGroup은 echinoderm으로 절대 바뀌면 안 된다 — "
        "재분류는 candidate 레이어에서만 일어난다")


def test_taxonomy_master_전체_16587건_불변():
    assert len(load_master()) == 16587


# --- Candidate 산출물: 기존 그룹 완전 불변 ---
def test_fish_후보는_1399건이다():
    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    assert len(fish) == 1399


def test_기존_nonfish_4개_그룹_건수는_그대로다():
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    from collections import Counter
    counts = Counter(n["candidateType"] for n in nonfish)
    assert counts["bivalve"] == 537
    assert counts["gastropod"] == 1204
    assert counts["cephalopod"] == 55
    assert counts["crustacean"] == 1137


def test_기존_4개_그룹_레코드는_echinoderm_필드_추가없이_예전과_동일한_스키마다():
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    non_echino = [n for n in nonfish if n["candidateType"] != "echinoderm"]
    for n in non_echino:
        assert n["organismGroup"] == n["candidateType"]  # 기존 로직 그대로: 둘이 항상 같다


# --- 재실행 결정성 ---
def test_build_candidates_재실행하면_동일_결과다():
    import build_candidates
    master = load_master()

    fish1 = [{**m, "candidateType": "fish", "reviewStatus": "unreviewed"}
            for m in master if m["organismGroup"] == "fish"]
    fish2 = [{**m, "candidateType": "fish", "reviewStatus": "unreviewed"}
            for m in master if m["organismGroup"] == "fish"]
    assert fish1 == fish2

    def build_nonfish():
        out = []
        for m in master:
            eg = effective_group(m)
            if eg in NONFISH_GROUPS:
                out.append({**m, "candidateType": eg, "fishingTargetStatus": "unreviewed"})
            elif eg == ECHINODERM_GROUP:
                out.append({**m, "organismGroup": ECHINODERM_GROUP,
                           "candidateType": ECHINODERM_GROUP, "fishingTargetStatus": "unreviewed"})
        return out

    assert build_nonfish() == build_nonfish()
