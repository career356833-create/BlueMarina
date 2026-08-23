"""수집 상태 저장소. 중단 후 재실행(resume)과 실패 항목 재시도를 지원한다."""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Iterator

from . import paths

PENDING = "pending"
RUNNING = "running"
COMPLETE = "complete"
PARTIAL = "partial"
FAILED = "failed"

VALID_STATUSES = {PENDING, RUNNING, COMPLETE, PARTIAL, FAILED}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ItemState:
    sourceId: str
    koreanName: str = ""
    detailStatus: str = PENDING
    imageStatus: str = PENDING
    normalizationStatus: str = PENDING
    validationStatus: str = PENDING
    attemptCount: int = 0
    lastAttemptAt: Optional[str] = None
    lastSuccessAt: Optional[str] = None
    lastError: Optional[str] = None
    contentHash: Optional[str] = None

    def is_done(self) -> bool:
        return all(s == COMPLETE for s in (
            self.detailStatus, self.imageStatus, self.normalizationStatus))

    def is_retryable(self) -> bool:
        return any(s in (FAILED, PARTIAL, PENDING, RUNNING) for s in (
            self.detailStatus, self.imageStatus, self.normalizationStatus))


@dataclass
class CrawlState:
    listStatus: str = PENDING
    listCollectedAt: Optional[str] = None
    listContentHash: Optional[str] = None
    items: dict[str, ItemState] = field(default_factory=dict)

    # --- 영속화 ---
    @classmethod
    def load(cls, path: Path | None = None) -> "CrawlState":
        p = path or paths.STATE_FILE
        if not p.exists():
            return cls()
        raw = json.loads(p.read_text(encoding="utf-8"))
        items = {k: ItemState(**v) for k, v in (raw.get("items") or {}).items()}
        return cls(
            listStatus=raw.get("listStatus", PENDING),
            listCollectedAt=raw.get("listCollectedAt"),
            listContentHash=raw.get("listContentHash"),
            items=items,
        )

    def save(self, path: Path | None = None) -> None:
        p = path or paths.STATE_FILE
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "listStatus": self.listStatus,
            "listCollectedAt": self.listCollectedAt,
            "listContentHash": self.listContentHash,
            "updatedAt": now(),
            "items": {k: asdict(v) for k, v in self.items.items()},
        }
        p.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- 조회 ---
    def item(self, source_id: str, korean_name: str = "") -> ItemState:
        st = self.items.get(source_id)
        if st is None:
            st = ItemState(sourceId=source_id, koreanName=korean_name)
            self.items[source_id] = st
        elif korean_name and not st.koreanName:
            st.koreanName = korean_name
        return st

    def pending_details(self, force: bool = False) -> Iterator[ItemState]:
        for st in self.items.values():
            if force or st.detailStatus != COMPLETE:
                yield st

    def failed_items(self) -> list[ItemState]:
        return [s for s in self.items.values()
                if FAILED in (s.detailStatus, s.imageStatus, s.normalizationStatus)]

    def counts(self, attr: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for st in self.items.values():
            v = getattr(st, attr)
            out[v] = out.get(v, 0) + 1
        return out


def archive_if_changed(source_id: str, target: Path, new_bytes: bytes) -> Optional[Path]:
    """원본이 바뀌었으면 기존 파일을 versions/로 옮기고 그 경로를 반환한다.

    덮어쓰기를 막는 것이 목적이다. 내용이 같거나 파일이 없으면 None.
    """
    if not target.exists():
        return None
    if target.read_bytes() == new_bytes:
        return None
    vdir = paths.version_dir(source_id, now())
    vdir.mkdir(parents=True, exist_ok=True)
    moved = vdir / target.name
    moved.write_bytes(target.read_bytes())
    return moved
