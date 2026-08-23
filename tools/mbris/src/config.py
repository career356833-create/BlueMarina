"""MBRIS 상세 API 설정. 키는 코드에 넣지 않고 환경변수/.env로만 읽는다.

실제 엔드포인트는 data.go.kr 공공데이터포털에 등록된
"국립해양생물자원관_해양생물종정보 서비스"(15094770)다.
  https://www.data.go.kr/data/15094770/openapi.do
  GET https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_BASE_URL = "https://apis.data.go.kr/B553482/mbrisdataview3"
TAXONLIST_PATH = "/taxonlist3"

TOOL_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = TOOL_ROOT / ".env"

TIMEOUT_SECONDS = 30.0
MAX_RETRIES = 3
BACKOFF_SECONDS = [10, 30, 90]
REQUEST_INTERVAL_SECONDS = 2.0


def _load_dotenv(path: Path) -> dict[str, str]:
    """의존성 추가 없이 KEY=VALUE 형식의 .env를 최소한으로 읽는다."""
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


@dataclass(frozen=True)
class MbrisApiConfig:
    api_key: str | None
    base_url: str

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    @property
    def taxonlist_url(self) -> str:
        return f"{self.base_url.rstrip('/')}{TAXONLIST_PATH}"


def load_config(env_file: Path | None = None) -> MbrisApiConfig:
    """환경변수 우선, 없으면 .env 파일에서 읽는다. 키가 없어도 예외를 던지지 않는다 —
    호출자가 is_configured로 확인 후 처리한다(예: dry-run은 키 없이도 동작해야 한다)."""
    dotenv = _load_dotenv(env_file or ENV_FILE)
    api_key = os.environ.get("MBRIS_API_KEY") or dotenv.get("MBRIS_API_KEY") or None
    base_url = (os.environ.get("MBRIS_API_BASE_URL") or dotenv.get("MBRIS_API_BASE_URL")
               or DEFAULT_BASE_URL)
    return MbrisApiConfig(api_key=api_key or None, base_url=base_url)
