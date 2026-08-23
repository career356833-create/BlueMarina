"""fish-data.ts 미매칭 이름 → MBRIS 후보 탐색. 자동 확정하지 않는다.

이름 정규화는 지시된 범위만 허용한다: 공백 제거, 괄호 보조명 분리,
류/어 접미 분리 기록, 명백한 철자변형 분리. 원본 이름은 항상 보존한다.
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field

EXACT_KOREAN_NAME = "exact_korean_name"
NORMALIZED_KOREAN_NAME = "normalized_korean_name"
SUBSTRING_MATCH = "substring_match"
EDIT_DISTANCE = "edit_distance"
NIFS_DIALECT_REFERENCE = "nifs_dialect_reference"
RELATED_SPECIES_HINT = "fish_data_related_species_hint"

# 작업 지시서가 명시적으로 예로 든 집합명. MBRIS 후보 수와 무관하게 항상 검토 대상이다.
KNOWN_COLLECTIVE_NAMES = {"오징어", "참치", "상어", "가오리", "장어", "복어"}


def normalize_ko(name: str | None) -> str:
    return re.sub(r"[\s\-·()]", "", name or "")


def strip_group_suffix(name: str) -> tuple[str, bool]:
    """'-류' 접미를 분리한다. (base, hasGroupSuffix). '류' 하나짜리 이름은 대상 아님."""
    if name.endswith("류") and len(name) > 1:
        return name[:-1], True
    return name, False


def strip_trailing_eo(name: str, known_names: set[str]) -> str | None:
    """'-어' 접미를 제거했을 때 이 데이터셋 안에 실제로 존재하는 다른 이름이 되면만 기록한다.
    '어'는 한국 어종명 상당수의 고유한 일부(고등어, 참다랑어 등)라 맹목적으로 떼지 않는다."""
    if name.endswith("어") and len(name) > 1:
        candidate = name[:-1]
        if candidate in known_names:
            return candidate
    return None


_CAUTION_CATEGORY = "주의가 필요한 어종"


def extract_caution_label_base(name: str, category: str | None,
                               related_first: str | None) -> str | None:
    """'가오리 꼬리주의'류 이름에서 실제 종명으로 보이는 부분만 뽑는다.

    fish-data.ts의 '주의가 필요한 어종' 카테고리 일부 항목은 name 필드 자체에
    주의 문구가 섞여 있다(예: '가오리 꼬리주의'). related 배열의 첫 항목이
    원래 이름과 같은 경우가 많아(예: 가오리→['가오리',...]) 이를 근거로 쓴다 —
    추측이 아니라 소스 데이터 자체의 다른 필드에서 나온 값이다.
    """
    if category != _CAUTION_CATEGORY:
        return None
    if related_first and name.startswith(related_first):
        remainder = name[len(related_first):]
        # remainder가 '류' 하나뿐이면 정상적인 집합명 접미(예: 귀상어+류)일 뿐,
        # 이름 오염이 아니다 — 그 경우는 strip_group_suffix가 별도로 처리한다.
        if remainder and remainder != "류":
            return related_first
        return None
    if " " in name.strip():
        return name.strip().split()[0]
    if name.endswith("가시") and len(name) > 2 and not name.endswith("류"):
        return name[:-2]
    return None


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    return prev[-1]


@dataclass
class AliasCandidate:
    internalId: str
    koreanName: str | None
    scientificName: str | None
    taxonomy: dict
    organismGroup: str
    matchMethod: str
    similarityScore: float
    note: str = ""


def build_ko_index(candidates: list[dict]) -> tuple[dict, dict]:
    exact: dict[str, list[dict]] = defaultdict(list)
    norm: dict[str, list[dict]] = defaultdict(list)
    for c in candidates:
        ko = c.get("koreanName")
        if ko:
            exact[ko].append(c)
            norm[normalize_ko(ko)].append(c)
    return exact, norm


def build_nifs_dialect_index(nifs_records: list[dict], nifs_links: list[dict]
                             ) -> dict[str, dict]:
    """방언 별칭 -> {nifsKoreanName, mbrisInternalId, region}. 명시적 근거로만 쓴다."""
    link_by_name = {l["nifsName"]: l for l in nifs_links if l.get("mbrisInternalId")}
    out: dict[str, dict] = {}
    for rec in nifs_records:
        dialect = rec.get("dialect")
        ko = rec.get("koreanName")
        if not dialect or not ko:
            continue
        link = link_by_name.get(ko)
        if not link:
            continue
        for token in dialect.split(","):
            token = token.strip()
            m = re.match(r"^([^(（]+)", token)
            alias = m.group(1).strip() if m else token
            if not alias:
                continue
            out[alias] = {
                "nifsKoreanName": ko,
                "mbrisInternalId": link["mbrisInternalId"],
                "mbrisKoreanName": link.get("mbrisKoreanName"),
                "mbrisScientificName": link.get("mbrisScientificName"),
                "rawDialectEntry": token,
            }
    return out


def _to_alias_candidate(c: dict, method: str, score: float, note: str = "") -> AliasCandidate:
    return AliasCandidate(
        internalId=c["internalId"], koreanName=c.get("koreanName"),
        scientificName=c.get("scientificNameCanonical") or c.get("scientificNameRaw"),
        taxonomy={"class": c["taxonomy"].get("class"), "order": c["taxonomy"].get("order"),
                 "family": c["taxonomy"].get("family")},
        organismGroup=c.get("organismGroup", ""), matchMethod=method,
        similarityScore=round(score, 3), note=note,
    )


def find_candidates(*, base_name: str, exact_idx: dict, norm_idx: dict,
                    all_candidates: list[dict], nifs_dialect_idx: dict,
                    by_id_idx: dict | None = None,
                    fuzzy_pool: list[dict] | None = None,
                    max_fuzzy: int = 5) -> list[AliasCandidate]:
    """base_name 기준으로 후보를 순서대로 찾는다. 상위 방법에서 후보가 나오면
    거기서 멈추되, NIFS 방언 근거는 항상 별도로 추가한다(명시적 근거이므로)."""
    results: list[AliasCandidate] = []
    seen: set[str] = set()

    def add(cands: list[dict], method: str, score: float, note: str = ""):
        for c in cands:
            if c["internalId"] in seen:
                continue
            seen.add(c["internalId"])
            results.append(_to_alias_candidate(c, method, score, note))

    norm_base = normalize_ko(base_name)

    if exact_idx.get(base_name):
        add(exact_idx[base_name], EXACT_KOREAN_NAME, 1.0)
    elif norm_idx.get(norm_base):
        add(norm_idx[norm_base], NORMALIZED_KOREAN_NAME, 0.95)

    if not results:
        pool = fuzzy_pool if fuzzy_pool is not None else all_candidates
        sub_hits = [c for c in pool if c.get("koreanName") and len(c["koreanName"]) >= 2
                   and (base_name in c["koreanName"] or c["koreanName"] in base_name)]
        if sub_hits:
            add(sub_hits[:10], SUBSTRING_MATCH,
                0, note="부분 문자열 일치")
            for r in results:
                if r.matchMethod == SUBSTRING_MATCH:
                    shorter = min(len(base_name), len(r.koreanName or ""))
                    longer = max(len(base_name), len(r.koreanName or ""))
                    r.similarityScore = round(shorter / longer, 3) if longer else 0.0

    if not results:
        pool = fuzzy_pool if fuzzy_pool is not None else all_candidates
        thresh = max(1, len(base_name) // 3)
        scored = []
        for c in pool:
            ko = c.get("koreanName")
            if not ko:
                continue
            d = levenshtein(base_name, ko)
            if d <= thresh:
                scored.append((d, c))
        scored.sort(key=lambda x: x[0])
        top = scored[:max_fuzzy]
        for d, c in top:
            m = max(len(base_name), len(c["koreanName"]))
            score = 1 - d / m if m else 0.0
            add([c], EDIT_DISTANCE, score, note=f"편집거리 {d}")

    # NIFS 방언 근거는 명시적 증거이므로 다른 후보보다 우선한다. 같은 internalId가 이미
    # 약한 방법(부분일치 등)으로 잡혀 있으면 조용히 버리지 않고 그 항목을 방언 근거로 승격한다.
    dialect_hit = nifs_dialect_idx.get(base_name)
    if dialect_hit:
        dialect_id = dialect_hit["mbrisInternalId"]
        dialect_note = (f"NIFS '{dialect_hit['nifsKoreanName']}' 방언 목록에 "
                        f"'{dialect_hit['rawDialectEntry']}'로 등재됨")
        existing = next((r for r in results if r.internalId == dialect_id), None)
        if existing:
            existing.matchMethod = NIFS_DIALECT_REFERENCE
            existing.similarityScore = 0.9
            existing.note = dialect_note
        else:
            seen.add(dialect_id)
            full = (by_id_idx or {}).get(dialect_id, {})
            tax = full.get("taxonomy", {})
            results.append(AliasCandidate(
                internalId=dialect_id,
                koreanName=full.get("koreanName", dialect_hit.get("mbrisKoreanName")),
                scientificName=(full.get("scientificNameCanonical")
                               or full.get("scientificNameRaw")
                               or dialect_hit.get("mbrisScientificName")),
                taxonomy={"class": tax.get("class"), "order": tax.get("order"),
                         "family": tax.get("family")},
                organismGroup=full.get("organismGroup", ""),
                matchMethod=NIFS_DIALECT_REFERENCE, similarityScore=0.9,
                note=dialect_note,
            ))

    return results
