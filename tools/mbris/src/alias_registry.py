"""Fish Alias Registry 핵심 로직 — 여러 파일에 흩어진 alias 상태를 하나로 합친다.

원본 관리 원칙: Registry가 원본(source of truth)이고, resolved mapping은 여기서
파생되는 산출물이다. 이 모듈은 순수 함수만 담는다(파일 I/O 없음) — 테스트하기 쉽고,
오케스트레이터(build_alias_registry.py)가 실제 파일을 읽고 쓴다.
"""
from __future__ import annotations

from dataclasses import dataclass, field

CANDIDATE = "candidate"
APPROVED = "approved"
MANUAL_REVIEW = "manual_review"
REJECTED = "rejected"

STATUS_PRIORITY = {APPROVED: 3, REJECTED: 2, MANUAL_REVIEW: 1, CANDIDATE: 0}
VALID_STATUS = set(STATUS_PRIORITY)

SPELLING_VARIANT = "spelling_variant"
DIALECT = "dialect"
SYNONYM = "synonym"
COMMON_NAME = "common_name"
MARKET_NAME = "market_name"
AGGREGATE_NAME = "aggregate_name"
SOURCE_ISSUE = "source_issue"
VALID_ALIAS_TYPE = {SPELLING_VARIANT, DIALECT, SYNONYM, COMMON_NAME, MARKET_NAME,
                    AGGREGATE_NAME, SOURCE_ISSUE}

VALID_CONFIDENCE = {"high", "medium", "low"}

# manual-review-queue.json의 reviewBucket → aliasType. 후보가 여럿(multiple_candidates)이거나
# 접미사로 묶인 집합명(collective_name)은 태생적으로 "여러 종을 아우를 수 있는" 이름이라
# aggregate_name으로 분류한다. 순수 미상(no_candidates)·단일 추정(single_same_group)은
# 근거가 부족해 common_name(중립 기본값)으로 둔다 — 임의로 더 강한 분류를 주지 않는다.
BUCKET_TO_ALIAS_TYPE = {
    "collective_name": AGGREGATE_NAME,
    "multiple_candidates": AGGREGATE_NAME,
    "source_name_pollution": SOURCE_ISSUE,
    "single_same_group": COMMON_NAME,
    "no_candidates": COMMON_NAME,
}

# batch2 decision → (status, aliasType). spelling_variant는 그 자체로 approved를
# 뜻하지 않는다 — 실제 승인 여부는 fish-data-approved-aliases.json이 결정한다
# (다른 assertion이 있으면 우선순위 규칙으로 자연히 approved가 이긴다).
BATCH2_DECISION_MAP = {
    "spelling_variant": (MANUAL_REVIEW, SPELLING_VARIANT),
    "aggregate_name": (MANUAL_REVIEW, AGGREGATE_NAME),
    "market_name": (MANUAL_REVIEW, MARKET_NAME),
    "source_name_issue": (MANUAL_REVIEW, SOURCE_ISSUE),
    "keep_manual_review": (MANUAL_REVIEW, COMMON_NAME),
    "approved_alias": (APPROVED, None),
    "approved_species": (APPROVED, None),
    "rejected_candidate": (REJECTED, COMMON_NAME),
}

BATCH1_DECISION_MAP = {
    "approved": (APPROVED, None),
    "rejected": (REJECTED, COMMON_NAME),
    "keep_manual_review": (MANUAL_REVIEW, COMMON_NAME),
}


@dataclass
class Assertion:
    """한 파일이 한 sourceName에 대해 주장하는 상태 1건."""
    status: str
    aliasType: str | None
    internalId: str | None
    canonicalName: str | None
    scientificName: str | None
    confidence: str
    evidence: list[dict]
    reviewBatch: str | None = None

    def priority(self) -> int:
        return STATUS_PRIORITY[self.status]


def assertions_from_link72(link_records: list[dict]) -> dict[str, list[Assertion]]:
    """fish-data-link.json(원본 72건) → approved 단언. matchType/viaNifs를 evidence로 보존한다."""
    out: dict[str, list[Assertion]] = {}
    for r in link_records:
        source = "NIFS_TRANSITIVE" if r.get("viaNifs") else "MBRIS_KOREAN_NAME_MATCH"
        ev = {"source": source, "type": r["matchType"],
              "value": f"{r['sourceName']} -> {r['internalId']} (candidateCount={r.get('candidateCount')})"}
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=APPROVED, aliasType=COMMON_NAME, internalId=r["internalId"],
            canonicalName=None, scientificName=None,
            confidence=r.get("confidence", "medium"), evidence=[ev], reviewBatch="original_link"))
    return out


