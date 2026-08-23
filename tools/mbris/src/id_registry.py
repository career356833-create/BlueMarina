"""내부 ID 발급·영속화.

MBRIS의 `No` 컬럼은 시트 내 일련번호일 뿐이고 파일이 갱신되면 값이 바뀐다.
그래서 내부 ID는 위치(sourceRow)가 아니라 **내용**(시트+학명원문+국명)을 키로 발급하고,
레지스트리 파일에 영속화한다. 재실행 시 기존 키는 같은 ID를 유지하고 새 키만 번호를 늘려 받는다.

완전 동일한 (시트, 학명, 국명) 조합이 여러 행에 있는 경우(중복 행)에는 등장 순서를
키에 포함해 별개 ID를 부여한다 — 재정렬에는 안전하지 않지만, 원본 자체가 True
완전 중복이 아닌 한 이 값이 없다(품질 분석에서 완전 중복 행 0건 확인됨).
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

PREFIX = "BM-SPECIES-"
WIDTH = 6


def natural_key(sheet: str, scientific_name_raw: str | None, korean_name: str | None,
                occurrence: int) -> str:
    return f"{sheet}\x1f{scientific_name_raw or ''}\x1f{korean_name or ''}\x1f{occurrence}"


class IdRegistry:
    """natural_key -> internalId 매핑. append-only."""

    def __init__(self, path: Path):
        self.path = path
        self._map: dict[str, str] = {}
        self._next = 1
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            self._map = data.get("keyToId", {})
            self._next = data.get("nextSequence", 1)

    def get_or_create(self, key: str) -> str:
        existing = self._map.get(key)
        if existing:
            return existing
        new_id = f"{PREFIX}{self._next:0{WIDTH}d}"
        self._map[key] = new_id
        self._next += 1
        return new_id

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({
            "keyToId": self._map,
            "nextSequence": self._next,
            "totalIssued": len(self._map),
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    def __len__(self) -> int:
        return len(self._map)


def assign_ids(records: list[dict], registry: IdRegistry) -> list[str]:
    """레코드 리스트 순서대로 internalId를 발급한다. 시트별 등장 순서로 occurrence를 센다."""
    seen: Counter = Counter()
    ids = []
    for r in records:
        base = (r["sourceSheet"], r.get("scientificNameRaw"), r.get("koreanName"))
        occ = seen[base]
        seen[base] += 1
        key = natural_key(r["sourceSheet"], r.get("scientificNameRaw"), r.get("koreanName"), occ)
        ids.append(registry.get_or_create(key))
    return ids
