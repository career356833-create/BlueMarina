"""Taxonomy Gap Registry 무결성 검증. 순수 함수 — 파일 I/O 없음.

Alias Registry와는 완전히 별개 개념이다 — gap 레코드는 "이름"이 아니라
"우리 분류 체계에 빠진 생물군"을 추적하므로, alias(sourceName→internalId 승인)와
같은 sourceName을 공유해도 서로 다른 상태를 가질 수 있다(혼동 방지 검증 대상).
"""
from __future__ import annotations

VALID_GROUPS = {"Echinodermata"}
VALID_ISSUE_TYPES = {"taxonomy_missing"}
VALID_STATUS = {"planned", "in_progress", "resolved"}
REQUIRED_FIELDS = ("gapId", "group", "koreanName", "issueType", "reason", "status",
                   "relatedCandidates")


def validate_required_fields(records: list[dict]) -> list[dict]:
    errors = []
    seen_ids = set()

    for r in records:
        gid = r.get("gapId")
        if not gid:
            errors.append({"rule": "gap_id_missing", "koreanName": r.get("koreanName")})
        elif gid in seen_ids:
            errors.append({"rule": "gap_id_duplicate", "gapId": gid})
        else:
            seen_ids.add(gid)

        for field in REQUIRED_FIELDS:
            if field not in r:
                errors.append({"rule": "missing_field", "gapId": gid, "field": field})

        if r.get("group") not in VALID_GROUPS:
            errors.append({"rule": "invalid_group", "gapId": gid, "value": r.get("group")})

        if r.get("issueType") not in VALID_ISSUE_TYPES:
            errors.append({"rule": "invalid_issue_type", "gapId": gid, "value": r.get("issueType")})

        if r.get("status") not in VALID_STATUS:
            errors.append({"rule": "invalid_status", "gapId": gid, "value": r.get("status")})

        if not r.get("koreanName"):
            errors.append({"rule": "korean_name_missing", "gapId": gid})

        if not r.get("reason"):
            errors.append({"rule": "reason_missing", "gapId": gid})

    return errors


def validate_no_duplicate_registration(records: list[dict]) -> list[dict]:
    """같은 (koreanName, group) 조합이 두 번 등록되면 중복이다."""
    conflicts = []
    seen: dict[tuple, str] = {}
    for r in records:
        key = (r.get("koreanName"), r.get("group"))
        if key in seen:
            conflicts.append({"type": "duplicate_gap_registration", "koreanName": key[0],
                              "group": key[1], "gapIds": [seen[key], r.get("gapId")]})
        else:
            seen[key] = r.get("gapId")
    return conflicts


def validate_no_alias_registry_confusion(gap_records: list[dict], alias_records: list[dict]) -> list[dict]:
    """Taxonomy Gap과 Alias Registry가 같은 sourceName/koreanName에 대해 서로 다른
    이야기를 하는 것 자체는 정상이다(gap은 '분류 공백', alias는 '이름 승인 상태').
    다만 혼동을 막기 위해, gap 대상 이름이 Alias Registry에서 이미 approved 상태로
    특정 종에 확정되어 있다면 — 그 이름은 더 이상 taxonomy gap이 아니라는 뜻이므로
    모순으로 본다."""
    conflicts = []
    alias_by_name = {a["sourceName"]: a for a in alias_records}
    for g in gap_records:
        name = g.get("koreanName")
        alias = alias_by_name.get(name)
        if alias and alias.get("status") == "approved":
            conflicts.append({"type": "gap_target_already_approved_in_alias_registry",
                              "koreanName": name, "gapId": g.get("gapId"),
                              "aliasId": alias.get("aliasId"), "internalId": alias.get("internalId")})
    return conflicts


def run_validation(gap_records: list[dict], alias_records: list[dict] | None = None) -> dict:
    errors = validate_required_fields(gap_records)
    conflicts = validate_no_duplicate_registration(gap_records)
    if alias_records is not None:
        conflicts += validate_no_alias_registry_confusion(gap_records, alias_records)
    return {
        "totalRecords": len(gap_records),
        "errorCount": len(errors),
        "conflictCount": len(conflicts),
        "errors": errors,
        "conflicts": conflicts,
        "valid": len(errors) == 0 and len(conflicts) == 0,
    }