def assertions_from_candidates(candidate_records: list[dict]) -> dict[str, list[Assertion]]:
    """fish-data-alias-candidates.json(79건, phase1 산출물) → candidate/approved 단언."""
    out: dict[str, list[Assertion]] = {}
    for r in candidate_records:
        status = APPROVED if r["status"] == "confirmed" else CANDIDATE
        cands = r.get("candidates") or []
        primary = cands[0] if cands else None
        if cands:
            ev = [{"source": "PHASE1_CANDIDATE_SEARCH", "type": c.get("matchMethod", ""),
                  "value": (f"{c.get('koreanName')}({c.get('scientificName')}) "
                           f"sim={c.get('similarityScore')} note={c.get('note', '')}")}
                 for c in cands]
        else:
            ev = [{"source": "PHASE1_CANDIDATE_SEARCH", "type": "no_candidates_found",
                  "value": "MBRIS 후보 탐색 결과 0건"}]
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=status, aliasType=COMMON_NAME,
            internalId=primary["internalId"] if primary else None,
            canonicalName=primary["koreanName"] if primary else None,
            scientificName=primary["scientificName"] if primary else None,
            confidence=primary["confidence"] if primary else "low",
            evidence=ev, reviewBatch="phase1_candidates"))
    return out


def assertions_from_batch1(batch1_records: list[dict]) -> dict[str, list[Assertion]]:
    out: dict[str, list[Assertion]] = {}
    for r in batch1_records:
        status, alias_type = BATCH1_DECISION_MAP[r["decision"]]
        ev = [{"source": "BATCH1_MANUAL_REVIEW", "type": "human_judgment",
              "value": f"{e}"} for e in (r.get("evidence") or [])]
        ev += [{"source": "BATCH1_MANUAL_REVIEW", "type": "conflict",
               "value": f"{e}"} for e in (r.get("conflicts") or [])]
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=status, aliasType=alias_type,
            internalId=r.get("candidateInternalId"),
            canonicalName=r.get("candidateKoreanName"),
            scientificName=r.get("candidateScientificName"),
            confidence=r.get("confidence", "low"), evidence=ev, reviewBatch="batch1"))
    return out


def assertions_from_batch2(batch2_records: list[dict]) -> dict[str, list[Assertion]]:
    out: dict[str, list[Assertion]] = {}
    for r in batch2_records:
        status, alias_type = BATCH2_DECISION_MAP[r["decision"]]
        if alias_type is None:
            alias_type = COMMON_NAME
        ev = [{"source": e["organization"], "type": "official_evidence",
              "value": f"{e['title']}: {e['evidence']}"} for e in (r.get("officialEvidence") or [])]
        ev += [{"source": "BATCH2_OFFICIAL_RESEARCH", "type": "conflict", "value": c}
              for c in (r.get("conflicts") or [])]
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=status, aliasType=alias_type,
            internalId=r.get("candidateInternalId"),
            canonicalName=r.get("canonicalKoreanName"),
            scientificName=r.get("acceptedScientificName"),
            confidence=r.get("confidence", "low"), evidence=ev, reviewBatch="batch2"))
    return out


# evidenceSource(왜 승인됐는가) → aliasType(무슨 종류의 별칭인가)
EVIDENCE_SOURCE_TO_ALIAS_TYPE = {
    "NIFS_DIALECT": DIALECT,
    "KOREAN_LANGUAGE_AUTHORITY": SPELLING_VARIANT,
    "OFFICIAL_RESEARCH": SYNONYM,
}


def assertions_from_approved_aliases(approved_records: list[dict]) -> dict[str, list[Assertion]]:
    out: dict[str, list[Assertion]] = {}
    for r in approved_records:
        ev = [{"source": r["evidenceSource"], "type": "approval", "value": r["evidenceValue"]}]
        alias_type = EVIDENCE_SOURCE_TO_ALIAS_TYPE.get(r["evidenceSource"], COMMON_NAME)
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=APPROVED, aliasType=alias_type,
            internalId=r["internalId"], canonicalName=r["canonicalKoreanName"],
            scientificName=None, confidence=r.get("matchConfidence", "high"),
            evidence=ev, reviewBatch="approval_round"))
    return out


def assertions_from_queue(queue_records: list[dict]) -> dict[str, list[Assertion]]:
    out: dict[str, list[Assertion]] = {}
    for r in queue_records:
        alias_type = BUCKET_TO_ALIAS_TYPE.get(r["reviewBucket"], COMMON_NAME)
        cands = r.get("candidates") or []
        primary = cands[0] if len(cands) == 1 else None  # 후보가 여럿이면 단일 ID를 못 정한다
        if cands:
            ev = [{"source": "MANUAL_REVIEW_QUEUE", "type": "candidate",
                  "value": f"{c.get('koreanName')}({c.get('scientificName')})"} for c in cands]
        else:
            # 후보가 0건인 것도 실제 탐색 결과다 — evidence를 비워두지 않고 그 사실 자체를 남긴다.
            ev = [{"source": "MANUAL_REVIEW_QUEUE", "type": "no_candidates_found",
                  "value": f"reviewBucket={r['reviewBucket']} — MBRIS 후보 탐색 결과 0건"}]
        out.setdefault(r["sourceName"], []).append(Assertion(
            status=MANUAL_REVIEW, aliasType=alias_type,
            internalId=primary["internalId"] if primary else None,
            canonicalName=primary["koreanName"] if primary else None,
            scientificName=primary["scientificName"] if primary else None,
            confidence=primary["confidence"] if primary else "low",
            evidence=ev, reviewBatch="current_queue"))
    return out


