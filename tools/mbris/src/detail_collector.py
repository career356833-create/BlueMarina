"""Tier A 종의 MBRIS 상세 정보 수집 오케스트레이션.

검색 → 매칭 → 원본 저장 → 정규화 → 상태 갱신까지 한 종 단위로 처리한다.
MBRIS 국가목록(taxonomy-master.json)에는 SpcTxnId가 없어, 학명으로 먼저
검색하고(SpcScitfNm) 결과가 없으면 국명으로 재검색한다(CommKorNm).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .api_client import MbrisApiClient
from .api_logger import ApiCallLogger
from .config import MbrisApiConfig
from .detail_normalizer import normalize_detail
from .detail_state import DetailCollectionState, COMPLETE, FAILED, PENDING, now_iso
from .xml_parser import parse_taxonlist_xml


def load_tier_a_candidates(path: Path) -> tuple[list[dict], list[str]]:
    """Tier A 후보를 검증·중복제거한다. (유효 후보, 문제 메모) 튜플을 돌려준다."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    valid: list[dict] = []
    issues: list[str] = []

    for row in raw:
        iid = row.get("internalId")
        sci = row.get("scientificName")
        if not iid:
            issues.append(f"internalId 없음 — 건너뜀: {row!r}")
            continue
        if not sci:
            issues.append(f"{iid}: scientificName 없음 — 건너뜀")
            continue
        if iid in seen:
            issues.append(f"{iid}: 중복 — 건너뜀")
            continue
        seen.add(iid)
        if not row.get("koreanName"):
            issues.append(f"{iid}: koreanName 없음(수집은 진행)")
        valid.append(row)

    return valid, issues


def _api_short_name(item: dict) -> str:
    """SpcScitfNm은 권위자 인용이 포함된 원문("Trichiurus japonicus Temminck &
    Schlegel, 1844")이라 taxonomy-master.json의 canonical 학명("Trichiurus
    japonicus")과 절대 정확히 일치하지 않는다 — 실제 5종 응답으로 확인(전부
    "학명 불일치"로 잘못 표시됨). SpcScitfNmShort가 권위자 없이 canonical과
    같은 형식이라 이쪽으로 비교해야 한다. 없으면 SpcScitfNm으로 대체한다."""
    return (item.get("SpcScitfNmShort") or item.get("SpcScitfNm") or "").strip()


def select_best_item(items: list[dict], expected_scientific_name: str) -> tuple[dict | None, str]:
    """검색 결과 중 하나를 고른다. 애매하면 None을 돌려주고 이유를 남긴다(자동 확정 안 함)."""
    if not items:
        return None, "검색 결과 0건"

    exact = [it for it in items if _api_short_name(it) == expected_scientific_name.strip()]
    if len(exact) == 1:
        return exact[0], "학명 정확 일치(단일, SpcScitfNmShort 기준)"
    if len(exact) > 1:
        return None, f"학명 정확 일치가 {len(exact)}건 — 수동 검토 필요"

    if len(items) == 1:
        return items[0], "검색결과 단일건(학명 불일치, 수동 검토 권장)"

    return None, f"검색결과 {len(items)}건, 학명 정확 일치 없음 — 수동 검토 필요"


