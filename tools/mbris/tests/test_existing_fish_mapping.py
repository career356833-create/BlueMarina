"""fish-data.ts ↔ MBRIS 매칭 테스트. fish-data.ts에는 학명이 없어 NIFS 경유/국명대조 2단계다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.fish_data_source import (
    parse_fish_data_names, normalize_ko, build_nifs_name_index,
    build_mbris_korean_index, match_fish_data_entry, FISH_CATEGORIES,
)


def make_ts_source(*entries: str, categories_decl: bool = True) -> str:
    decl = ('export const fishCategories = ["' + '", "'.join(FISH_CATEGORIES) + '"] as const;\n'
            if categories_decl else "")
    body = ",\n".join(entries)
    return decl + f'const fishSeed: Array<[...]> = [\n{body}\n];\n'


def entry(name, category=None, related=None):
    cat = category or FISH_CATEGORIES[0]
    rel = related or ["다른어종"]
    rel_str = ", ".join(f'"{r}"' for r in rel)
    return f'  ["{name}", "{cat}", "가을", "갯바위", "설명", "설명", "팁", "주의", [{rel_str}]]'


def test_fishCategories_선언줄은_이름으로_오인되지_않는다():
    """카테고리 배열 선언이 '["카테고리","다음카테고리"]' 형태라 오매칭되기 쉽다."""
    src = make_ts_source(entry("감성돔"))
    names = parse_fish_data_names(src)
    assert "바다낚시 인기어종" not in names
    assert names == ["감성돔"]


def test_relatedFish_배열의_이름은_추출되지_않는다():
    """relatedFish 배열도 대괄호+따옴표로 시작해 오매칭 위험이 있다."""
    src = make_ts_source(entry("참돔", related=["감성돔", "돌돔"]))
    names = parse_fish_data_names(src)
    assert names == ["참돔"]
    assert "감성돔" not in names


def test_중복_국명은_한번만_등장순서대로():
    src = make_ts_source(entry("광어", FISH_CATEGORIES[0]), entry("광어", FISH_CATEGORIES[2]),
                         entry("농어"))
    names = parse_fish_data_names(src)
    assert names == ["광어", "농어"]


def test_normalize_ko_공백_기호_제거():
    assert normalize_ko("제 주-소라") == "제주소라"


def test_NIFS경유_매칭이_국명대조보다_우선한다():
    nifs_index = build_nifs_name_index([
        {"nifsName": "갈치", "mbrisInternalId": "BM-1",
         "matchType": "synonym", "confidence": "medium"},
    ])
    mbris_ko, mbris_ko_norm = build_mbris_korean_index([
        {"internalId": "BM-2", "koreanName": "갈치"},  # 국명대조로도 잡히지만 NIFS가 우선
    ])
    m = match_fish_data_entry("갈치", nifs_index, mbris_ko, mbris_ko_norm)
    assert m["internalId"] == "BM-1"
    assert m["matchType"] == "synonym"
    assert m["viaNifs"] is True


def test_NIFS경유일때_matchType과_confidence를_그대로_물려받는다():
    nifs_index = build_nifs_name_index([
        {"nifsName": "고등어", "mbrisInternalId": "BM-1",
         "matchType": "scientific_exact", "confidence": "high"},
    ])
    m = match_fish_data_entry("고등어", nifs_index, {}, {})
    assert m["matchType"] == "scientific_exact"
    assert m["confidence"] == "high"


def test_NIFS에없으면_국명직접대조는_korean_candidate만_나온다():
    """fish-data.ts는 학명이 없으므로 scientific_exact/synonym을 직접 만들 수 없다."""
    mbris_ko, mbris_ko_norm = build_mbris_korean_index([
        {"internalId": "BM-1", "koreanName": "우럭"},
    ])
    m = match_fish_data_entry("우럭", {}, mbris_ko, mbris_ko_norm)
    assert m["matchType"] == "korean_candidate"
    assert m["viaNifs"] is False


def test_국명_단일후보는_confidence_medium():
    mbris_ko, mbris_ko_norm = build_mbris_korean_index([
        {"internalId": "BM-1", "koreanName": "우럭"},
    ])
    m = match_fish_data_entry("우럭", {}, mbris_ko, mbris_ko_norm)
    assert m["confidence"] == "medium"


def test_국명_복수후보는_confidence_low():
    mbris_ko, mbris_ko_norm = build_mbris_korean_index([
        {"internalId": "BM-1", "koreanName": "놀래기"},
        {"internalId": "BM-2", "koreanName": "놀래기"},
    ])
    m = match_fish_data_entry("놀래기", {}, mbris_ko, mbris_ko_norm)
    assert m["confidence"] == "low"
    assert m["candidateCount"] == 2


def test_후보가_전혀_없으면_None():
    m = match_fish_data_entry("존재안함", {}, {}, {})
    assert m is None


def test_학명을_지어내지_않는다():
    """매칭 결과에 scientificName류 필드가 없어야 한다 — 출처에 없는 값을 만들지 않는다."""
    mbris_ko, mbris_ko_norm = build_mbris_korean_index([
        {"internalId": "BM-1", "koreanName": "우럭"},
    ])
    m = match_fish_data_entry("우럭", {}, mbris_ko, mbris_ko_norm)
    assert not any("scientific" in k.lower() for k in m)
