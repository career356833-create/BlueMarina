#!/usr/bin/env python3
"""§5: fish-alias-registry.json(원본)을 절대 수정하지 않고, Aggregate Alias
Registry와의 연결만 별도 파일에 기록한다."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"


def build_links() -> list[dict]:
    alias_registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    alias_by_name = {r["sourceName"]: r for r in alias_registry}
    aggregate_registry = json.loads((MAPPINGS / "aggregate-alias-registry.json").read_text(encoding="utf-8"))

    links = []
    for agg in aggregate_registry:
        name = agg["sourceName"]
        alias = alias_by_name.get(name)
        assert alias is not None, f"{name}이 fish-alias-registry.json에 없다"
        links.append({
            "sourceName": name,
            "aliasType": "aggregate_name",
            "registryId": agg["aggregateId"],
            "status": alias["status"],  # fish-alias-registry.json의 현재 status를 그대로 반영만 한다
        })
    return links


def main() -> None:
    links = build_links()
    print(f"[1] Aggregate Alias Link {len(links)}건 생성")
    for l in links:
        print(f"    {l['sourceName']:6s} -> {l['registryId']} (status={l['status']})")

    (MAPPINGS / "aggregate-alias-links.json").write_text(
        json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ 저장: {MAPPINGS / 'aggregate-alias-links.json'}")


if __name__ == "__main__":
    main()
