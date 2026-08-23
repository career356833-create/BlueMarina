#!/usr/bin/env python3
"""§2: Alias Registry(status=manual_review)와 manual-review-queue(복수후보)를 교차해
Batch3 대상 17건을 뽑는다. 원본 파일은 읽기만 한다."""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"


def main() -> None:
    registry = json.loads((MAPPINGS / "fish-alias-registry.json").read_text(encoding="utf-8"))
    queue = json.loads((MAPPINGS / "fish-data-manual-review-queue.json").read_text(encoding="utf-8"))
    by_reg = {r["sourceName"]: r for r in registry}

    multi = [q for q in queue if q["reviewBucket"] == "multiple_candidates"]

    targets = []
    for q in multi:
        name = q["sourceName"]
        reg = by_reg.get(name)
        assert reg is not None, f"{name}이 registry에 없다"
        assert reg["status"] == "manual_review", f"{name} registry status가 manual_review가 아니다"
        assert len(q["candidates"]) > 1, f"{name} 후보가 1개 이하다"

        targets.append({
            "sourceName": name,
            "candidates": [{"internalId": c["internalId"], "koreanName": c["koreanName"],
                           "scientificName": c["scientificName"],
                           "organismGroup": c["organismGroup"]} for c in q["candidates"]],
            "reason": f"registry status=manual_review, 후보 {len(q['candidates'])}건(복수)",
            "previousDecision": reg["status"],
        })

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "fish-alias-batch3-targets.json").write_text(
        json.dumps(targets, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"대상 {len(targets)}건 추출")
    for t in targets:
        print(f"  {t['sourceName']:8s} 후보 {len(t['candidates'])}건")
    print(f"\n✅ 저장: {REPORTS / 'fish-alias-batch3-targets.json'}")


if __name__ == "__main__":
    main()