class DetailCollector:
    def __init__(self, *, config: MbrisApiConfig, raw_detail_dir: Path,
                normalized_detail_dir: Path, api_dir: Path, state_path: Path,
                client: MbrisApiClient | None = None):
        self.config = config
        self.raw_detail_dir = raw_detail_dir
        self.normalized_detail_dir = normalized_detail_dir
        self.state_path = state_path
        self.client = client or MbrisApiClient(config)
        self.logger = ApiCallLogger(api_dir)
        self.state = DetailCollectionState.load(state_path)

    def collect_one(self, candidate: dict, *, force: bool = False) -> str:
        internal_id, sci_name, ko_name = (candidate["internalId"], candidate["scientificName"],
                                          candidate.get("koreanName"))
        if self.state.should_skip(internal_id, force=force):
            return COMPLETE

        st = self.state.item(internal_id)
        st.status = PENDING
        st.attemptCount += 1
        st.lastAttemptAt = now_iso()

        result = self.client.fetch_species(scientific_name=sci_name)
        self.logger.record(internal_id=internal_id, endpoint=self.config.taxonlist_url,
                           params={"SpcScitfNm": sci_name}, result=result)

        if not result.ok:
            if result.error_type == "empty_response" and ko_name:
                # 학명 검색이 비어도 국명으로 한 번 더 시도한다(원본 보존 원칙과 무관 — 재검색일 뿐)
                result = self.client.fetch_species(korean_name=ko_name)
                self.logger.record(internal_id=internal_id, endpoint=self.config.taxonlist_url,
                                   params={"CommKorNm": ko_name}, result=result)
            if not result.ok:
                st.status = FAILED
                st.lastError = f"{result.error_type}: {result.error_message}"
                self.state.save(self.state_path)
                return FAILED

        parsed = parse_taxonlist_xml(result.body)
        if not parsed.ok:
            st.status = FAILED
            st.lastError = f"xml_parse_error: {parsed.error}"
            self.state.save(self.state_path)
            return FAILED

        item, match_note = select_best_item(parsed.items, sci_name)

        # HTTP는 정상(200, ok=True)인데 학명 검색이 그냥 0건을 돌려주는 경우가 실제로
        # 있다(86종 실수집 중 갯강구/Ligia exotica로 확인 — <items/>, totalCount=0,
        # ResultCode=00). 이건 error_type이 없어서 위 empty_response 분기를 안 타므로
        # 별도로 국명 재검색 폴백을 한 번 더 시도한다.
        if item is None and ko_name:
            original_note = match_note
            retry_result = self.client.fetch_species(korean_name=ko_name)
            self.logger.record(internal_id=internal_id, endpoint=self.config.taxonlist_url,
                               params={"CommKorNm": ko_name}, result=retry_result)
            if retry_result.ok:
                retry_parsed = parse_taxonlist_xml(retry_result.body)
                if retry_parsed.ok:
                    retry_item, retry_note = select_best_item(retry_parsed.items, sci_name)
                    if retry_item is not None:
                        result, parsed, item, match_note = (
                            retry_result, retry_parsed, retry_item,
                            f"{retry_note}(학명 검색 0건 → 국명 재검색으로 매칭)")
                    else:
                        # 국명 재검색도 실패 — 원래 이유와 재검색 결과를 모두 기록해야
                        # 나중에 "왜 실패했는지" 로그만 보고 판단할 수 있다.
                        match_note = (f"학명검색({original_note}) → "
                                      f"국명재검색도 실패({retry_note})")

        if item is None:
            st.status = FAILED
            st.lastError = f"매칭 실패: {match_note}"
            self.state.save(self.state_path)
            return FAILED

        spc_txn_id = item.get("SpcTxnId")
        st.spcTxnId = spc_txn_id

        d = self.raw_detail_dir / internal_id
        d.mkdir(parents=True, exist_ok=True)
        (d / "response.xml").write_bytes(result.body)
        (d / "metadata.json").write_text(json.dumps({
            "internalId": internal_id, "spcTxnId": spc_txn_id,
            "requestAt": now_iso(), "endpoint": self.config.taxonlist_url,
            "statusCode": result.status_code,
            "responseHash": hashlib.sha256(result.body).hexdigest(),
            "filePath": str(d / "response.xml"), "matchNote": match_note,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        (d / "parsed-preview.json").write_text(json.dumps({
            "resultCode": parsed.result_code, "resultMsg": parsed.result_msg,
            "totalCount": parsed.total_count, "matchedItem": item,
            "observedFields": sorted(parsed.raw_field_names),
        }, ensure_ascii=False, indent=2), encoding="utf-8")

        detail = normalize_detail(internal_id=internal_id, source_id=spc_txn_id, item=item,
                                  raw_body=result.body, api_endpoint=self.config.taxonlist_url)
        self.normalized_detail_dir.mkdir(parents=True, exist_ok=True)
        (self.normalized_detail_dir / f"{internal_id}.json").write_text(
            json.dumps(detail, ensure_ascii=False, indent=2), encoding="utf-8")

        st.status = COMPLETE
        st.lastError = None
        st.lastSuccessAt = now_iso()
        self.state.save(self.state_path)
        return COMPLETE
