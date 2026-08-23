"""상세 수집 상태. resume·재시도를 지원한다."""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path

PENDING = "pending"
COMPLETE = "complete"
FAILED = "failed"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class DetailItemState:
    internalId: str
    status: str = PENDING
    attemptCount: int = 0
    lastError: str | None = None
    lastAttemptAt: str | None = None
    lastSuccessAt: str | None = None
    spcTxnId: str | None = None


@dataclass
class DetailCollectionState:
    items: dict[str, DetailItemState] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path) -> "DetailCollectionState":
        if not path.exists():
            return cls()
        raw = json.loads(path.read_text(encoding="utf-8"))
        items = {k: DetailItemState(**v) for k, v in raw.get("items", {}).items()}
        return cls(items=items)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({
            "updatedAt": now_iso(),
            "items": {k: asdict(v) for k, v in self.items.items()},
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    def item(self, internal_id: str) -> DetailItemState:
        st = self.items.get(internal_id)
        if st is None:
            st = DetailItemState(internalId=internal_id)
            self.items[internal_id] = st
        return st

    def should_skip(self, internal_id: str, *, force: bool = False) -> bool:
        if force:
            return False
        st = self.items.get(internal_id)
        return st is not None and st.status == COMPLETE

    def counts(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for st in self.items.values():
            out[st.status] = out.get(st.status, 0) + 1
        return out
