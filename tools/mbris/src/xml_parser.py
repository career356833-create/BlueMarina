"""MBRIS taxonlist3 XML 응답 파서.

API 명세와 실제 응답이 다를 수 있으므로, item의 자식 요소를 전부 그대로
딕셔너리로 담는다(하드코딩한 필드 목록만 뽑지 않는다) — 문서에 없던 필드가
실제로 오더라도 유실되지 않는다.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass, field


@dataclass
class ParsedTaxonlist:
    ok: bool
    result_code: str | None = None
    result_msg: str | None = None
    total_count: int | None = None
    page_no: int | None = None
    num_of_rows: int | None = None
    items: list[dict[str, str | None]] = field(default_factory=list)
    error: str | None = None
    raw_field_names: set[str] = field(default_factory=set)  # 실제 응답에서 관찰된 전체 필드명


def _text(elem: ET.Element | None) -> str | None:
    if elem is None or elem.text is None:
        return None
    t = elem.text.strip()
    return t or None


def _int(elem: ET.Element | None) -> int | None:
    t = _text(elem)
    if t is None:
        return None
    try:
        return int(t)
    except ValueError:
        return None


def parse_taxonlist_xml(raw: bytes | str) -> ParsedTaxonlist:
    if not raw or (isinstance(raw, bytes) and not raw.strip()) or (isinstance(raw, str) and not raw.strip()):
        return ParsedTaxonlist(ok=False, error="빈 응답")

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        return ParsedTaxonlist(ok=False, error=f"XML 파싱 실패: {exc}")

    # ElementTree의 Element는 자식이 없으면 bool()이 False다 — `or`로 대체값을
    # 고르면 빈 <header/> 같은 정상 요소가 None으로 오인된다. 반드시 is not None으로 판단한다.
    header = root.find("header")
    if header is None:
        header = root.find(".//header")

    def _find_first(elem: ET.Element | None, *tags: str) -> ET.Element | None:
        if elem is None:
            return None
        for tag in tags:
            found = elem.find(tag)
            if found is not None:
                return found
        return None

    # 실제 응답은 header 아래 태그가 PascalCase(ResultCode/ResultMsg)다 — body 쪽
    # (items/numOfRows/pageNo/totalCount)은 camelCase인 것과 대조적이다. Swagger
    # 문서만 보고 camelCase로 짐작했던 최초 구현은 실제 응답에서 항상 None을
    # 반환했다(5종 실응답으로 확인). 두 표기를 모두 시도해 어느 쪽이 와도 잡는다.
    result_code = _text(_find_first(header, "ResultCode", "resultCode"))
    result_msg = _text(_find_first(header, "ResultMsg", "resultMsg"))

    body = root.find("body")
    if body is None:
        body = root.find(".//body")
    if body is None:
        return ParsedTaxonlist(ok=True, result_code=result_code, result_msg=result_msg,
                               items=[], error=None)

    total_count = _int(body.find("totalCount"))
    page_no = _int(body.find("pageNo"))
    num_of_rows = _int(body.find("numOfRows"))

    items: list[dict] = []
    field_names: set[str] = set()
    items_elem = body.find("items")
    if items_elem is not None:
        for item_elem in items_elem.findall("item"):
            record: dict[str, str | None] = {}
            for child in item_elem:
                tag = child.tag
                record[tag] = _text(child)
                field_names.add(tag)
            items.append(record)

    return ParsedTaxonlist(ok=True, result_code=result_code, result_msg=result_msg,
                           total_count=total_count, page_no=page_no, num_of_rows=num_of_rows,
                           items=items, raw_field_names=field_names)
