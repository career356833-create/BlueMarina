"""alias_matcher 테스트. 자동 확정을 막는 규칙과 매칭 우선순위를 중점 검증한다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.alias_matcher import (
    normalize_ko, strip_group_suffix, strip_trailing_eo, extract_caution_label_base,
    levenshtein, build_ko_index, build_nifs_dialect_index, find_candidates,
    KNOWN_COLLECTIVE_NAMES, EXACT_KOREAN_NAME, NORMALIZED_KOREAN_NAME,
    SUBSTRING_MATCH, EDIT_DISTANCE, NIFS_DIALECT_REFERENCE,
)
from build_fish_data_alias_candidates import decide_status, analyze_name


def mbris(internal_id, ko, sci, group="fish", cls=None, order=None, family=None):
    return {"internalId": internal_id, "koreanName": ko,
            "scientificNameCanonical": sci, "scientificNameRaw": sci,
            "organismGroup": group,
            "taxonomy": {"class": cls, "order": order, "family": family}}


# --- normalize_ko / strip_group_suffix / strip_trailing_eo ---
def test_normalize_ko_공백_기호_제거():
    assert normalize_ko("제 주-소라") == "제주소라"
    assert normalize_ko(None) == ""


def test_strip_group_suffix_류_분리():
    assert strip_group_suffix("돌돔류") == ("돌돔", True)
    assert strip_group_suffix("돌돔") == ("돌돔", False)


def test_strip_group_suffix_류_한글자는_대상아님():
    assert strip_group_suffix("류") == ("류", False)


def test_strip_trailing_eo_데이터셋에_있을때만():
    known = {"고등", "다른이름"}
    assert strip_trailing_eo("고등어", known) == "고등"
    assert strip_trailing_eo("전혀다른어", known) is None  # '전혀다른'이 known에 없음


def test_strip_trailing_eo_어로_끝나지않으면_None():
    assert strip_trailing_eo("문어아님", {"문"}) is None


# --- extract_caution_label_base ---
def test_주의카테고리_related첫항목으로_시작하고_문구가_남으면_추출():
    base = extract_caution_label_base("가오리 꼬리주의", "주의가 필요한 어종", "가오리")
    assert base == "가오리"


def test_주의카테고리_아니면_None():
    assert extract_caution_label_base("가오리 꼬리주의", "바다낚시 인기어종", "가오리") is None


def test_단순_류접미는_이름오염으로_오분류하지_않는다():
    """귀상어류 = 귀상어 + 류(정상 집합명 접미). 캡션 오염이 아니다."""
    base = extract_caution_label_base("귀상어류", "주의가 필요한 어종", "귀상어")
    assert base is None


def test_related없이_공백만으로도_추출():
    base = extract_caution_label_base("쏨뱅이 독가시", "주의가 필요한 어종", None)
    assert base == "쏨뱅이"


def test_가시접미_추출():
    base = extract_caution_label_base("성게가시", "주의가 필요한 어종", None)
    assert base == "성게"


def test_류로_끝나는_가시단어는_가시스트립_대상아님():
    assert extract_caution_label_base("전기가오리류", "주의가 필요한 어종", None) is None


# --- levenshtein ---
def test_levenshtein_기본():
    assert levenshtein("갈치", "갈치") == 0
    assert levenshtein("주꾸미", "쭈꾸미") == 1
    assert levenshtein("", "abc") == 3
    assert levenshtein("abc", "") == 3


# --- build_ko_index / build_nifs_dialect_index ---
def test_build_ko_index_exact와_정규화both():
    cands = [mbris("BM-1", "갈치", "Trichiurus japonicus")]
    exact, norm = build_ko_index(cands)
    assert exact["갈치"][0]["internalId"] == "BM-1"
    assert norm["갈치"][0]["internalId"] == "BM-1"


def test_build_nifs_dialect_index_괄호지역표기_제거():
    nifs = [{"koreanName": "갈치", "dialect": "깔치, 은갈치(제주)"}]
    links = [{"nifsName": "갈치", "mbrisInternalId": "BM-1",
             "mbrisKoreanName": "갈치", "mbrisScientificName": "Trichiurus japonicus"}]
    idx = build_nifs_dialect_index(nifs, links)
    assert "깔치" in idx
    assert "은갈치" in idx
    assert idx["은갈치"]["rawDialectEntry"] == "은갈치(제주)"


def test_build_nifs_dialect_index_MBRIS미연결_NIFS는_제외():
    nifs = [{"koreanName": "미연결종", "dialect": "가짜별칭"}]
    idx = build_nifs_dialect_index(nifs, [])  # 링크 없음
    assert "가짜별칭" not in idx


# --- find_candidates: 우선순위 ---
def test_정확일치가_있으면_다른방법_안쓴다():
    cands = [mbris("BM-1", "갈치", "Trichiurus japonicus"),
            mbris("BM-2", "갈치류", "Other species")]
    exact, norm = build_ko_index(cands)
    result = find_candidates(base_name="갈치", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx={})
    assert len(result) == 1
    assert result[0].matchMethod == EXACT_KOREAN_NAME
    assert result[0].internalId == "BM-1"


def test_정확일치없으면_부분문자열로_넘어간다():
    cands = [mbris("BM-1", "참갈치", "X species")]
    exact, norm = build_ko_index(cands)
    result = find_candidates(base_name="갈치", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx={})
    assert len(result) == 1
    assert result[0].matchMethod == SUBSTRING_MATCH


def test_부분문자열도_없으면_편집거리로_넘어간다():
    cands = [mbris("BM-1", "주꾸미", "Amphioctopus fangsiao", group="cephalopod")]
    exact, norm = build_ko_index(cands)
    result = find_candidates(base_name="쭈꾸미", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx={})
    assert len(result) == 1
    assert result[0].matchMethod == EDIT_DISTANCE


def test_편집거리_임계값_넘으면_후보없음():
    cands = [mbris("BM-1", "완전히다른이름", "X species")]
    exact, norm = build_ko_index(cands)
    result = find_candidates(base_name="갈치", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx={})
    assert result == []


def test_NIFS방언은_기존후보를_승격하지_묵살하지_않는다():
    """핵심 회귀 테스트: 방언 근거가 이미 substring으로 잡힌 항목과 겹치면
    조용히 버려지지 않고 그 항목이 nifs_dialect_reference로 승격돼야 한다."""
    cands = [mbris("BM-1", "갈치", "Trichiurus japonicus")]
    exact, norm = build_ko_index(cands)
    dialect_idx = {"은갈치": {"nifsKoreanName": "갈치", "mbrisInternalId": "BM-1",
                            "mbrisKoreanName": "갈치", "mbrisScientificName": "Trichiurus japonicus",
                            "rawDialectEntry": "은갈치(제주)"}}
    result = find_candidates(base_name="은갈치", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx=dialect_idx)
    assert len(result) == 1  # BM-1 하나만, 중복으로 추가되지 않음
    assert result[0].matchMethod == NIFS_DIALECT_REFERENCE
    assert result[0].internalId == "BM-1"


def test_NIFS방언이_새로운_internalId면_추가된다():
    cands = [mbris("BM-1", "완전다른종", "Unrelated species")]
    exact, norm = build_ko_index(cands)
    dialect_idx = {"참소라": {"nifsKoreanName": "제주소라", "mbrisInternalId": "BM-2",
                            "mbrisKoreanName": "소라", "mbrisScientificName": "Turbo sazae",
                            "rawDialectEntry": "참소라"}}
    result = find_candidates(base_name="참소라", exact_idx=exact, norm_idx=norm,
                             all_candidates=cands, nifs_dialect_idx=dialect_idx,
                             by_id_idx={"BM-2": mbris("BM-2", "소라", "Turbo sazae", group="gastropod")})
    ids = {r.internalId for r in result}
    assert "BM-2" in ids
    method = {r.internalId: r.matchMethod for r in result}
    assert method["BM-2"] == NIFS_DIALECT_REFERENCE


# --- decide_status: 자동 확정 방지 규칙 ---
def _analysis(has_group=False, caution=False):
    return {"aliasCandidates": {"hasGroupSuffix": has_group, "cautionLabelDetected": caution}}


def test_류접미는_후보가_완벽해도_manual_review():
    from src.alias_matcher import AliasCandidate
    cands = [AliasCandidate("BM-1", "돌돔", "Oplegnathus fasciatus", {}, "fish",
                            EXACT_KOREAN_NAME, 1.0)]
    status, reasons = decide_status("돌돔류", _analysis(has_group=True), cands)
    assert status == "manual_review"
    assert any("collective_group_suffix" in r for r in reasons)


def test_알려진_집합명은_manual_review():
    status, reasons = decide_status("오징어", _analysis(), [])
    assert status == "manual_review"
    assert any("known_collective_name" in r for r in reasons)


def test_후보없으면_manual_review():
    status, reasons = decide_status("없는종", _analysis(), [])
    assert status == "manual_review"
    assert "no_candidates_found" in reasons


def test_복수후보는_manual_review():
    from src.alias_matcher import AliasCandidate
    cands = [AliasCandidate("BM-1", "가", "A", {}, "fish", SUBSTRING_MATCH, 0.6),
            AliasCandidate("BM-2", "나", "B", {}, "fish", SUBSTRING_MATCH, 0.6)]
    status, reasons = decide_status("X", _analysis(), cands)
    assert status == "manual_review"
    assert "multiple_candidates" in reasons


def test_단일_NIFS방언후보만_confirmed():
    from src.alias_matcher import AliasCandidate
    cands = [AliasCandidate("BM-1", "갈치", "Trichiurus japonicus", {}, "fish",
                            NIFS_DIALECT_REFERENCE, 0.9)]
    status, reasons = decide_status("은갈치", _analysis(), cands)
    assert status == "confirmed"


def test_단일_후보라도_방언근거_아니면_manual_review():
    """명시적 별칭 근거가 없으면 단일 후보·고신뢰도라도 자동 확정하지 않는다."""
    from src.alias_matcher import AliasCandidate
    cands = [AliasCandidate("BM-1", "돌돔", "Oplegnathus fasciatus", {}, "fish",
                            EXACT_KOREAN_NAME, 1.0)]
    status, reasons = decide_status("돌돔", _analysis(), cands)
    assert status == "manual_review"


def test_방언후보라도_집합명접미와_함께면_confirmed_아님():
    from src.alias_matcher import AliasCandidate
    cands = [AliasCandidate("BM-1", "돌돔", "Oplegnathus fasciatus", {}, "fish",
                            NIFS_DIALECT_REFERENCE, 0.9)]
    status, reasons = decide_status("돌돔류", _analysis(has_group=True), cands)
    assert status == "manual_review"


# --- analyze_name (오케스트레이터 함수) ---
def test_analyze_name_원본_이름은_그대로_보존된다():
    row = {"category": "주의가 필요한 어종", "relatedFish": ["가오리", "홍어"]}
    result = analyze_name("가오리 꼬리주의", row, {"가오리"})
    assert result["matchingBaseName"] == "가오리"
    # 원본 sourceName 자체는 analyze_name 밖(레코드의 sourceName 필드)에서 별도 보존됨


def test_analyze_name_류_접미_정보_기록():
    row = {"category": "회/식용 인기어종", "relatedFish": []}
    result = analyze_name("돌돔류", row, {"돌돔"})
    assert result["aliasCandidates"]["hasGroupSuffix"] is True
    assert result["matchingBaseName"] == "돌돔"
