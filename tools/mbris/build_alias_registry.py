#!/usr/bin/env python3
"""Fish Alias Registry 생성 — 여러 파일에 흩어진 alias 상태를 하나로 통합한다.

Registry가 원본(source of truth)이 되고, resolved mapping은 여기서 파생된다.
기존 7개 입력 파일은 전부 읽기만 하고 수정·삭제하지 않는다.
"""
import csv, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.alias_registry import (
    assertions_from_link72, assertions_from_candidates, assertions_from_batch1,
    assertions_from_batch2, assertions_from_approved_aliases, assertions_from_queue,
    merge_assertions, detect_conflicts, APPROVED, REJECTED, MANUAL_REVIEW, CANDIDATE,
)

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
NOW = datetime.now(timezone.utc).isoformat()

INPUTS = {
    "link72": MAPPINGS / "fish-data-link.json",
    "candidates": MAPPINGS / "fish-data-alias-candidates.json",
    "batch1": MAPPINGS / "fish-data-alias-review-batch1.json",
    "batch2": MAPPINGS / "fish-data-alias-review-batch2.json",
    "approved": MAPPINGS / "fish-data-approved-aliases.json",
    "queue": MAPPINGS / "fish-data-manual-review-queue.json",
    "resolved": MAPPINGS / "fish-data-link-resolved.json",  # 교차검증용, 별도 assertion 안 만듦
}


def load(key: str) -> list[dict]:
    path = INPUTS[key]
    if not path.exists():
        print(f"  ⚠️  {path} 없음 — 건너뜀")
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def build_records() -> dict[str, dict]:
    all_assertions = [
        assertions_from_link72(load("link72")),
        assertions_from_candidates(load("candidates")),
        assertions_from_batch1(load("batch1")),
        assertions_from_batch2(load("batch2")),
        assertions_from_approved_aliases(load("approved")),
        assertions_from_queue(load("queue")),
    ]
    return merge_assertions(all_assertions)


def assign_ids(records: dict[str, dict]) -> list[dict]:
    """sourceName 사전순 정렬 후 순차 부여 — 입력이 그대로면 항상 같은 ID가 나온다."""
    out = []
    for i, name in enumerate(sorted(records.keys()), start=1):
        rec = dict(records[name])
        rec["aliasId"] = f"ALIAS-{i:06d}"
        rec["createdAt"] = NOW
        rec["updatedAt"] = NOW
        out.append(rec)
    return out


def write_csv(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["aliasId", "sourceName", "canonicalName", "internalId", "scientificName",
                    "aliasType", "status", "confidence", "evidenceCount", "reviewBatch",
                    "createdAt", "updatedAt"])
        for r in records:
            w.writerow([r["aliasId"], r["sourceName"], r["canonicalName"] or "",
                        r["internalId"] or "", r["scientificName"] or "", r["aliasType"],
                        r["status"], r["confidence"], len(r["evidence"]), r["reviewBatch"],
                        r["createdAt"], r["updatedAt"]])


def main() -> None:
    print("[1] 입력 로드 및 병합")
    merged = build_records()
    print(f"    합쳐진 고유 sourceName: {len(merged)}건")

    records = assign_ids(merged)

    (MAPPINGS / "fish-alias-registry.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(MAPPINGS / "fish-alias-registry.csv", records)

    status_counts = Counter(r["status"] for r in records)
    type_counts = Counter(r["aliasType"] for r in records)
    print(f"[2] status 분포: {dict(status_counts)}")
    print(f"    aliasType 분포: {dict(type_counts)}")

    conflicts = detect_conflicts(merged)
    print(f"[3] 충돌 탐지: {len(conflicts)}건")
    for c in conflicts:
        print(f"    {c}")

    print(f"\n✅ 저장: {MAPPINGS / 'fish-alias-registry.json'} ({len(records)}건)")


if __name__ == "__main__":
    main()
