"""Fish Alias Registry 무결성·충돌 검증. 순수 함수 — 파일 I/O 없음."""
from __future__ import annotations

from src.alias_registry import VALID_STATUS, VALID_ALIAS_TYPE, VALID_CONFIDENCE, APPROVED, SOURCE_ISSUE


def validate_required_fields(records: list[dict]) -> list[dict]:
    """§4 필수 검증. 문제를 못 찾으면 빈 리스트."""
    errors = []
    seen_ids = set()

    for r in records:
        aid = r.get("aliasId")
        if not aid:
            errors.append({"rule": "alias_id_missing", "sourceName": r.get("sourceName")})
        elif aid in seen_ids:
            errors.append({"rule": "alias_id_duplicate", "aliasId": aid})
        else:
            seen_ids.add(aid)

        if not r.get("sourceName"):
            errors.append({"rule": "source_name_missing", "aliasId": aid})

        if r.get("status") not in VALID_STATUS:
            errors.append({"rule": "invalid_status", "aliasId": aid, "value": r.get("status")})

        if r.get("aliasType") not in VALID_ALIAS_TYPE:
            errors.append({"rule": "invalid_alias_type", "aliasId": aid, "value": r.get("aliasType")})

        if r.get("confidence") not in VALID_CONFIDENCE:
            errors.append({"rule": "invalid_confidence", "aliasId": aid, "value": r.get("confidence")})

        if r.get("status") == "approved" and not r.get("internalId"):
            errors.append({"rule": "approved_missing_internal_id", "aliasId": aid,
                           "sourceName": r.get("sourceName")})

        if r.get("status") == "manual_review" and not r.get("evidence"):
            errors.append({"rule": "manual_review_missing_candidate_info", "aliasId": aid,
                           "sourceName": r.get("sourceName")})

    return errors


def validate_conflicts(records: list[dict]) -> list[dict]:
    """§4 충돌 탐지. detect_conflicts()보다 레코드 단위로 더 세밀하게 본다."""
    conflicts = []

    by_source: dict[str, list[dict]] = {}
    for r in records:
        by_source.setdefault(r["sourceName"], []).append(r)
    for name, recs in by_source.items():
        if len(recs) > 1:
            ids = {r["internalId"] for r in recs if r["internalId"]}
            if len(ids) > 1:
                conflicts.append({"type": "same_alias_different_internal_id",
                                  "sourceName": name, "internalIds": sorted(ids)})

    canonical_to_ids: dict[str, set] = {}
    for r in records:
        if r.get("canonicalName") and r.get("internalId"):
            canonical_to_ids.setdefault(r["canonicalName"], set()).add(r["internalId"])
    for name, ids in canonical_to_ids.items():
        if len(ids) > 1:
            conflicts.append({"type": "same_canonical_name_different_species",
                              "canonicalName": name, "internalIds": sorted(ids)})

    approved_species_sources: dict[str, set] = {}
    for r in records:
        if r["status"] == APPROVED and r.get("internalId"):
            approved_species_sources.setdefault(r["internalId"], set()).add(r["sourceName"])
    for iid, names in approved_species_sources.items():
        if len(names) > 1:
            conflicts.append({"type": "approved_alias_multiple_species_link",
                              "internalId": iid, "sourceNames": sorted(names),
                              "note": "여러 sourceName이 한 종을 가리키는 건 정상(동의어 허용)"})

    for r in records:
        if r["status"] == APPROVED and r["aliasType"] == SOURCE_ISSUE:
            conflicts.append({"type": "source_issue_but_approved",
                              "sourceName": r["sourceName"], "aliasId": r["aliasId"]})

    return conflicts


def run_validation(records: list[dict]) -> dict:
    errors = validate_required_fields(records)
    conflicts = validate_conflicts(records)
    return {
        "totalRecords": len(records),
        "errorCount": len(errors),
        "conflictCount": len(conflicts),
        "errors": errors,
        "conflicts": conflicts,
        "valid": len(errors) == 0,
    }