def _evidence_key(e: dict) -> tuple:
    return (e.get("source"), e.get("type"), e.get("value"))


# 동일 status를 여러 파일이 동시에 주장할 때(동률) 어느 파일의 필드값을 신뢰할지 순서.
# 나중에 나온(더 최신 정보를 반영한) 사람 검토·공식조사 결과가 최초 자동매칭보다 앞선다.
# 예: 참소라/은갈치는 candidates.json(phase1, aliasType 추정 없음)과
# approved_aliases.json(사람이 NIFS 방언을 확인)가 둘 다 approved로 동률인데,
# 후자의 aliasType(dialect)이 이겨야 한다.
BATCH_AUTHORITY_ORDER = ["approval_round", "batch2", "batch1", "current_queue",
                        "phase1_candidates", "original_link"]


def _authority_rank(batch: str | None) -> int:
    try:
        return BATCH_AUTHORITY_ORDER.index(batch)
    except ValueError:
        return len(BATCH_AUTHORITY_ORDER)


def merge_assertions(all_by_name: list[dict[str, list[Assertion]]]) -> dict[str, dict]:
    """이름별로 여러 파일의 주장을 모아 최종 레코드 하나로 합친다.

    우선순위: approved > rejected > manual_review > candidate.
    동률(같은 상태를 여러 파일이 동시에 주장)이면 BATCH_AUTHORITY_ORDER가 더 신뢰하는
    쪽의 필드를 쓰고, evidence는 전부 합친다(삭제 없음).
    """
    combined: dict[str, list[Assertion]] = {}
    for by_name in all_by_name:
        for name, assertions in by_name.items():
            combined.setdefault(name, []).extend(assertions)

    result: dict[str, dict] = {}
    for name, assertions in combined.items():
        best_priority = max(a.priority() for a in assertions)
        winners = [a for a in assertions if a.priority() == best_priority]
        winners.sort(key=lambda a: _authority_rank(a.reviewBatch))

        internal_id = next((a.internalId for a in winners if a.internalId), None)
        if internal_id is None:
            internal_id = next((a.internalId for a in assertions if a.internalId), None)

        canonical = next((a.canonicalName for a in winners if a.canonicalName), None)
        scientific = next((a.scientificName for a in winners if a.scientificName), None)
        alias_type = next((a.aliasType for a in winners if a.aliasType), None) or COMMON_NAME

        confidences = [a.confidence for a in winners if a.confidence]
        confidence = "high" if "high" in confidences else (
            "medium" if "medium" in confidences else (confidences[0] if confidences else "low"))

        evidence: list[dict] = []
        seen_ev = set()
        for a in assertions:  # 전체 이력(승자만이 아니라)에서 evidence를 다 모은다 — 삭제 없음
            for e in a.evidence:
                k = _evidence_key(e)
                if k not in seen_ev:
                    seen_ev.add(k)
                    evidence.append(e)

        review_batches = sorted({a.reviewBatch for a in assertions if a.reviewBatch})

        result[name] = {
            "sourceName": name,
            "canonicalName": canonical,
            "internalId": internal_id,
            "scientificName": scientific,
            "aliasType": alias_type,
            "status": winners[0].status,
            "confidence": confidence,
            "evidence": evidence,
            "reviewBatch": ",".join(review_batches),
        }
    return result


def detect_conflicts(records: dict[str, dict]) -> list[dict]:
    """§4 충돌 탐지: 동일 alias→다른 ID(단일 레코드 내에선 발생 안 함, 항상 빈 리스트지만
    같은 canonicalName이 다른 종을 가리키는 경우, approved인데 여러 종 후보가 남아있는
    경우, source_issue인데 approved인 경우를 확인한다."""
    conflicts = []

    canonical_to_ids: dict[str, set] = {}
    for r in records.values():
        if r["canonicalName"] and r["internalId"]:
            canonical_to_ids.setdefault(r["canonicalName"], set()).add(r["internalId"])
    for name, ids in canonical_to_ids.items():
        if len(ids) > 1:
            conflicts.append({"type": "same_canonical_name_multiple_species",
                              "canonicalName": name, "internalIds": sorted(ids)})

    for r in records.values():
        if r["status"] == APPROVED and r["aliasType"] == SOURCE_ISSUE:
            conflicts.append({"type": "source_issue_but_approved", "sourceName": r["sourceName"]})
        if r["status"] == APPROVED and not r["internalId"]:
            conflicts.append({"type": "approved_without_internal_id", "sourceName": r["sourceName"]})

    return conflicts
