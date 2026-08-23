#!/usr/bin/env python3
"""Batch3 승인 3건(광어→넙치, 장대→양태, 참굴→굴)을 Alias Registry에 실제 반영한다.

지금까지의 build_alias_review_batch*.py는 전부 "실제 파일을 수정하지 않는다"는
제약이 있었다. 이번 라운드는 사용자가 명시적으로 "실제 반영한다"를 선택한 예외다.

수정하는 파일(원본이지만 이번 작업에서는 반영 대상으로 명시됨):
  - data/mbris/mappings/fish-alias-registry.json / .csv

절대 수정하지 않는 파일:
  - src/data/fish-data.ts
  - MBRIS 원본 데이터
  - fish-data-link-resolved.json (build_resolved_mapping.py가 별도로 재생성한다)

원칙: 새 MBRIS species를 만들지 않는다 — 기존 internalId(넙치/양태/굴)를 재사용한다.
"""
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from build_alias_registry import write_csv

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REGISTRY_PATH = MAPPINGS / "fish-alias-registry.json"
CSV_PATH = MAPPINGS / "fish-alias-registry.csv"
BATCH3_PATH = MAPPINGS / "fish-alias-review-batch3.json"
NOW = datetime.now(timezone.utc).isoformat()

# 승인된 3건의 aliasType은 batch3 조사 근거의 성격에 따라 사람이 직접 정한다
# (자동 추론 금지). 장대는 NIBR이 "지방명"으로 명시했으므로 dialect, 나머지 둘은
# 정부 자료의 통칭 병기 수준이라 common_name.
ALIAS_TYPE_OVERRIDE = {
    "광어": "common_name",
    "장대": "dialect",
    "참굴": "common_name",
}


def load_approved_batch3() -> list[dict]:
    batch3 = json.loads(BATCH3_PATH.read_text(encoding="utf-8"))
    approved = [r for r in batch3 if r["decision"] == "approved"]
    assert len(approved) == 3, f"batch3 approved 건수가 3건이 아니다: {len(approved)}"
    assert {r["sourceName"] for r in approved} == {"광어", "장대", "참굴"}
    return approved


def apply(*, dry_run: bool = False) -> dict:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    by_name = {r["sourceName"]: r for r in registry}
    approved_batch3 = load_approved_batch3()

    status_before = Counter(r["status"] for r in registry)
    applied, skipped = [], []

    for b in approved_batch3:
        name = b["sourceName"]
        rec = by_name.get(name)
        assert rec is not None, f"{name}이 Registry에 없다"

        if rec["status"] == "approved" and "batch3" in rec["reviewBatch"].split(","):
            skipped.append(name)  # 이미 반영됨 — 중복 반영 방지
            continue
        assert rec["status"] == "manual_review", (
            f"{name}: status={rec['status']!r}인데 approved로 전환하려 한다 — 예상치 못한 상태")

        new_evidence = [
            {"source": e["organization"], "type": "batch3_official_evidence",
             "value": f"{e['source']}: {e['value']}"}
            for e in b["evidence"]
        ]
        existing_keys = {(e["source"], e["type"], e["value"]) for e in rec["evidence"]}
        for e in new_evidence:
            key = (e["source"], e["type"], e["value"])
            if key not in existing_keys:
                rec["evidence"].append(e)
                existing_keys.add(key)

        rec["status"] = "approved"
        rec["canonicalName"] = b["canonicalName"]
        rec["internalId"] = b["internalId"]
        rec["scientificName"] = b["scientificName"]
        rec["aliasType"] = ALIAS_TYPE_OVERRIDE[name]
        rec["confidence"] = b["confidence"]
        batches = [x for x in rec["reviewBatch"].split(",") if x]
        if "batch3" not in batches:
            batches.append("batch3")
        rec["reviewBatch"] = ",".join(batches)
        rec["updatedAt"] = NOW

        applied.append(name)

    assert len(applied) + len(skipped) == 3

    status_after = Counter(r["status"] for r in registry)

    print(f"[1] 승인 반영: {applied} (건너뜀: {skipped})")
    print(f"[2] Registry status: {dict(status_before)} -> {dict(status_after)}")

    if dry_run:
        print("[DRY-RUN] 실제로 쓰지 않는다.")
        return {"applied": applied, "skipped": skipped,
                "statusBefore": dict(status_before), "statusAfter": dict(status_after)}

    REGISTRY_PATH.write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(CSV_PATH, sorted(registry, key=lambda r: r["aliasId"]))
    print(f"\n✅ 반영 완료: {REGISTRY_PATH}")

    return {"applied": applied, "skipped": skipped,
            "statusBefore": dict(status_before), "statusAfter": dict(status_after)}


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    apply(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
