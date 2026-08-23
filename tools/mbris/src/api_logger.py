"""모든 MBRIS API 호출을 원본 그대로 기록한다(성공/실패 무관, 검색 호출 포함).

data/mbris/raw/detail/{internalId}/response.xml은 "최종 채택된" 응답만 담고,
여기 api/ 아래는 그 종에 도달하기까지의 모든 시도(재검색 등)를 남긴다 — 감사·재현용.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from .api_client import ApiResult

REQUESTS_DIR = "requests"
RESPONSES_DIR = "responses"
LOGS_DIR = "logs"
LOG_FILE_NAME = "call-log.jsonl"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_stamp() -> str:
    return now_iso().replace(":", "").replace("+", "Z").replace(".", "_")


class ApiCallLogger:
    def __init__(self, api_dir: Path):
        self.api_dir = api_dir
        self.requests_dir = api_dir / REQUESTS_DIR
        self.responses_dir = api_dir / RESPONSES_DIR
        self.logs_dir = api_dir / LOGS_DIR
        for d in (self.requests_dir, self.responses_dir, self.logs_dir):
            d.mkdir(parents=True, exist_ok=True)
        self.log_path = self.logs_dir / LOG_FILE_NAME

    def record(self, *, internal_id: str, endpoint: str, params: dict,
              result: ApiResult, spc_txn_id: str | None = None) -> dict:
        stamp = _safe_stamp()
        safe_id = internal_id or "unknown"
        req_path = self.requests_dir / f"{stamp}_{safe_id}.json"
        resp_path = self.responses_dir / f"{stamp}_{safe_id}.xml"

        loggable_params = {k: v for k, v in params.items() if k != "serviceKey"}
        req_path.write_text(json.dumps({
            "internalId": internal_id, "endpoint": endpoint,
            "params": loggable_params, "requestAt": now_iso(),
        }, ensure_ascii=False, indent=2), encoding="utf-8")

        resp_path.write_bytes(result.body or b"")

        response_hash = hashlib.sha256(result.body or b"").hexdigest() if result.body else None
        entry = {
            "internalId": internal_id,
            "spcTxnId": spc_txn_id,
            "requestAt": now_iso(),
            "endpoint": endpoint,
            "params": loggable_params,
            "statusCode": result.status_code,
            "ok": result.ok,
            "errorType": result.error_type,
            "responseHash": response_hash,
            "requestFilePath": str(req_path),
            "responseFilePath": str(resp_path),
            "attempts": result.attempts,
            "elapsedMs": round(result.elapsed_ms, 1),
        }
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return entry
