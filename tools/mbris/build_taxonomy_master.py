#!/usr/bin/env python3
"""MBRIS 원본(16,587행) 전체를 TaxonomyMaster 표준 구조로 변환한다.

원본 XLSX는 읽기만 하고 수정하지 않는다. internalId는 IdRegistry로 영속 발급한다.
"""
import csv, hashlib, json, sys, warnings
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")
warnings.filterwarnings("ignore", category=UserWarning)

import openpyxl

from src.schema import DATA_START_ROW, SHEETS, row_to_record, holding_institutions
from src.sci_name_parser import parse_scientific_name, to_dict
from src.id_registry import IdRegistry, assign_ids

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / "data" / "mbris" / "raw" / "catalog" / "original" / "mbris-national-species-catalog.xlsx"
MBRIS = ROOT / "data" / "mbris"
NORM = MBRIS / "normalized"
REGISTRY_PATH = NORM / "internal-id-registry.json"

NOW = datetime.now(timezone.utc).isoformat()

# 세부분류군명 → organismGroup. 사전 조사(analyze_catalog.py)에서 확정한 기준을 재사용한다.
FISH_CLASSES = {"Teleostei", "Elasmobranchii", "Chondrostei", "Myxini",
                "Petromyzonti", "Holocephali"}
NONFISH_CLASS_PREFIX = {
    "Cephalopoda": "cephalopod",
    "Malacostraca": "crustacean",
    "Gastropoda": "gastropod",
    "Bivalvia": "bivalve",
}


def organism_group(rec: dict) -> str:
    if rec["sourceSheet"] in ("척추동물", "육상담수종") and rec["detailGroup"] == "어류":
        return "fish"
    cls = rec.get("className") or ""
    for prefix, group in NONFISH_CLASS_PREFIX.items():
        if cls.startswith(prefix):
            return group
    return "other"


def load_all_records() -> tuple[list[dict], str]:
    file_hash = hashlib.sha256(SRC.read_bytes()).hexdigest()
    wb = openpyxl.load_workbook(SRC, data_only=True)
    out = []
    for sheet in SHEETS:
        ws = wb[sheet]
        rows = list(ws.iter_rows(min_row=DATA_START_ROW, values_only=True))
        for i, row in enumerate(rows):
            if not any(c not in (None, "") for c in row):
                continue
            out.append(row_to_record(row, sheet, i + DATA_START_ROW))
    return out, file_hash


def build(records: list[dict], file_hash: str, internal_ids: list[str]) -> list[dict]:
    out = []
    for rec, iid in zip(records, internal_ids):
        parsed = to_dict(parse_scientific_name(
            rec["scientificNameRaw"],
            external_authority=rec.get("speciesAuthority") or rec.get("subspeciesAuthority")))
        out.append({
            "internalId": iid,
            "sourceProvider": "MBRIS",
            "sourceSheet": rec["sourceSheet"],
            "sourceRow": rec["sourceRow"],
            "koreanName": rec["koreanName"],
            "scientificNameRaw": rec["scientificNameRaw"],
            "scientificNameCanonical": parsed["scientificNameCanonical"],
            "scientificNameParsing": parsed,
            "taxonomy": {
                "kingdom": rec["kingdomGroup"],
                "phylum": rec["phylum"],
                "class": rec["className"],
                "order": rec["order"],
                "family": rec["family"],
                "genus": rec["genus"],
                "species": rec["species"],
            },
            "holdingInstitutions": holding_institutions(rec),
            "organismGroup": organism_group(rec),
            "sourceHash": file_hash,
            "reviewStatus": "normalized",
        })
    return out


def main() -> None:
    NORM.mkdir(parents=True, exist_ok=True)
    print("[1] 원본 로드")
    records, file_hash = load_all_records()
    print(f"    {len(records):,}행  해시={file_hash[:16]}...")

    print("[2] 내부 ID 발급 (영속 레지스트리)")
    registry = IdRegistry(REGISTRY_PATH)
    before = len(registry)
    ids = assign_ids(records, registry)
    registry.save()
    print(f"    기존 {before:,}건 유지, 신규 {len(registry) - before:,}건 발급, 총 {len(registry):,}건")

    print("[3] 학명 파싱 + 표준 구조 변환")
    master = build(records, file_hash, ids)

    groups = {}
    for m in master:
        groups[m["organismGroup"]] = groups.get(m["organismGroup"], 0) + 1
    print(f"    organismGroup 분포: {groups}")

    uncertain = sum(1 for m in master if m["scientificNameParsing"]["isUncertain"])
    print(f"    학명 불확실 표기: {uncertain:,}건")

    (NORM / "taxonomy-master.json").write_text(
        json.dumps(master, ensure_ascii=False, indent=2), encoding="utf-8")

    with (NORM / "taxonomy-master.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["internalId", "sourceSheet", "sourceRow", "koreanName",
                    "scientificNameRaw", "scientificNameCanonical", "authority",
                    "isUncertain", "uncertaintyType", "kingdom", "phylum", "class",
                    "order", "family", "genus", "species", "holdingInstitutions",
                    "organismGroup", "reviewStatus"])
        for m in master:
            sp = m["scientificNameParsing"]
            t = m["taxonomy"]
            w.writerow([m["internalId"], m["sourceSheet"], m["sourceRow"], m["koreanName"] or "",
                        m["scientificNameRaw"] or "", m["scientificNameCanonical"] or "",
                        sp["authority"] or "", sp["isUncertain"], sp["uncertaintyType"] or "",
                        t["kingdom"] or "", t["phylum"] or "", t["class"] or "", t["order"] or "",
                        t["family"] or "", t["genus"] or "", t["species"] or "",
                        " | ".join(m["holdingInstitutions"]), m["organismGroup"],
                        m["reviewStatus"]])

    print(f"\n✅ {len(master):,}건 → {NORM / 'taxonomy-master.json'}")


if __name__ == "__main__":
    main()
