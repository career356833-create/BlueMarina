"""api_client 테스트. httpx.MockTransport로 오프라인 결정론적 검증."""
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api_client import MbrisApiClient, classify_status, AUTH_ERROR, RATE_LIMITED, \
    SERVER_ERROR, TIMEOUT, CONNECTION_ERROR, EMPTY_RESPONSE
from src.config import MbrisApiConfig

CONFIG = MbrisApiConfig(api_key="test-key", base_url="https://example.test/api")


def make_client(handler, sleeps=None):
    calls = sleeps if sleeps is not None else []
    transport = httpx.MockTransport(handler)
    client = MbrisApiClient(CONFIG, sleep_fn=lambda s: calls.append(s))
    return client, transport, calls


def fetch(client, transport, **kw):
    with httpx.Client(transport=transport) as c:
        return client.fetch_species(client=c, **kw)


# --- classify_status ---
def test_classify_200_with_body_is_ok():
    ok, err, msg = classify_status(200, b"<x/>")
    assert ok and err is None


def test_classify_200_empty_body_is_error():
    ok, err, _ = classify_status(200, b"")
    assert not ok and err == EMPTY_RESPONSE


@pytest.mark.parametrize("status,expected", [(401, AUTH_ERROR), (403, AUTH_ERROR)])
def test_classify_auth_errors(status, expected):
    ok, err, _ = classify_status(status, b"Unauthorized")
    assert not ok and err == expected


def test_classify_429_is_rate_limited():
    ok, err, _ = classify_status(429, b"")
    assert not ok and err == RATE_LIMITED


def test_classify_5xx_is_server_error():
    ok, err, _ = classify_status(500, b"")
    assert not ok and err == SERVER_ERROR
    ok, err, _ = classify_status(503, b"")
    assert not ok and err == SERVER_ERROR


# --- 키 없음 ---
def test_키_없으면_요청도_하지_않고_auth_error():
    client = MbrisApiClient(MbrisApiConfig(api_key=None, base_url="https://x.test"))
    result = client.fetch_species(scientific_name="Genus species")
    assert not result.ok
    assert result.error_type == AUTH_ERROR


# --- 정상 응답 ---
def test_200_응답은_성공으로_처리된다():
    def handler(request):
        return httpx.Response(200, content=b"<response><body/></response>")
    client, transport, _ = make_client(handler)
    r = fetch(client, transport, scientific_name="Genus species")
    assert r.ok
    assert r.status_code == 200
    assert r.attempts == 1


def test_serviceKey가_요청파라미터에_포함된다():
    captured = {}
    def handler(request):
        captured["params"] = dict(request.url.params)
        return httpx.Response(200, content=b"<response/>")
    client, transport, _ = make_client(handler)
    fetch(client, transport, scientific_name="Genus species")
    assert captured["params"]["serviceKey"] == "test-key"
    assert captured["params"]["SpcScitfNm"] == "Genus species"


# --- 401/403: 재시도 없음 ---
def test_401은_재시도하지_않는다():
    calls = []
    def handler(request):
        calls.append(1)
        return httpx.Response(401, content=b"Unauthorized")
    client, transport, sleeps = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert not r.ok
    assert r.error_type == AUTH_ERROR
    assert len(calls) == 1  # 재시도 없음
    assert sleeps == []


# --- 429/5xx: 재시도 + backoff ---
def test_429는_최대재시도까지_backoff로_재시도한다():
    calls = []
    def handler(request):
        calls.append(1)
        return httpx.Response(429, content=b"")
    client, transport, sleeps = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert not r.ok
    assert r.error_type == RATE_LIMITED
    assert len(calls) == 3  # MAX_RETRIES
    assert sleeps == [10, 30]  # 마지막 시도 후에는 대기하지 않음


def test_재시도중_성공하면_거기서_멈춘다():
    attempt = {"n": 0}
    def handler(request):
        attempt["n"] += 1
        if attempt["n"] < 3:
            return httpx.Response(500, content=b"")
        return httpx.Response(200, content=b"<response/>")
    client, transport, sleeps = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert r.ok
    assert r.attempts == 3
    assert sleeps == [10, 30]


# --- timeout / connection error ---
def test_타임아웃은_재시도된다():
    calls = []
    def handler(request):
        calls.append(1)
        raise httpx.TimeoutException("timed out")
    client, transport, sleeps = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert not r.ok
    assert r.error_type == TIMEOUT
    assert len(calls) == 3


def test_연결오류는_재시도된다():
    def handler(request):
        raise httpx.ConnectError("connection refused")
    client, transport, sleeps = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert not r.ok
    assert r.error_type == CONNECTION_ERROR
    assert len(sleeps) == 2


# --- 빈 응답 ---
def test_200이지만_빈본문은_실패로_처리된다():
    def handler(request):
        return httpx.Response(200, content=b"")
    client, transport, _ = make_client(handler)
    r = fetch(client, transport, scientific_name="x")
    assert not r.ok
    assert r.error_type == EMPTY_RESPONSE
