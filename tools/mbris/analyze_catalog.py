#!/usr/bin/env python3
"""MBRIS 목록집 품질 분석 · 어류/비어류 분리 · NIFS 25종 매칭 · 마스터 초안."""
import csv, hashlib, json, re, sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")
import warnings; warnings.filterwarnings("ignore", category=UserWarning)

from src.schema import (
    DATA_START_ROW, SHEETS, COLUMNS, CLAIMED_COLUMNS,
    row_to_record, holding_institutions,
)

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / "data" / "mbris" / "raw" / "catalog" / "original" / "mbris-national-species-catalog.xlsx"
MBRIS = ROOT / "data" / "mbris"
ANALYSIS, REPORTS, NORM = MBRIS / "analysis", MBRIS / "reports", MBRIS / "normalized"
NIFS_LIST = ROOT / "data" / "nifs" / "raw" / "list" / "fish-index.json"

NOW = datetime.now(timezone.utc).isoformat()

# --- 어류 판정 --------------------------------------------------------------
# 근거: 척추동물 시트의 세부분류군명='어류'인 1,254행의 Class(Latin) 실측 분포.
# 강(class) 국명은 어류에서 대부분 비어 있어 판정 기준으로 쓸 수 없다.
FISH_CLASSES_INCLUDED = {
    "Teleostei": "진골어류(경골어류)",
    "Elasmobranchii": "판새아강(상어·가오리)",
    "Chondrostei": "연질아강(철갑상어류)",
    "Myxini": "먹장어강",
    "Holocephali": "전두어아강(은상어류)",
    "Petromyzonti": "칠성장어강",
}
VERTEBRATE_CLASSES_EXCLUDED = {"Aves": "조강(바다새)", "Mammalia": "포유동물강",
                               "Reptilia": "파충강"}

# --- 비어류 후보 그룹 -------------------------------------------------------
# Class(Latin) 앞부분으로 매칭한다. 원문에 명명자·연도가 붙어 있기 때문이다.
NONFISH_GROUPS = {
    "cephalopod": ("Cephalopoda", "두족류"),
    "crustacean": ("Malacostraca", "갑각류(연갑강)"),
    "gastropod": ("Gastropoda", "복족류"),
    "bivalve": ("Bivalvia", "이매패류"),
}

UNCERTAIN_RE = re.compile(r"\b(sp|spp|cf|aff|subsp|var)\.", re.I)
UNCERTAIN_KO = ("미상", "없음", "미동정", "미확정", "불명")


def load_records() -> tuple[dict[str, list[dict]], str]:
    file_hash = hashlib.sha256(SRC.read_bytes()).hexdigest()
    wb = openpyxl.load_workbook(SRC, data_only=True)
    out: dict[str, list[dict]] = {}
    for sheet in SHEETS:
        ws = wb[sheet]
        rows = list(ws.iter_rows(min_row=DATA_START_ROW, values_only=True))
        out[sheet] = [row_to_record(r, sheet, i + DATA_START_ROW)
                      for i, r in enumerate(rows)
                      if any(c not in (None, "") for c in r)]
    return out, file_hash


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


