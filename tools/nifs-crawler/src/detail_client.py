#!/usr/bin/env python3
"""NIFS 상세 페이지 HTTP 클라이언트.

실제 상세 URL은 목록 페이지의 콜백 함수(calBackFunc)에서 확정했다:
    ./actionChrpFishView.do?fishId={fishId}
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, asdict
from typing import Optional

import httpx

BASE_URL = "https://nifs.go.kr"
LIST_PAGE_URL = f"{BASE_URL}/portal/fr/chrpA/actionChrpFishList.do"
LIST_API_URL = f"{BASE_URL}/portal/fr/chrpA/selectChrpFishList.do"
DETAIL_URL = f"{BASE_URL}/portal/fr/chrpA/actionChrpFishView.do"
# 상세 shell 페이지의 fnSearch()가 호출하는 실제 데이터 API
DETAIL_API_URL = f"{BASE_URL}/portal/fr/chrpA/selectChrpFishViewData.do"
IMAGE_BASE = "https://download.nifs.go.kr/portal/ofiris/ME/sosf/"

# 목록 API 실제 요청 body (fnSearch: paramMap = {language:null})
LIST_API_BODY = {"language": None}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Referer": LIST_PAGE_URL,
}


@dataclass
class DetailResponse:
    """상세 요청 1건의 결과."""

    source_id: str
    request_url: str
    final_url: str
    http_status: int
    content_type: str
    content_length: int
    content_hash: str
    html: str
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.http_status == 200 and self.content_length > 0

    def to_metadata(self) -> dict:
        d = asdict(self)
        d.pop("html")
        return d


def build_detail_url(source_id: str) -> str:
    return f"{DETAIL_URL}?fishId={source_id}"


async def fetch_detail(client: httpx.AsyncClient, source_id: str) -> DetailResponse:
    """상세 페이지 1건을 가져온다. 예외는 DetailResponse.error로 흡수한다."""
    url = build_detail_url(source_id)
    try:
        resp = await client.get(url, headers=DEFAULT_HEADERS, follow_redirects=True)
    except Exception as exc:  # noqa: BLE001 - 호출자에게 구조화해 전달
        return DetailResponse(
            source_id=source_id,
            request_url=url,
            final_url=url,
            http_status=0,
            content_type="",
            content_length=0,
            content_hash="",
            html="",
            error=f"{type(exc).__name__}: {exc}",
        )

    body = resp.content
    # NIFS 포털은 meta charset을 신뢰할 수 있으나, 응답 헤더 우선 적용
    html = resp.text

    return DetailResponse(
        source_id=source_id,
        request_url=url,
        final_url=str(resp.url),
        http_status=resp.status_code,
        content_type=resp.headers.get("content-type", ""),
        content_length=len(body),
        content_hash=hashlib.sha256(body).hexdigest(),
        html=html,
    )


async def fetch_detail_data(client: httpx.AsyncClient, source_id: str) -> dict:
    """상세 데이터 API를 호출한다. shell 페이지가 아닌 실제 콘텐츠를 반환한다."""
    # lpCom.Ajax는 application/x-www-form-urlencoded로 보낸다. JSON으로 보내면
    # 서버가 파라미터를 읽지 못해 retMap=null을 반환한다.
    resp = await client.post(
        DETAIL_API_URL,
        headers={**DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest",
                 "Referer": build_detail_url(source_id)},
        data={"fishId": source_id},
    )
    resp.raise_for_status()
    return resp.json()


async def fetch_list(client: httpx.AsyncClient) -> dict:
    """목록 API를 호출한다."""
    resp = await client.post(
        LIST_API_URL,
        headers={**DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest"},
        data={k: v for k, v in LIST_API_BODY.items() if v is not None},
    )
    resp.raise_for_status()
    return resp.json()
