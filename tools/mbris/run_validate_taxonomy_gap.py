#!/usr/bin/env python3
"""taxonomy-gap-registry.json 검증 실행 → taxonomy-gap-validation.json 생성."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.validate_taxonomy_gap import run_validation

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def main() -> None:
    gap_records = json.loads((MAPPINGS / "taxonomy-gap-registry.json").read_text(encoding="utf-8"))
    alias_records = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    result = run_validation(gap_records, alias_records)

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "taxonomy-gap-validation.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"레코드 {result['totalRecords']}건")
    print(f"오류 {result['errorCount']}건, 충돌 {result['conflictCount']}건")
    print(f"유효: {result['valid']}")
    for e in result["errors"]:
        print(f"  ❌ {e}")
    for c in result["conflicts"]:
        print(f"  ⚠️  {c}")
    print(f"\n✅ 저장: {REPORTS / 'taxonomy-gap-validation.json'}")


if __name__ == "__main__":
    main()
