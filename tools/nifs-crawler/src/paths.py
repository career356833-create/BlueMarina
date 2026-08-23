"""수집 산출물 경로. raw(원본)와 normalized(가공)를 물리적으로 분리한다."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent
NIFS = ROOT / "data" / "nifs"

RAW_LIST = NIFS / "raw" / "list"
RAW_FISH = NIFS / "raw" / "fish"
NORMALIZED = NIFS / "normalized"
NORMALIZED_FISH = NORMALIZED / "fish"
STATE = NIFS / "state"
REPORTS = NIFS / "reports"
VERSIONS = NIFS / "versions"

STATE_FILE = STATE / "crawl-state.json"

LIST_PARSER_VERSION = "nifs-list-v1.0.0"
DETAIL_PARSER_VERSION = "nifs-detail-v1.0.0"


def ensure_dirs() -> None:
    for d in (RAW_LIST, RAW_FISH, NORMALIZED_FISH, STATE, REPORTS, VERSIONS):
        d.mkdir(parents=True, exist_ok=True)


def fish_raw_dir(source_id: str) -> Path:
    return RAW_FISH / source_id


def fish_images_dir(source_id: str) -> Path:
    return RAW_FISH / source_id / "images" / "original"


def version_dir(source_id: str, timestamp: str) -> Path:
    # 콜론은 Windows 경로에 쓸 수 없다
    safe = timestamp.replace(":", "").replace("+", "Z")
    return VERSIONS / source_id / safe
