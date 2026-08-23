#!/usr/bin/env python3
"""Registry → Resolved Mapping (파생 산출물 생성).

fish-alias-registry.json이 이제 원본(source of truth)이고, fish-data-link-resolved.json은
여기서 매번 다시 만들어지는 파생 결과다. approved 상태인 레코드만 포함한다.

    python build_resolved_mapping.py --check   # 비교만 하고 쓰지 않는다
    python build_resolved_mapping.py            # 실제로 재생성한다
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REGISTRY_PATH = MAPPINGS / "fish-alias-registry.json"
RESOLVED_PATH = MAPPINGS / "fish-data-link-resolved.json"


def derive_resolved_record(reg: dict) -> dict:
    """registry 레코드 1건(approved) → resolved 레코드 1건.

    원본 MBRIS 매칭에서 온 것이면(evidence에 MBRIS_MATCH류 항목이 있으면) 그 원래
    matchType/evidenceSource를 그대로 복원한다. 순수 alias 승인으로 생긴 것이면
    matchType="approved_alias"로 둔다.
    """
    mbris_match = next((e for e in reg["evidence"]
                        if e["source"] in ("MBRIS_KOREAN_NAME_MATCH", "NIFS_TRANSITIVE")), None)
    if mbris_match:
        match_type = mbris_match["type"]
        evidence_source = mbris_match["source"]
    else:
        match_type = "approved_alias"
        approval_ev = next((e for e in reg["evidence"] if e["type"] == "approval"), None)
        evidence_source = approval_ev["source"] if approval_ev else "REGISTRY_APPROVAL"

    return {
        "sourceName": reg["sourceName"],
        "internalId": reg["internalId"],
        "matchType": match_type,
        "confidence": reg["confidence"],
        "evidenceSource": evidence_source,
        "resolutionStatus": "resolved",
    }


def build_from_registry(registry: list[dict]) -> list[dict]:
    approved = [r for r in registry if r["status"] == "approved"]
    return [derive_resolved_record(r) for r in
           sorted(approved, key=lambda r: r["sourceName"])]


def diff_resolved(old: list[dict], new: list[dict]) -> dict:
    old_by_name = {r["sourceName"]: r for r in old}
    new_by_name = {r["sourceName"]: r for r in new}

    only_old = sorted(set(old_by_name) - set(new_by_name))
    only_new = sorted(set(new_by_name) - set(old_by_name))
    changed = []
    for name in sorted(set(old_by_name) & set(new_by_name)):
        if old_by_name[name] != new_by_name[name]:
            changed.append({"sourceName": name, "old": old_by_name[name], "new": new_by_name[name]})

    return {
        "oldCount": len(old), "newCount": len(new),
        "onlyInOld": only_old, "onlyInNew": only_new,
        "changedFields": changed, "identical": not (only_old or only_new or changed),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="비교만 하고 파일을 쓰지 않는다")
    args = ap.parse_args()

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    new_resolved = build_from_registry(registry)

    old_resolved = json.loads(RESOLVED_PATH.read_text(encoding="utf-8")) if RESOLVED_PATH.exists() else []
    diff = diff_resolved(old_resolved, new_resolved)

    print(f"[비교] 기존 {diff['oldCount']}건 vs Registry기반 재생성 {diff['newCount']}건")
    print(f"  동일: {diff['identical']}")
    if diff["onlyInOld"]:
        print(f"  기존에만 있음: {diff['onlyInOld']}")
    if diff["onlyInNew"]:
        print(f"  신규에만 있음: {diff['onlyInNew']}")
    if diff["changedFields"]:
        print(f"  필드 변경: {len(diff['changedFields'])}건")
        for c in diff["changedFields"][:5]:
            print(f"    {c['sourceName']}: {c['old']} -> {c['new']}")

    if args.check:
        print("\n[--check] 파일을 쓰지 않았다.")
        return

    RESOLVED_PATH.write_text(json.dumps(new_resolved, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ {RESOLVED_PATH} 재생성 완료 ({len(new_resolved)}건)")


if __name__ == "__main__":
    main()
