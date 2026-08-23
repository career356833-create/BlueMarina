"""Batch1(단일후보·분류군일치 10건) 사람 검토 결과.

각 판정은 fish-data.ts 원본(설명/카테고리/relatedFish)과 MBRIS 후보(학명/분류/note)를
대조해 내린 것이다. 웹 검색을 하지 않았고, 로컬 데이터에 없는 사실(예: 실제 표준
국명 여부)은 근거로 쓰지 않았다 — 그래서 이름 유사도만으로는 절대 approved를 주지
않는다(§3의 "원본 설명이 후보 생물의 특징과 명백히 일치" 요건).
"""
from __future__ import annotations

APPROVED = "approved"
REJECTED = "rejected"
KEEP_MANUAL_REVIEW = "keep_manual_review"

# sourceName -> (decision, confidence, evidence[], conflicts[], reviewNote)
DECISIONS: dict[str, dict] = {
    "긴꼬리상어": {
        "decision": REJECTED, "confidence": "high",
        "evidence": ["organismGroup 둘 다 'fish'로 표기됨(단, 이는 어류 대분류일 뿐 상어/뱀장어 구분 아님)"],
        "conflicts": [
            "원본 설명이 '상어류'라고 명시하는데 후보 'Anguilliformes'(뱀장어목)는 상어(연골어류)가 아니다",
            "relatedFish가 전부 상어류(청새리상어, 까치상어)인데 후보는 심해뱀장어과",
            "이름이 '긴꼬리상어'↔'긴꼬리장어'로 '상어'/'장어' 한 글자 차이(편집거리 1)에서만 나온 매칭 — 형태학적 근거 없음",
        ],
        "reviewNote": ("설명·관련종이 명백히 상어류를 가리키는데, 편집거리 1로 잡힌 후보는 "
                      "전혀 다른 목(目)의 뱀장어형 어류다. 이름 유사도가 오히려 오분류를 유발한 사례."),
    },
    "점벵에돔": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "low",
        "evidence": ["설명이 '벵에돔류'로 벵에돔과의 소속을 명시", "relatedFish 첫 항목이 '벵에돔' 자신",
                    "분류군(fish) 일치"],
        "conflicts": ["설명이 '벵에돔류'(그룹 소속 표현)일 뿐 '벵에돔과 동일하다'는 명시적 진술이 아님",
                     "점(반점)이라는 구분 형질이 별도로 언급돼 있어 변종/근연종일 가능성을 배제할 수 없음"],
        "reviewNote": "벵에돔 근연/변종 표현으로 보이나, 동일종이라는 명시적 근거는 로컬 데이터에 없다.",
    },
    "흑벵에돔": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "low",
        "evidence": ["설명이 '벵에돔류'로 벵에돔과의 소속을 명시", "relatedFish 첫 항목이 '벵에돔' 자신",
                    "분류군(fish) 일치"],
        "conflicts": ["설명이 그룹 소속 표현일 뿐 동일종 진술이 아님",
                     "'어두운 빛'이라는 구분 형질이 별도로 언급됨"],
        "reviewNote": "점벵에돔과 동일한 패턴 — 벵에돔 근연 표현, 동일종 명시 근거 없음.",
    },
    "대삼치": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "medium",
        "evidence": ["relatedFish 첫 항목이 '삼치' 자신", "분류군(fish) 일치", "학명 Scombridae과 일치"],
        "conflicts": ["원본 설명이 '삼치보다 큰 크기'라고 명시적으로 비교 — 동일종이면 부자연스러운 서술",
                     "크기 비교 표현이 성장단계 차이인지 별종인지 로컬 데이터로 판별 불가"],
        "reviewNote": ("설명이 삼치와 크기를 비교하는 방식으로 서술돼 있어, 동일종의 큰 개체를 "
                      "가리키는 것인지 별도 종을 가리키는 것인지 확정할 수 없다."),
    },
    "쭈꾸미": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "medium",
        "evidence": ["편집거리 1(ㅈ/ㅉ 경음 표기 차이) — 형태상 강한 철자 변형 패턴",
                    "분류군(cephalopod) 일치", "relatedFish(갑오징어/문어/오징어)에 모순 없음"],
        "conflicts": ["원본 설명('가벼운 장비로 즐기는 가을철 인기 두족류')이 일반적이라 "
                     "후보 종 특징을 명백히 특정하지 못함 — 근거가 사실상 이름 유사도뿐",
                     "NIFS 방언 목록(주꾸미: 쭈게미·쭈깨미·쭉지미 등)에 '쭈꾸미' 표기 자체는 없음"],
        "reviewNote": ("철자 변형 가능성은 높지만, 설명이 종을 특정할 만큼 구체적이지 않고 "
                      "NIFS 방언에도 정확히 일치하는 표기가 없어 '명백한 일치' 기준을 충족하지 못한다."),
    },
    "무늬벵에돔": {
        "decision": REJECTED, "confidence": "high",
        "evidence": ["분류군(fish) 일치", "relatedFish 첫 항목이 '벵에돔'"],
        "conflicts": ["원본 설명이 '벵에돔과 비슷하지만 무늬와 수심층이 다른 어종입니다'라고 "
                     "**명시적으로 다른 종**이라고 서술함"],
        "reviewNote": "소스 데이터 자체가 벵에돔과 다른 종이라고 명시했다 — 승인 불가가 명백하다.",
    },
    "좁쌀문어": {
        "decision": REJECTED, "confidence": "high",
        "evidence": ["분류군(cephalopod) 일치", "relatedFish 첫 항목이 '문어'"],
        "conflicts": ["원본 설명이 '작은 몸의 문어류'라고 명시하는데, 후보 Enteroctopus dofleini는 "
                     "세계 최대급 대형 문어종이다 — 크기 특징이 정반대로 모순됨"],
        "reviewNote": "'좁쌀'(아주 작음)과 후보의 '대형종' 특징이 정면으로 모순된다.",
    },
    "한치": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "medium",
        "evidence": ["'한치'가 후보명 '한치꼴뚜기'의 앞부분과 문자 그대로 일치(포함 관계)",
                    "분류군(cephalopod) 일치", "relatedFish(오징어/갑오징어/갈치)에 모순 없음"],
        "conflicts": ["원본 설명('부드러운 식감, 여름철 두족류')이 일반적이라 종을 특정할 만한 "
                     "구체적 형질 서술이 없음 — 근거가 이름 포함 관계뿐"],
        "reviewNote": "이름 포함 관계는 강하지만 설명이 특정 형질을 언급하지 않아 명백한 일치로 보기 어렵다.",
    },
    "파란고리문어": {
        "decision": REJECTED, "confidence": "high",
        "evidence": ["분류군(cephalopod) 일치", "카테고리('주의가 필요한 어종')가 독성과 일관됨"],
        "conflicts": ["원본 설명이 '작지만 강한 독성'이라고 명시하는데, 후보 Enteroctopus dofleini는 "
                     "대형종이며 사람에게 위험한 독성으로 알려진 종이 아니다 — 크기·독성 특징 모두 모순",
                     "안전 관련 정보이므로 오분류 시 실질적 위해 가능성이 있다"],
        "reviewNote": ("크기·독성 특징이 후보와 정면으로 모순된다. 안전 정보와 직결되므로 "
                      "더더욱 신중해야 하는 사례 — 명백한 거절."),
    },
    "쥐치포용 쥐치": {
        "decision": KEEP_MANUAL_REVIEW, "confidence": "medium",
        "evidence": ["relatedFish 첫 항목이 '쥐치' 자신", "분류군(fish) 일치"],
        "conflicts": ["sourceName 자체에 공백과 '포용'이라는 이례적 단어가 섞여 있어 이름이 온전하지 않다",
                     "이 항목은 '주의가 필요한 어종' 카테고리가 아니라서 기존 이름오염 탐지 로직이 "
                     "잡아내지 못하고 이 배치에 잘못 편입됐다"],
        "reviewNote": ("이번 검토 중 새로 발견한 이름 오염 사례로 판단한다. 단순 동의어 승인 대상이 "
                      "아니라 원본 이름 정정 여부를 먼저 결정해야 한다 — approved 대상에서 제외한다."),
    },
}