# ------------------------------------------------------------------ 품질
def analyze_quality(by_sheet: dict[str, list[dict]]) -> dict:
    print("[품질] 분석")
    per_sheet, dup_sci, dup_ko, missing, uncertain = {}, [], [], [], []
    sci_to_ko: dict[str, set] = defaultdict(set)
    ko_to_sci: dict[str, set] = defaultdict(set)

    for sheet, recs in by_sheet.items():
        no_ko = [r for r in recs if not r["koreanName"]]
        no_sci = [r for r in recs if not r["scientificNameRaw"]]
        both = [r for r in recs if not r["koreanName"] and not r["scientificNameRaw"]]

        sig = Counter(tuple(r[k] for _i, (_p, k) in COLUMNS.items() if k != "rowNo")
                      for r in recs)
        exact_dup = sum(c - 1 for c in sig.values() if c > 1)

        sci = Counter(r["scientificNameRaw"] for r in recs if r["scientificNameRaw"])
        unc = [r for r in recs
               if (r["scientificNameRaw"] and UNCERTAIN_RE.search(r["scientificNameRaw"]))
               or (r["koreanName"] and any(k in r["koreanName"] for k in UNCERTAIN_KO))]

        per_sheet[sheet] = {
            "dataRows": len(recs),
            "missingKoreanName": len(no_ko),
            "missingScientificName": len(no_sci),
            "missingBoth": len(both),
            "exactDuplicateRows": exact_dup,
            "duplicateScientificNames": sum(1 for c in sci.values() if c > 1),
            "missingHoldingInfo": sum(1 for r in recs if not holding_institutions(r)),
            "missingClass": sum(1 for r in recs if not r["className"]),
            "missingOrder": sum(1 for r in recs if not r["order"]),
            "missingFamily": sum(1 for r in recs if not r["family"]),
            "uncertainTaxa": len(unc),
        }
        print(f"  {sheet:8s} 행 {len(recs):5,}  국명없음 {len(no_ko):5,}  "
              f"학명없음 {len(no_sci):3,}  중복학명 {per_sheet[sheet]['duplicateScientificNames']:4,}  "
              f"미동정 {len(unc):4,}")

        for r in recs:
            if not r["koreanName"] or not r["scientificNameRaw"]:
                missing.append([sheet, r["sourceRow"], r["scientificNameRaw"] or "",
                                r["koreanName"] or "", r["detailGroup"] or ""])
            if r["scientificNameRaw"] and UNCERTAIN_RE.search(r["scientificNameRaw"]):
                uncertain.append([sheet, r["sourceRow"], r["scientificNameRaw"],
                                  r["koreanName"] or "", "학명에 불확정 표기"])
            elif r["koreanName"] and any(k in r["koreanName"] for k in UNCERTAIN_KO):
                uncertain.append([sheet, r["sourceRow"], r["scientificNameRaw"] or "",
                                  r["koreanName"], "국명에 미상/미동정 표기"])
            if r["scientificNameRaw"] and r["koreanName"]:
                sci_to_ko[r["scientificNameRaw"]].add(r["koreanName"])
                ko_to_sci[r["koreanName"]].add(r["scientificNameRaw"])
        for name, cnt in Counter(r["scientificNameRaw"] for r in recs
                                 if r["scientificNameRaw"]).items():
            if cnt > 1:
                dup_sci.append([sheet, name, cnt,
                                " | ".join(sorted(sci_to_ko.get(name, {""})))])
        for name, cnt in Counter(r["koreanName"] for r in recs
                                 if r["koreanName"]).items():
            if cnt > 1:
                dup_ko.append([sheet, name, cnt,
                               " | ".join(sorted(ko_to_sci.get(name, {""})))])

    multi_ko = {k: sorted(v) for k, v in sci_to_ko.items() if len(v) > 1}
    multi_sci = {k: sorted(v) for k, v in ko_to_sci.items() if len(v) > 1}

    write_csv(REPORTS / "duplicate-scientific-names.csv",
              ["sheet", "scientificName", "count", "koreanNames"], dup_sci)
    write_csv(REPORTS / "duplicate-korean-names.csv",
              ["sheet", "koreanName", "count", "scientificNames"], dup_ko)
    write_csv(REPORTS / "missing-names.csv",
              ["sheet", "row", "scientificName", "koreanName", "detailGroup"], missing)
    write_csv(REPORTS / "uncertain-taxa.csv",
              ["sheet", "row", "scientificName", "koreanName", "reason"], uncertain)

    summary = {
        "generatedAt": NOW,
        "totalDataRows": sum(len(v) for v in by_sheet.values()),
        "perSheet": per_sheet,
        "crossSheet": {
            "sameScientificNameMultipleKorean": len(multi_ko),
            "sameKoreanNameMultipleScientific": len(multi_sci),
            "sampleMultipleKorean": dict(list(multi_ko.items())[:10]),
            "sampleMultipleScientific": dict(list(multi_sci.items())[:10]),
        },
    }
    dump(REPORTS / "data-quality-summary.json", summary)
    return summary


# ------------------------------------------------------------------ 어류
def extract_fish(by_sheet: dict[str, list[dict]], file_hash: str) -> list[dict]:
    print("\n[어류] 분리")
    out = []
    for sheet in ("척추동물", "육상담수종"):
        for r in by_sheet[sheet]:
            if r["detailGroup"] != "어류":
                continue
            cls = (r["className"] or "").split()[0] if r["className"] else None
            out.append({**r,
                        "classLatinBase": cls,
                        "isMarineSheet": sheet == "척추동물",
                        "holdingInstitutions": holding_institutions(r)})

    marine = [f for f in out if f["isMarineSheet"]]
    freshwater = [f for f in out if not f["isMarineSheet"]]
    with_ko = [f for f in out if f["koreanName"]]
    sci_dup = {k: v for k, v in Counter(
        f["scientificNameRaw"] for f in out if f["scientificNameRaw"]).items() if v > 1}

    print(f"  전체 어류 후보: {len(out):,} (해양 {len(marine):,} / 육상담수 {len(freshwater):,})")
    print(f"  국명 있음 {len(with_ko):,} / 없음 {len(out) - len(with_ko):,}")
    print(f"  강별: {dict(Counter(f['classLatinBase'] for f in out))}")
    print(f"  학명 중복: {len(sci_dup)}종")

    dump(NORM / "fish-master-candidates.json", out)
    write_csv(NORM / "fish-master-candidates.csv",
              ["sourceSheet", "sourceRow", "koreanName", "scientificNameRaw",
               "classLatin", "order", "family", "genus", "species",
               "speciesAuthority", "isMarineSheet", "holdingInstitutions"],
              [[f["sourceSheet"], f["sourceRow"], f["koreanName"] or "",
                f["scientificNameRaw"] or "", f["className"] or "", f["order"] or "",
                f["family"] or "", f["genus"] or "", f["species"] or "",
                f["speciesAuthority"] or "", f["isMarineSheet"],
                " | ".join(f["holdingInstitutions"])] for f in out])
    return out


