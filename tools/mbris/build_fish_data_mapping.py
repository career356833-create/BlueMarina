#!/usr/bin/env python3
"""src/data/fish-data.ts ↔ MBRIS 연결. fish-data.ts에는 학명이 없어 NIFS를 경유하거나
국명으로만 매칭한다(학명 지어내지 않음)."""
import json, sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.fish_data_source import (
    parse_fish_data_names, build_nifs_name_index, build_mbris_korean_index,
    match_fish_data_entry,
)

ROOT = Path(__file__).resolve().parent.parent.parent
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
FISH_DATA_TS = ROOT / "src" / "data" / "fish-data.ts"


def main() -> None:
    MAPPINGS.mkdir(parents=True, exist_ok=True)
    if not FISH_DATA_TS.exists():
        raise SystemExit(f"{FISH_DATA_TS} 가 없다.")

    names = parse_fish_data_names(FISH_DATA_TS.read_text(encoding="utf-8"))
    print(f"[1] fish-data.ts 고유 국명 {len(names)}개")

    nifs_links = []
    nifs_link_path = MAPPINGS / "nifs-mbris-link.json"
    if nifs_link_path.exists():
        nifs_links = json.loads(nifs_link_path.read_text(encoding="utf-8"))
    nifs_index = build_nifs_name_index(nifs_links)

    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    mbris_ko, mbris_ko_norm = build_mbris_korean_index(fish + nonfish)

    links, unmatched = [], []
    for name in names:
        m = match_fish_data_entry(name, nifs_index, mbris_ko, mbris_ko_norm)
        if m is None:
            unmatched.append(name)
            continue
        links.append({
            "source": "BlueMarinaExistingFishData",
            "sourceName": name,
            "internalId": m["internalId"],
            "matchType": m["matchType"],
            "confidence": m["confidence"],
            "viaNifs": m["viaNifs"],
            "candidateCount": m["candidateCount"],
            "additionalCandidateIds": m["additionalCandidateIds"],
        })

    (MAPPINGS / "fish-data-link.json").write_text(
        json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")

    mt = Counter(l["matchType"] for l in links)
    conf = Counter(l["confidence"] for l in links)
    print(f"[2] 매칭 {len(links)}건 / 미매칭 {len(unmatched)}건")
    print(f"    matchType: {dict(mt)}")
    print(f"    confidence: {dict(conf)}")
    print(f"    NIFS 경유: {sum(1 for l in links if l['viaNifs'])}건")
    if unmatched:
        print(f"    미매칭 샘플: {unmatched[:15]}")
    print(f"저장: {MAPPINGS / 'fish-data-link.json'}")


if __name__ == "__main__":
    main()
