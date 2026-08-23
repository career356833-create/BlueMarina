#!/usr/bin/env python3
"""fish-alias-registry.json 검증 실행 → alias-registry-validation.json 생성."""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.validate_alias_registry import run_validation

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def main() -> None:
    records = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    result = run_validation(records)

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "alias-registry-validation.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"레코드 {result['totalRecords']}건")
    print(f"오류 {result['errorCount']}건, 충돌 {result['conflictCount']}건")
    print(f"유효: {result['valid']}")
    for e in result["errors"]:
        print(f"  ❌ {e}")
    for c in result["conflicts"]:
        print(f"  ⚠️  {c}")
    print(f"\n✅ 저장: {REPORTS / 'alias-registry-validation.json'}")


if __name__ == "__main__":
    main()