# --------------------------------------------------------------- 비어류
def extract_nonfish(by_sheet: dict[str, list[dict]]) -> list[dict]:
    print("\n[비어류] 분리")
    out = []
    for sheet in ("무척추동물", "육상담수종"):
        for r in by_sheet[sheet]:
            cls = r["className"] or ""
            group = next((g for g, (latin, _ko) in NONFISH_GROUPS.items()
                          if cls.startswith(latin)), None)
            if group is None:
                continue
            out.append({
                "sourceSheet": sheet,
                "sourceRow": r["sourceRow"],
                "koreanName": r["koreanName"],
                "scientificName": r["scientificNameRaw"],
                "kingdom": r["kingdomGroup"],
                "phylum": r["phylum"],
                "class": r["className"],
                "order": r["order"],
                "family": r["family"],
                "genus": r["genus"],
                "candidateGroup": group,
                # 분류학적 후보일 뿐 낚시 대상 여부는 판정하지 않는다
                "fishingTargetStatus": "unreviewed",
            })

    counts = Counter(x["candidateGroup"] for x in out)
    for g, (_latin, ko) in NONFISH_GROUPS.items():
        print(f"  {ko:16s} {counts.get(g, 0):5,}")
    print(f"  합계 {len(out):,}  국명 있음 {sum(1 for x in out if x['koreanName']):,}")

    dump(NORM / "nonfish-marine-candidates.json", out)
    write_csv(NORM / "nonfish-marine-candidates.csv",
              ["sourceSheet", "sourceRow", "koreanName", "scientificName",
               "phylum", "class", "order", "family", "genus",
               "candidateGroup", "fishingTargetStatus"],
              [[x["sourceSheet"], x["sourceRow"], x["koreanName"] or "",
                x["scientificName"] or "", x["phylum"] or "", x["class"] or "",
                x["order"] or "", x["family"] or "", x["genus"] or "",
                x["candidateGroup"], x["fishingTargetStatus"]] for x in out])
    return out


# ------------------------------------------------------------ NIFS 매칭
def normalize_ko(s: str) -> str:
    return re.sub(r"[\s\-·()]", "", s or "")


