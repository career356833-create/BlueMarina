#!/usr/bin/env python3
"""승인 별칭 2건(참소라→소라, 은갈치→갈치)을 파생 레이어로 반영한다.

원본 fish-data.ts와 기존 data/mbris/mappings/fish-data-link.json은 절대 덮어쓰지
않는다 — 전부 신규 파일만 만든다. manual_review 77건은 어디에도 반영하지 않는다.
"""
import json, sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
REPORTS = ROOT / "data" / "mbris" / "reports"
CANDIDATES_PATH = MAPPINGS / "fish-data-alias-candidates.json"
EXISTING_LINK_PATH = MAPPINGS / "fish-data-link.json"
NOW = datetime.now(timezone.utc).isoformat()

APPROVED_SOURCE_NAMES = {"참소라", "은갈치"}  # 이번 단계에서 승인된 것으로 확정된 2건만
POLLUTED_SOURCE_NAMES = {"가오리 꼬리주의", "쏨뱅이 독가시", "성게가시"}  # 승인 대상에서 명시적으로 제외

APPROVED_ALIAS_MATCH_TYPE = "approved_alias"
_MATCH_TYPE_RANK = {"scientific_exact": 3, "synonym": 2, "korean_candidate": 1,
                    APPROVED_ALIAS_MATCH_TYPE: 4}  # 사람이 검토·승인한 것이 가장 강한 근거


def load_candidates() -> list[dict]:
    return json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))


def build_approved_aliases(candidates: list[dict]) -> list[dict]:
    """§1: fish-data-approved-aliases.json 레코드를 만든다."""
    by_name = {r["sourceName"]: r for r in candidates}
    out = []
    for name in sorted(APPROVED_SOURCE_NAMES):
        rec = by_name[name]
        assert rec["status"] == "confirmed", f"{name}은(는) confirmed 상태가 아니다"
        assert len(rec["candidates"]) == 1, f"{name} 후보가 1건이 아니다 — 승인 전제 위반"
        cand = rec["candidates"][0]
        out.append({
            "sourceName": name,
            "canonicalKoreanName": cand["koreanName"],
            "internalId": cand["internalId"],
            "evidenceSource": "NIFS_DIALECT",
            "evidenceValue": cand["note"],
            "approvalStatus": "approved",
            "approvedAt": NOW,
            "matchConfidence": cand["confidence"],
        })
    return out


def build_source_name_issues(candidates: list[dict]) -> list[dict]:
    """§5: 이름 오염 3건은 승인 대상에서 제외하고 별도 이슈 파일만 만든다."""
    by_name = {r["sourceName"]: r for r in candidates}
    out = []
    for name in sorted(POLLUTED_SOURCE_NAMES):
        rec = by_name[name]
        out.append({
            "originalName": rec["sourceName"],
            "inferredBaseName": rec["matchingBaseName"],
            "relatedFishEvidence": rec.get("existingDescription"),
            "issueType": "source_name_contains_non_species_text",
            "recommendedAction": ("fish-data.ts의 name 필드를 실제 종명으로 정정 검토 필요"
                                  "(이번 작업에서는 원본을 수정하지 않음)"),
            "status": "manual_review",
        })
    return out


def merge_resolved_mapping(existing: list[dict], approved: list[dict]) -> list[dict]:
    """순수 병합 로직 — 파일 I/O 없음. 기존 링크 + 승인 별칭만 합친다(manual_review 제외)."""
    resolved: list[dict] = []
    for link in existing:
        resolved.append({
            "sourceName": link["sourceName"],
            "internalId": link["internalId"],
            "matchType": link["matchType"],
            "confidence": link["confidence"],
            "evidenceSource": "NIFS_TRANSITIVE" if link.get("viaNifs") else "MBRIS_KOREAN_NAME_MATCH",
            "resolutionStatus": "resolved",
        })
    for a in approved:
        resolved.append({
            "sourceName": a["sourceName"],
            "internalId": a["internalId"],
            "matchType": APPROVED_ALIAS_MATCH_TYPE,
            "confidence": a["matchConfidence"],
            "evidenceSource": a["evidenceSource"],
            "resolutionStatus": "resolved",
        })

    # 검증: 중복 sourceName 금지(레코드 단위 1:1), 동일 internalId 복수 sourceName은 허용
    names = [r["sourceName"] for r in resolved]
    dup_names = {n for n, c in Counter(names).items() if c > 1}
    if dup_names:
        raise SystemExit(f"중복 sourceName 발견 — 병합 로직 오류: {dup_names}")

    return resolved


def main() -> None:
    MAPPINGS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    candidates = load_candidates()

    print("[1] 승인 별칭 파일 생성")
    approved = build_approved_aliases(candidates)
    (MAPPINGS / "fish-data-approved-aliases.json").write_text(
        json.dumps(approved, ensure_ascii=False, indent=2), encoding="utf-8")
    for a in approved:
        print(f"    {a['sourceName']} -> {a['canonicalKoreanName']} ({a['internalId']})")

    print("[2] 이름 오염 이슈 파일 생성(승인 대상 제외)")
    issues = build_source_name_issues(candidates)
    (REPORTS / "fish-data-source-name-issues.json").write_text(
        json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"    {len(issues)}건: {[i['originalName'] for i in issues]}")

    print("[3] 통합 매핑(resolved) 생성")
    existing = json.loads(EXISTING_LINK_PATH.read_text(encoding="utf-8"))
    resolved = merge_resolved_mapping(existing, approved)
    (MAPPINGS / "fish-data-link-resolved.json").write_text(
        json.dumps(resolved, ensure_ascii=False, indent=2), encoding="utf-8")

    by_internal = defaultdict(list)
    for r in resolved:
        by_internal[r["internalId"]].append(r["sourceName"])
    multi = {iid: names for iid, names in by_internal.items() if len(names) > 1}
    print(f"    기존 72 + 승인 2 = {len(resolved)}건")
    print(f"    동일 internalId 복수 sourceName: {multi}")

    # 원본 파일 불변 확인(자기 점검)
    existing_bytes_after = EXISTING_LINK_PATH.read_bytes()
    print(f"\n✅ 원본 {EXISTING_LINK_PATH.name} 은 이 스크립트에서 읽기만 했다"
          f"({len(existing_bytes_after)} bytes, 수정 없음)")


if __name__ == "__main__":
    main()
