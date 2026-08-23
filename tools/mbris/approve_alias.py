#!/usr/bin/env python3
"""단일 별칭을 실제로 resolved 매핑에 반영한다(시뮬레이션이 아니라 실적용).

지금까지의 batch1/batch2 스크립트는 전부 "실제 파일을 수정하지 않는다"는 제약이
있었다. 이번 라운드는 사용자가 명시적으로 "실제 반영한다"를 선택한 예외다.
그래도 원본은 건드리지 않는다 — 수정 대상은 파생 레이어(resolved 계열)뿐이다.

절대 수정하지 않는 파일(원본):
  - src/data/fish-data.ts
  - data/mbris/mappings/fish-data-link.json (기존 72건, 최초 원본 매핑)
  - data/mbris/priority/service-priority.json 등 비-resolved 산출물

수정하는 파일(파생 레이어):
  - data/mbris/mappings/fish-data-approved-aliases.json  (append)
  - data/mbris/mappings/fish-data-link-resolved.json      (append)
  - data/mbris/mappings/fish-data-manual-review-queue.json (해당 항목 제거)
  - data/mbris/priority/service-priority-resolved.json 등  (재계산, build_service_priority_resolved.py 재사용)
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NOW = datetime.now(timezone.utc).isoformat()

APPROVED_ALIASES_PATH = MAPPINGS / "fish-data-approved-aliases.json"
RESOLVED_PATH = MAPPINGS / "fish-data-link-resolved.json"
QUEUE_PATH = MAPPINGS / "fish-data-manual-review-queue.json"
BATCH2_PATH = MAPPINGS / "fish-data-alias-review-batch2.json"

ELIGIBLE_DECISIONS = {"spelling_variant", "approved_alias", "approved_species"}


def find_batch_record(source_name: str) -> dict:
    """batch2(우선) 또는 batch1에서 해당 이름의 조사 근거를 찾는다."""
    for path in (BATCH2_PATH, MAPPINGS / "fish-data-alias-review-batch1.json"):
        if not path.exists():
            continue
        for r in json.loads(path.read_text(encoding="utf-8")):
            if r["sourceName"] == source_name:
                return r
    raise SystemExit(f"{source_name}에 대한 검토 레코드를 찾지 못했다 — batch1/batch2 먼저 실행할 것")


def validate_eligible(record: dict) -> None:
    decision = record.get("decision")
    if decision not in ELIGIBLE_DECISIONS:
        raise SystemExit(f"승인 불가: decision={decision!r} (허용: {ELIGIBLE_DECISIONS})")
    if record.get("confidence") != "high":
        raise SystemExit(f"승인 불가: confidence={record.get('confidence')!r} (high만 허용)")
    iid = record.get("candidateInternalId")
    if not iid:
        raise SystemExit("승인 불가: candidateInternalId가 없다(집합명/시장명/이름오염일 가능성)")
    if not record.get("officialEvidence") and not record.get("candidates"):
        raise SystemExit("승인 불가: 근거(officialEvidence)가 없다")


def already_applied(source_name: str) -> bool:
    if not RESOLVED_PATH.exists():
        return False
    resolved = json.loads(RESOLVED_PATH.read_text(encoding="utf-8"))
    return any(r["sourceName"] == source_name for r in resolved)


def apply(source_name: str, *, dry_run: bool) -> dict:
    record = find_batch_record(source_name)
    validate_eligible(record)

    if already_applied(source_name):
        raise SystemExit(f"{source_name}은 이미 resolved 매핑에 존재한다 — 중복 반영 방지")

    internal_id = record["candidateInternalId"]
    canonical = record.get("canonicalKoreanName")
    sci = record.get("acceptedScientificName")
    confidence = record["confidence"]

    evidence = record.get("officialEvidence") or []
    evidence_orgs = sorted({e["organization"] for e in evidence}) if evidence else []
    evidence_source = "KOREAN_LANGUAGE_AUTHORITY" if any(
        "국립국어원" in o for o in evidence_orgs) else "OFFICIAL_RESEARCH"
    evidence_summary = " / ".join(f"{e['organization']}: {e['evidence']}" for e in evidence) \
        if evidence else (record.get("candidates", [{}])[0].get("note") or "")

    print(f"[승인 대상] {source_name} -> {canonical}({sci}) [{internal_id}]")
    print(f"  근거: {evidence_summary[:200]}")
    if dry_run:
        print("  [DRY-RUN] 실제로 쓰지 않는다.")
        return record

    # 1) approved-aliases append
    approved = json.loads(APPROVED_ALIASES_PATH.read_text(encoding="utf-8")) \
        if APPROVED_ALIASES_PATH.exists() else []
    approved.append({
        "sourceName": source_name,
        "canonicalKoreanName": canonical,
        "internalId": internal_id,
        "evidenceSource": evidence_source,
        "evidenceValue": evidence_summary,
        "approvalStatus": "approved",
        "approvedAt": NOW,
        "matchConfidence": confidence,
    })
    APPROVED_ALIASES_PATH.write_text(
        json.dumps(approved, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2) resolved mapping append (+ 중복 sourceName 검증)
    resolved = json.loads(RESOLVED_PATH.read_text(encoding="utf-8")) if RESOLVED_PATH.exists() else []
    if any(r["sourceName"] == source_name for r in resolved):
        raise SystemExit(f"중복 sourceName 감지: {source_name}")
    resolved.append({
        "sourceName": source_name,
        "internalId": internal_id,
        "matchType": "approved_alias",
        "confidence": confidence,
        "evidenceSource": evidence_source,
        "resolutionStatus": "resolved",
    })
    names = [r["sourceName"] for r in resolved]
    if len(names) != len(set(names)):
        raise SystemExit("중복 sourceName 발생 — 반영 중단")
    RESOLVED_PATH.write_text(json.dumps(resolved, ensure_ascii=False, indent=2), encoding="utf-8")

    # 3) manual review queue에서 제거
    if QUEUE_PATH.exists():
        queue = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
        before = len(queue)
        queue = [r for r in queue if r["sourceName"] != source_name]
        QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  manual_review 큐: {before} -> {len(queue)}건")

    print(f"  ✅ resolved {len(resolved) - 1} -> {len(resolved)}건")
    return record


def main() -> None:
    ap = argparse.ArgumentParser(description="승인된 별칭을 resolved 매핑에 실제 반영한다")
    ap.add_argument("source_name")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    apply(args.source_name, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
