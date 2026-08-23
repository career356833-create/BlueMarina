#!/usr/bin/env python3
"""fish-data.ts 미매칭 79종 → MBRIS 별칭 후보 검토팩 생성.

자동으로 확정하거나 원본 데이터(fish-data.ts, taxonomy-master.json 등)를
수정하지 않는다. 산출물은 전부 신규 파일이다.
"""
import csv, json, re, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.alias_matcher import (
    normalize_ko, strip_group_suffix, strip_trailing_eo, extract_caution_label_base,
    build_ko_index, build_nifs_dialect_index, find_candidates,
    KNOWN_COLLECTIVE_NAMES, NIFS_DIALECT_REFERENCE, EXACT_KOREAN_NAME,
    NORMALIZED_KOREAN_NAME, SUBSTRING_MATCH, EDIT_DISTANCE,
)
from src.fish_data_source import parse_fish_data_names

ROOT = Path(__file__).resolve().parent.parent.parent
FISH_DATA_TS = ROOT / "src" / "data" / "fish-data.ts"
NORM = ROOT / "data" / "mbris" / "normalized"
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NIFS_NORMALIZED = ROOT / "data" / "nifs" / "normalized" / "nifs-fish-25.json"
NOW = datetime.now(timezone.utc).isoformat()

_CAUTION_CATEGORY = "주의가 필요한 어종"

_ROW_STR = r'"((?:[^"\\]|\\.)*)"'
_ROW_RE = re.compile(r"\[\s*" + r"\s*,\s*".join([_ROW_STR] * 7) + r"\s*,\s*\[([^\]]*)\]\s*\]")


def parse_fish_data_rows(ts_source: str) -> dict[str, dict]:
    """이름별 원본 행 정보(첫 등장분). name, category, season, habitat, description,
    fishingTips, caution, relatedFish[] 7문자열+배열 구조(FishItem 시드 실제 타입)."""
    m = re.search(r"const fishSeed\b.*?=\s*\[(.*)\];", ts_source, re.S)
    body = m.group(1) if m else ts_source
    out: dict[str, dict] = {}
    for r in _ROW_RE.findall(body):
        name = r[0]
        if name in out:
            continue
        related = [x.strip().strip('"') for x in r[7].split(",") if x.strip()]
        out[name] = {
            "category": r[1], "season": r[2], "habitat": r[3],
            "description": r[4], "fishingTips": r[5], "caution": r[6],
            "relatedFish": related,
        }
    return out


def analyze_name(name: str, row: dict, all_names: set[str]) -> dict:
    """정규화·별칭후보 분석. 원본 name은 어디서도 변경하지 않는다."""
    normalized = normalize_ko(name)
    base, has_group_suffix = strip_group_suffix(name)
    caution_base = extract_caution_label_base(
        name, row.get("category"), row["relatedFish"][0] if row.get("relatedFish") else None)
    eo_base = strip_trailing_eo(name, all_names)

    matching_base = name
    extraction_method = "none"
    if caution_base:
        matching_base = caution_base
        extraction_method = "caution_label_related_species_or_split"
    elif has_group_suffix:
        matching_base = base
        extraction_method = "group_suffix_strip(류)"

    return {
        "normalizedName": normalized,
        "matchingBaseName": matching_base,
        "aliasCandidates": {
            "hasGroupSuffix": has_group_suffix,
            "cautionLabelDetected": caution_base is not None,
            "trailingEoStrippable": eo_base,
            "extractionMethod": extraction_method,
        },
    }


def confidence_for(method: str, score: float) -> str:
    if method in (EXACT_KOREAN_NAME, NORMALIZED_KOREAN_NAME, NIFS_DIALECT_REFERENCE):
        return "high"
    if method == SUBSTRING_MATCH:
        return "medium" if score >= 0.5 else "low"
    if method == EDIT_DISTANCE:
        return "medium" if score >= 0.75 else "low"
    return "low"