def match_nifs(by_sheet: dict[str, list[dict]]) -> list[dict]:
    print("\n[NIFS 25종] 매칭")
    if not NIFS_LIST.exists():
        print("  NIFS 목록이 없다 — 건너뜀")
        return []
    raw = NIFS_LIST.read_bytes()
    for enc in ("utf-8", "cp949"):
        try:
            nifs = json.loads(raw.decode(enc)); break
        except UnicodeDecodeError:
            continue

    # NIFS 정규화 결과에 학명이 있으면 함께 쓴다
    sci_by_id = {}
    nf = ROOT / "data" / "nifs" / "normalized" / "nifs-fish-25.json"
    if nf.exists():
        for r in json.loads(nf.read_text(encoding="utf-8")):
            if r.get("scientificName"):
                sci_by_id[r["sourceId"]] = r["scientificName"].strip()

    pool = [r for sheet in SHEETS for r in by_sheet[sheet]]
    by_sci = defaultdict(list)
    by_ko = defaultdict(list)
    by_ko_norm = defaultdict(list)
    for r in pool:
        if r["scientificNameRaw"]:
            by_sci[r["scientificNameRaw"].strip()].append(r)
        if r["koreanName"]:
            by_ko[r["koreanName"]].append(r)
            by_ko_norm[normalize_ko(r["koreanName"])].append(r)

    # 속(genus) 단위 색인 — 학명이 개정된 경우의 최후 후보 탐색용
    by_genus = defaultdict(list)
    for r in pool:
        if r["genus"]:
            by_genus[r["genus"].split()[0]].append(r)

    rows, stats = [], Counter()
    for n in nifs:
        fid, fname = n["fishId"], n["fishName"]
        sci = sci_by_id.get(fid)
        # NIFS는 한 필드에 이명을 쉼표로 여러 개 담기도 한다
        sci_variants = [s.strip() for s in (sci or "").split(",") if s.strip()]
        cands, status, note = [], "not_found", ""

        for v in sci_variants:
            if by_sci.get(v):
                cands, status = by_sci[v], "exact_scientific"
                break

        if not cands and by_ko.get(fname):
            cands, status = by_ko[fname], "exact_korean"
            note = "국명 일치, 학명 불일치 — 학명 개정 가능성"
        if not cands and by_ko_norm.get(normalize_ko(fname)):
            cands, status = by_ko_norm[normalize_ko(fname)], "exact_korean"
            note = "정규화 국명 일치"

        if not cands and sci_variants:
            # 속명으로 후보를 좁히되 자동 확정하지 않는다
            for v in sci_variants:
                g = v.split()[0]
                if by_genus.get(g):
                    cands, status = by_genus[g], "manual_review"
                    note = f"속({g}) 단위 후보만 존재 — 학명 개정 추정, 수동 확인 필요"
                    break

        if status in ("exact_scientific", "exact_korean") and len(cands) > 1:
            status = "multiple_candidates"
        stats[status] += 1
        rows.append([fid, fname, sci or "", status, len(cands),
                     " | ".join(f"{c['sourceSheet']}#{c['sourceRow']}:"
                                f"{c['scientificNameRaw']}({c['koreanName']})"
                                for c in cands[:5]),
                     " | ".join(sorted({c["detailGroup"] or "" for c in cands})), note])

    write_csv(REPORTS / "nifs-25-match.csv",
              ["nifsFishId", "nifsKoreanName", "nifsScientificName", "matchStatus",
               "candidateCount", "mbrisCandidates", "detailGroups", "note"], rows)
    print(f"  {dict(stats)}")
    return rows


# ------------------------------------------------------- 마스터 초안
def build_master(fish: list[dict], file_hash: str) -> None:
    print("\n[마스터 초안] 생성")
    out = []
    for f in fish:
        raw = f["scientificNameRaw"]
        # 저자명·연도를 제거하지 않는다. canonical은 별도 파서 몫으로 남긴다.
        out.append({
            "sourceProvider": "MBRIS",
            "sourceSheet": f["sourceSheet"],
            "sourceRow": f["sourceRow"],
            "sourceRecordId": None,  # 목록집에 고유 ID 컬럼이 없다
            "koreanName": f["koreanName"],
            "scientificNameRaw": raw,
            "scientificNameCanonical": None,  # 파서 미적용
            "taxonomy": {
                "kingdom": f["kingdomGroup"],
                "phylum": f["phylum"],
                "class": f["className"],
                "order": f["order"],
                "family": f["family"],
                "genus": f["genus"],
            },
            "holdingInstitutions": f["holdingInstitutions"],
            "organismGroup": "fish",
            "taxonReviewStatus": "pending",
            "sourceFileHash": file_hash,
            "collectedAt": NOW,
        })
    dump(NORM / "fish-master-draft.json", out)
    print(f"  {len(out):,}건 → normalized/fish-master-draft.json")


def verify_claimed_columns(by_sheet: dict[str, list[dict]]) -> None:
    print("\n[컬럼 검증] 퍼플렉시티 제시 컬럼 대조")
    actual = {p for _i, (p, _k) in COLUMNS.items()}
    for claimed, note in CLAIMED_COLUMNS.items():
        exists = claimed in actual
        print(f"  {claimed:18s} {'✅ 원문 그대로 존재' if exists else '❌ 없음'} — {note}")
    dump(ANALYSIS / "claimed-column-verification.json", {
        "actualColumns": sorted(actual),
        "claimed": {k: {"existsVerbatim": k in actual, "actual": v}
                    for k, v in CLAIMED_COLUMNS.items()},
    })


def main() -> None:
    by_sheet, file_hash = load_records()
    print(f"파일 SHA-256: {file_hash[:16]}...")
    print(f"시트별 행: {[(s, len(v)) for s, v in by_sheet.items()]}")
    print(f"총 {sum(len(v) for v in by_sheet.values()):,}행\n")

    verify_claimed_columns(by_sheet)
    analyze_quality(by_sheet)
    fish = extract_fish(by_sheet, file_hash)
    extract_nonfish(by_sheet)
    match_nifs(by_sheet)
    build_master(fish, file_hash)
    print("\n완료")


if __name__ == "__main__":
    main()
