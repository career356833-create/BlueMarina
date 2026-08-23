#!/usr/bin/env python3
"""§6: Tier A 수집 성공분(85종) 기준 필드별 존재율/공백률 분석.
'태그 자체가 없음'과 '태그는 있지만 값이 비어있음'을 구분한다."""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DETAIL = ROOT / "data" / "mbris" / "raw" / "detail"
REPORTS = ROOT / "data" / "mbris" / "reports"

FIELDS = ["CommKorNm", "SpcScitfNm", "SpcScitfNmShort", "KingdomKR", "PhylumDivisionKR",
          "ClassKR", "OrderKR", "FamilyKR", "FORM", "ECOL", "HABI", "NADI", "INDI",
          "CorrNmTyp", "CorrSpcScitfNm", "SpcTyp"]


def load_species() -> list[dict]:
    out = []
    for d in sorted(RAW_DETAIL.iterdir()):
        if not d.is_dir():
            continue
        preview = json.loads((d / "parsed-preview.json").read_text(encoding="utf-8"))
        out.append({"internalId": d.name, "item": preview["matchedItem"],
                   "observedFields": set(preview["observedFields"])})
    return out


def main() -> None:
    species = load_species()
    n = len(species)

    per_field = {}
    for f in FIELDS:
        tag_missing = sum(1 for s in species if f not in s["observedFields"])
        present = n - tag_missing
        empty = sum(1 for s in species if f in s["observedFields"] and not s["item"].get(f))
        populated = present - empty
        per_field[f] = {
            "field": f, "sampleSize": n,
            "tagPresentCount": present, "tagMissingCount": tag_missing,
            "emptyValueCount": empty, "populatedCount": populated,
            "populatedRate": round(populated / n, 4) if n else None,
        }

    class_kr_blank_rate = round(per_field["ClassKR"]["emptyValueCount"] / n, 4) if n else None
    habi_blank_rate = round(per_field["HABI"]["emptyValueCount"] / n, 4) if n else None
    ecol_provided_rate = per_field["ECOL"]["populatedRate"]

    nadi_values = [s["item"].get("NADI") for s in species if s["item"].get("NADI")]
    indi_values = [s["item"].get("INDI") for s in species if s["item"].get("INDI")]
    spc_typ_dist = dict(Counter(s["item"].get("SpcTyp") for s in species))
    corr_nm_typ_dist = dict(Counter(s["item"].get("CorrNmTyp") for s in species))

    result = {
        "sampleSize": n,
        "note": "성공 수집분(85종) 기준 — 실패 1건(갯강구, BM-SPECIES-006084)은 원본이 없어 제외",
        "fields": per_field,
        "classKRBlankRate": class_kr_blank_rate,
        "habiBlankRate": habi_blank_rate,
        "ecolProvidedRate": ecol_provided_rate,
        "nadiProvidedCount": len(nadi_values),
        "indiProvidedCount": len(indi_values),
        "spcTypDistribution": spc_typ_dist,
        "corrNmTypDistribution": corr_nm_typ_dist,
    }

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "tier-a-field-completeness.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    with (REPORTS / "tier-a-field-completeness.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["field", "sampleSize", "tagPresentCount", "tagMissingCount",
                    "emptyValueCount", "populatedCount", "populatedRate"])
        for f_name in FIELDS:
            r = per_field[f_name]
            w.writerow([r["field"], r["sampleSize"], r["tagPresentCount"], r["tagMissingCount"],
                        r["emptyValueCount"], r["populatedCount"], r["populatedRate"]])

    print(f"[1] 샘플 {n}종 필드 완전성 분석")
    for f_name in FIELDS:
        r = per_field[f_name]
        print(f"    {f_name:18s} 값있음={r['populatedCount']:3d}/{n} "
              f"({r['populatedRate']*100:.1f}%)  태그없음={r['tagMissingCount']}")
    print(f"\n    ClassKR 공백률: {class_kr_blank_rate*100:.1f}%")
    print(f"    HABI 공백률: {habi_blank_rate*100:.1f}%")
    print(f"    ECOL 제공률: {ecol_provided_rate*100:.1f}%")
    print(f"    SpcTyp 분포: {spc_typ_dist}")
    print(f"\n✅ 저장: {REPORTS / 'tier-a-field-completeness.json'}")
    print(f"✅ 저장: {REPORTS / 'tier-a-field-completeness.csv'}")


if __name__ == "__main__":
    main()