def decide_status(source_name: str, analysis: dict, candidates: list) -> tuple[str, list[str]]:
    reasons: list[str] = []

    if analysis["aliasCandidates"]["hasGroupSuffix"]:
        reasons.append("collective_group_suffix(류) — 여러 종을 포함할 수 있는 이름")
    if source_name in KNOWN_COLLECTIVE_NAMES:
        reasons.append("known_collective_name — 다수 종을 가리키는 관용 집합명")
    if analysis["aliasCandidates"]["cautionLabelDetected"]:
        reasons.append("source_name_quality_issue — 원본 이름에 주의문구가 섞여 있음(fish-data.ts 자체 이슈)")

    if not candidates:
        reasons.append("no_candidates_found")
        return "manual_review", reasons

    groups = {c.organismGroup for c in candidates if c.organismGroup}
    if len(candidates) >= 2:
        reasons.append("multiple_candidates")
        if len(groups) >= 2:
            reasons.append("cross_taxon_homonym — 후보들의 분류군이 서로 다름")
        elif len(groups) == 1:
            reasons.append(f"same_organism_group_restricted({next(iter(groups))})")

    only_dialect = (len(candidates) == 1 and candidates[0].matchMethod == NIFS_DIALECT_REFERENCE)
    already_flagged = bool(reasons)

    if only_dialect and not already_flagged:
        return "confirmed", ["nifs_dialect_explicit_alias — NIFS 방언 목록에 명시된 별칭"]

    if not reasons:
        # exact/normalized 단일 후보라도, NIFS 방언 근거가 아니면 사람이 최종 확인하도록 남긴다
        reasons.append("single_candidate_but_no_explicit_local_alias_evidence")

    return "manual_review", reasons


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    MAPPINGS.mkdir(parents=True, exist_ok=True)

    print("[1] 입력 로드")
    fish = json.loads((NORM / "blue-marina-fish-candidates.json").read_text(encoding="utf-8"))
    nonfish = json.loads((NORM / "blue-marina-nonfish-candidates.json").read_text(encoding="utf-8"))
    all_candidates = fish + nonfish
    print(f"    MBRIS 후보 {len(all_candidates):,}건 (fish {len(fish):,} + nonfish {len(nonfish):,})")

    ts_source = FISH_DATA_TS.read_text(encoding="utf-8")
    all_names = parse_fish_data_names(ts_source)
    rows = parse_fish_data_rows(ts_source)
    print(f"    fish-data.ts 고유 이름 {len(all_names)}개, 행 파싱 {len(rows)}개")

    existing_links = json.loads((MAPPINGS / "fish-data-link.json").read_text(encoding="utf-8"))
    matched_names = {l["sourceName"] for l in existing_links}
    unmatched = [n for n in all_names if n not in matched_names]
    print(f"    미매칭 {len(unmatched)}개 (기존 매칭 {len(matched_names)}개)")

    nifs_records = []
    if NIFS_NORMALIZED.exists():
        nifs_records = json.loads(NIFS_NORMALIZED.read_text(encoding="utf-8"))
    nifs_link_path = MAPPINGS / "nifs-mbris-link.json"
    nifs_links = json.loads(nifs_link_path.read_text(encoding="utf-8")) if nifs_link_path.exists() else []
    nifs_dialect_idx = build_nifs_dialect_index(nifs_records, nifs_links)
    print(f"    NIFS 방언 별칭 색인 {len(nifs_dialect_idx)}개")

    exact_idx, norm_idx = build_ko_index(all_candidates)
    by_id_idx = {c["internalId"]: c for c in all_candidates}
    all_names_set = set(all_names)

    print("[2] 79종 분석·후보 탐색")
    records = []
    for source_name in unmatched:
        row = rows.get(source_name, {"category": None, "description": None,
                                     "fishingTips": None, "caution": None, "relatedFish": []})
        analysis = analyze_name(source_name, row, all_names_set)

        cands = find_candidates(
            base_name=analysis["matchingBaseName"], exact_idx=exact_idx, norm_idx=norm_idx,
            all_candidates=all_candidates, nifs_dialect_idx=nifs_dialect_idx,
            by_id_idx=by_id_idx)

        status, reasons = decide_status(source_name, analysis, cands)

        cand_dicts = []
        for c in cands:
            ambiguity = None
            if len(cands) >= 2:
                ambiguity = "multiple_candidates"
            elif c.matchMethod in (SUBSTRING_MATCH, EDIT_DISTANCE):
                ambiguity = "inferential_match_not_confirmed"
            elif analysis["aliasCandidates"]["hasGroupSuffix"]:
                ambiguity = "collective_group_suffix"
            cand_dicts.append({
                "internalId": c.internalId, "koreanName": c.koreanName,
                "scientificName": c.scientificName, "taxonomy": c.taxonomy,
                "organismGroup": c.organismGroup, "matchMethod": c.matchMethod,
                "similarityScore": c.similarityScore,
                "confidence": confidence_for(c.matchMethod, c.similarityScore),
                "ambiguityReason": ambiguity, "note": c.note,
            })

        records.append({
            "sourceName": source_name,
            "category": row.get("category"),
            "existingDescription": row.get("description"),
            "hasExistingScientificOrEnglishName": False,  # fish-data.ts 스키마에 해당 필드 없음(구조적 사실)
            "normalizedName": analysis["normalizedName"],
            "matchingBaseName": analysis["matchingBaseName"],
            "aliasCandidates": analysis["aliasCandidates"],
            "status": status,
            "statusReasons": reasons,
            "candidates": cand_dicts,
        })

    status_counts = Counter(r["status"] for r in records)
    print(f"[3] 상태 분포: {dict(status_counts)}")
    method_counts = Counter(c["matchMethod"] for r in records for c in r["candidates"])
    print(f"    매칭 방법 분포: {dict(method_counts)}")
    zero_cand = sum(1 for r in records if not r["candidates"])
    print(f"    후보 0건: {zero_cand}건")

    (MAPPINGS / "fish-data-alias-candidates.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

    with (MAPPINGS / "fish-data-alias-candidates.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["sourceName", "category", "normalizedName", "matchingBaseName", "status",
                    "statusReasons", "candidateCount", "topInternalId", "topKoreanName",
                    "topScientificName", "topMatchMethod", "topSimilarityScore", "topConfidence"])
        for r in records:
            top = r["candidates"][0] if r["candidates"] else {}
            w.writerow([r["sourceName"], r["category"] or "", r["normalizedName"],
                        r["matchingBaseName"], r["status"], " | ".join(r["statusReasons"]),
                        len(r["candidates"]), top.get("internalId", ""),
                        top.get("koreanName", ""), top.get("scientificName", ""),
                        top.get("matchMethod", ""), top.get("similarityScore", ""),
                        top.get("confidence", "")])

    review = {
        "generatedAt": NOW,
        "totalUnmatched": len(unmatched),
        "statusCounts": dict(status_counts),
        "matchMethodCounts": dict(method_counts),
        "zeroCandidateCount": zero_cand,
        "confirmedItems": [r["sourceName"] for r in records if r["status"] == "confirmed"],
        "sourceDataQualityIssues": [
            {"sourceName": r["sourceName"], "category": r["category"],
             "issue": "이름 필드에 주의문구/기타 텍스트가 섞여 있음",
             "derivedBaseName": r["matchingBaseName"]}
            for r in records if r["aliasCandidates"]["cautionLabelDetected"]
        ],
        "collectiveGroupNames": [r["sourceName"] for r in records
                                 if r["aliasCandidates"]["hasGroupSuffix"]
                                 or r["sourceName"] in KNOWN_COLLECTIVE_NAMES],
    }
    (REPORTS / "fish-data-unmatched-review.json").write_text(
        json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 저장: {MAPPINGS / 'fish-data-alias-candidates.json'}")
    print(f"✅ 저장: {REPORTS / 'fish-data-unmatched-review.json'}")


if __name__ == "__main__":
    main()
