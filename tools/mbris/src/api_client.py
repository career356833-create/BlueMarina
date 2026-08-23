"""MBRIS 종정보 API 클라이언트.

data.go.kr 게이트웨이는 인증 실패를 XML이 아니라 순수 HTTP 401(plain text
"Unauthorized")로 반환한다 — 실측 확인함(서비스키 없이/빈 값/형식만 맞춘 값
3가지 모두 동일하게 401 plain text). 그래서 401/403은 재시도하지 않는다:
같은 키로 다시 불러도 결과가 달라지지 않기 때문이다.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import httpx

from .config import MbrisApiConfig, MAX_RETRIES, BACKOFF_SECONDS, TIMEOUT_SECONDS

AUTH_ERROR = "auth_error"
RATE_LIMITED = "rate_limited"
SERVER_ERROR = "server_error"
TIMEOUT = "timeout"
CONNECTION_ERROR = "connection_error"
EMPTY_RESPONSE = "empty_response"
HTTP_ERROR = "http_error"

_NON_RETRYABLE = {AUTH_ERROR, HTTP_ERROR, EMPTY_RESPONSE}


@dataclass
class ApiResult:
    ok: bool
    url: str
    status_code: int | None = None
    body: bytes = b""
    error_type: str | None = None
    error_message: str | None = None
    attempts: int = 0
    elapsed_ms: float = 0.0


def classify_status(status_code: int, body: bytes) -> tuple[bool, str | None, str | None]:
    """(ok, error_type, error_message)를 반환한다."""
    if status_code == 200:
        if not body or not body.strip():
            return False, EMPTY_RESPONSE, "응답 본문이 비어 있음"
        return True, None, None
    if status_code in (401, 403):
        return False, AUTH_ERROR, f"인증 실패(HTTP {status_code}) — 서비스키 확인 필요"
    if status_code == 429:
        return False, RATE_LIMITED, "요청 한도 초과(HTTP 429)"
    if status_code >= 500:
        return False, SERVER_ERROR, f"서버 오류(HTTP {status_code})"
    return False, HTTP_ERROR, f"HTTP {status_code}"


class MbrisApiClient:
    def __init__(self, config: MbrisApiConfig, *,
                timeout: float = TIMEOUT_SECONDS,
                max_retries: int = MAX_RETRIES,
                backoff: list[int] | None = None,
                sleep_fn=time.sleep):
        self.config = config
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff = backoff if backoff is not None else list(BACKOFF_SECONDS)
        self._sleep = sleep_fn

    def fetch_species(self, *, spc_txn_id: str | None = None,
                      scientific_name: str | None = None,
                      korean_name: str | None = None,
                      family: str | None = None, family_kr: str | None = None,
                      page_no: int = 1, num_of_rows: int = 10,
                      client: httpx.Client | None = None) -> ApiResult:
        if not self.config.is_configured:
            return ApiResult(ok=False, url=self.config.taxonlist_url,
                             error_type=AUTH_ERROR,
                             error_message="MBRIS_API_KEY가 설정되지 않음")

        params = {"serviceKey": self.config.api_key, "pageNo": page_no,
                  "numOfRows": num_of_rows}
        if spc_txn_id:
            params["SpcTxnId"] = spc_txn_id
        if scientific_name:
            params["SpcScitfNm"] = scientific_name
        if korean_name:
            params["CommKorNm"] = korean_name
        if family:
            params["Family"] = family
        if family_kr:
            params["FamilyKR"] = family_kr

        url = self.config.taxonlist_url
        owns_client = client is None
        c = client or httpx.Client(timeout=self.timeout)
        try:
            return self._request_with_retry(c, url, params)
        finally:
            if owns_client:
                c.close()

    def _request_with_retry(self, client: httpx.Client, url: str, params: dict) -> ApiResult:
        last_error_type, last_error_message, last_status = None, None, None
        started = time.monotonic()

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = client.get(url, params=params)
            except httpx.TimeoutException:
                last_error_type, last_error_message = TIMEOUT, "요청 타임아웃"
            except httpx.ConnectError as exc:
                last_error_type, last_error_message = CONNECTION_ERROR, f"연결 실패: {exc}"
            except httpx.HTTPError as exc:
                last_error_type, last_error_message = CONNECTION_ERROR, f"HTTP 오류: {exc}"
            else:
                last_status = resp.status_code
                ok, err_type, err_msg = classify_status(resp.status_code, resp.content)
                if ok:
                    return ApiResult(ok=True, url=str(resp.url), status_code=resp.status_code,
                                     body=resp.content, attempts=attempt,
                                     elapsed_ms=(time.monotonic() - started) * 1000)
                last_error_type, last_error_message = err_type, err_msg
                if err_type in _NON_RETRYABLE:
                    return ApiResult(ok=False, url=url, status_code=resp.status_code,
                                     body=resp.content, error_type=err_type,
                                     error_message=err_msg, attempts=attempt,
                                     elapsed_ms=(time.monotonic() - started) * 1000)

            if attempt < self.max_retries:
                wait = self.backoff[min(attempt - 1, len(self.backoff) - 1)]
                self._sleep(wait)

        return ApiResult(ok=False, url=url, status_code=last_status,
                         error_type=last_error_type, error_message=last_error_message,
                         attempts=self.max_retries,
                         elapsed_ms=(time.monotonic() - started) * 1000)
