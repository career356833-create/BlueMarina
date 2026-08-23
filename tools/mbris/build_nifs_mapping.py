#!/usr/bin/env python3
"""NIFS 25종 ↔ MBRIS TaxonomyMaster(internalId) 연결.

우선순위: 학명 정확 일치 → 국명 정확 일치(=synonym 가능성) → 속 단위 후보(수동검토) → 미매칭.
국명 단독 매칭은 confidence를 낮춘다. 자동 확정하지 않는다.
"""
import json, re, sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NIFS_LIST = ROOT / "data" / "nifs" / "raw" / "list" / "fish-index.json"
NIFS_NORMALIZED = ROOT / "data" / "nifs" / "normalized" / "nifs-fish-25.json"
NOW = datetime.now(timezone.utc).isoformat()

SCIENTIFIC_EXACT = "scientific_exact"
SYNONYM = "synonym"
KOREAN_CANDIDATE = "korean_candidate"
MANUAL_REVIEW = "manual_review"


def normalize_ko(s: str) -> str:
    return re.sub(r"[\s\-·()]", "", s or "")


def load_nifs_list() -> list[dict]:
    raw = NIFS_LIST.read_bytes()
    for enc in ("utf-8", "cp949"):
        try:
            return json.loads(raw.decode(enc))
        except UnicodeDecodeError:
            continue
    raise SystemExit(f"{NIFS_LIST} 인코딩을 해석할 수 없다.")


def build_indices(master: list[dict]) -> dict:
    by_sci_raw, by_sci_canon, by_ko, by_ko_norm, by_genus = (
        defaultdict(list), defaultdict(list), defaultdict(list),
        defaultdict(list), defaultdict(list))
    for m in master:
        if m["scientificNameRaw"]:
            by_sci_raw[m["scientificNameRaw"].strip()].append(m)
        canon = m.get("scientificNameCanonical")
        if canon:
            by_sci_canon[canon.strip()].append(m)
        if m["koreanName"]:
            by_ko[m["koreanName"]].append(m)
            by_ko_norm[normalize_ko(m["koreanName"])].append(m)
        genus = (m["taxonomy"].get("genus") or "").split()
        if genus:
            by_genus[genus[0]].append(m)
    return {"sciRaw": by_sci_raw, "sciCanon": by_sci_canon,
            "ko": by_ko, "koNorm": by_ko_norm, "genus": by_genus}


def match_one(fish_id: str, fish_name: str, scientific_name: str | None, idx: dict) -> dict:
    """NIFS 어종 1건을 MBRIS 후보와 매칭한다. 순수 함수 — 파일 I/O 없음."""
    sci = scientific_name or ""
    variants = [v.strip() for v in sci.split(",") if v.strip()]

    cands, match_type, note = [], MANUAL_REVIEW, ""
    for v in variants:
        if idx["sciRaw"].get(v):
            cands, match_type = idx["sciRaw"][v], SCIENTIFIC_EXACT
            break
        if idx["sciCanon"].get(v):
            cands, match_type = idx["sciCanon"][v], SCIENTIFIC_EXACT
            break

    if not cands and idx["ko"].get(fish_name):
        cands, match_type = idx["ko"][fish_name], SYNONYM
        note = "국명 일치, 학명은 다름 — 학명 개정(synonym) 가능성"
    if not cands and idx["koNorm"].get(normalize_ko(fish_name)):
        cands, match_type = idx["koNorm"][normalize_ko(fish_name)], SYNONYM
        note = "정규화 국명 일치, 학명은 다름"

    if not cands and variants:
        for v in variants:
            g = v.split()[0] if v.split() else None
            if g and idx["genus"].get(g):
                cands, match_type = idx["genus"][g], KOREAN_CANDIDATE
                note = f"속({g}) 단위 후보 — 종 수준 확정 불가"
                break

    if not cands:
        match_type, note = MANUAL_REVIEW, "MBRIS에서 후보를 찾지 못함"

    if not cands:
        confidence = "low"
    elif match_type == SCIENTIFIC_EXACT:
        confidence = "high" if len(cands) == 1 else "medium"
    elif match_type == SYNONYM:
        # 국명 단독 매칭 — 지시대로 confidence를 낮춘다
        confidence = "medium" if len(cands) == 1 else "low"
    else:  # korean_candidate / manual_review
        confidence = "low"

    primary = cands[0] if cands else None
    return {
        "nifsSourceId": fish_id,
        "nifsName": fish_name,
        "nifsScientificName": sci or None,
        "mbrisInternalId": primary["internalId"] if primary else None,
        "mbrisScientificName": primary["scientificNameRaw"] if primary else None,
        "mbrisKoreanName": primary["koreanName"] if primary else None,
        "matchType": match_type,
        "confidence": confidence,
        "candidateCount": len(cands),
        "additionalCandidateIds": [c["internalId"] for c in cands[1:5]],
        "note": note,
    }


def main() -> None:
    MAPPINGS.mkdir(parents=True, exist_ok=True)
    master = json.loads((NORM / "taxonomy-master.json").read_text(encoding="utf-8"))
    nifs = load_nifs_list()

    sci_by_id = {}
    if NIFS_NORMALIZED.exists():
        for r in json.loads(NIFS_NORMALIZED.read_text(encoding="utf-8")):
            if r.get("scientificName"):
                sci_by_id[r["sourceId"]] = r["scientificName"].strip()

    idx = build_indices(master)
    links = [match_one(n["fishId"], n["fishName"], sci_by_id.get(n["fishId"]), idx)
             for n in nifs]

    (MAPPINGS / "nifs-mbris-link.json").write_text(
        json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")

    from collections import Counter
    print("matchType:", dict(Counter(l["matchType"] for l in links)))
    print("confidence:", dict(Counter(l["confidence"] for l in links)))
    unmatched = [l["nifsName"] for l in links if l["mbrisInternalId"] is None]
    print("미매칭:", unmatched or "없음")
    print(f"저장: {MAPPINGS / 'nifs-mbris-link.json'}")


if __name__ == "__main__":
    main()
