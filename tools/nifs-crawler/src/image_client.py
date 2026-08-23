"""이미지 수집 및 판독. 원본을 변형하지 않고 저장한다."""
from __future__ import annotations

import hashlib
from io import BytesIO
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image

from .detail_client import IMAGE_BASE, DEFAULT_HEADERS
from .state import now

ROLE_LIST_THUMBNAIL = "list_thumbnail"
ROLE_DETAIL_PRIMARY = "detail_primary"
ROLE_DETAIL_SECONDARY = "detail_secondary"
ROLE_UNKNOWN = "unknown"

# 파일명 규칙에서만 판정 가능한 정보. 화면·API에 별도 플래그가 없다.
WATERMARK_MARKER = "_watermark"


def detail_role(index: int) -> str:
    """imgList 순서 기준 역할. API에 역할 필드가 없으므로 순서 외 근거는 없다."""
    if index == 0:
        return ROLE_DETAIL_PRIMARY
    return ROLE_DETAIL_SECONDARY


async def download_image(
    client: httpx.AsyncClient,
    source_id: str,
    file_name: str,
    role: str,
    dest_dir: Path,
    index: int,
) -> dict:
    """이미지 1건을 받아 저장하고 메타데이터를 반환한다. 실패도 레코드로 남긴다."""
    url = f"{IMAGE_BASE}{file_name}"
    meta: dict = {
        "sourceId": source_id,
        "sourceUrl": url,
        "sourceRole": role,
        "sourceFileName": file_name,
        "localPath": None,
        "httpStatus": 0,
        "mimeType": None,
        "detectedFormat": None,
        "width": None,
        "height": None,
        "fileSize": 0,
        "sha256": None,
        "isWatermarked": WATERMARK_MARKER in file_name,
        "isPlaceholder": False,
        "isDuplicate": False,
        "duplicateOf": None,
        "isValid": False,
        "error": None,
        "collectedAt": now(),
    }

    try:
        resp = await client.get(url, headers=DEFAULT_HEADERS, follow_redirects=True)
    except Exception as exc:  # noqa: BLE001
        meta["error"] = f"{type(exc).__name__}: {exc}"
        return meta

    body = resp.content
    meta["httpStatus"] = resp.status_code
    meta["mimeType"] = resp.headers.get("content-type")
    meta["fileSize"] = len(body)

    if resp.status_code != 200:
        meta["error"] = f"HTTP {resp.status_code}"
        return meta
    if not body:
        meta["error"] = "0바이트 응답"
        return meta

    meta["sha256"] = hashlib.sha256(body).hexdigest()

    try:
        img = Image.open(BytesIO(body))
        img.verify()
        img = Image.open(BytesIO(body))  # verify 후 재오픈 필요
        meta["width"], meta["height"] = img.width, img.height
        meta["detectedFormat"] = img.format
    except Exception as exc:  # noqa: BLE001
        meta["error"] = f"이미지 판독 실패: {type(exc).__name__}"
        return meta

    ext = Path(file_name).suffix or ".jpg"
    dest_dir.mkdir(parents=True, exist_ok=True)
    local = dest_dir / f"image-{index:03d}{ext}"
    local.write_bytes(body)
    meta["localPath"] = str(local.relative_to(dest_dir.parent.parent.parent.parent))
    meta["isValid"] = True
    return meta


def mark_duplicates(metas: list[dict]) -> list[dict]:
    """같은 SHA-256을 가진 이미지를 중복으로 표시한다. 첫 항목이 원본."""
    seen: dict[str, str] = {}
    for m in metas:
        h = m.get("sha256")
        if not h:
            continue
        if h in seen:
            m["isDuplicate"] = True
            m["duplicateOf"] = seen[h]
        else:
            seen[h] = m["sourceFileName"]
    return metas
