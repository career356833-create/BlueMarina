from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path


SRC = Path("src/data/general-questions.ts")
OUT = Path("src/data/question-category-map-general-v1.csv")

CATEGORIES = [
    "기상 및 해양환경",
    "조석·조류·해류",
    "항해·해도·항로표지",
    "선박 조종술 및 운용",
    "기관 및 정비",
    "구명·조난·소방",
    "응급처치·인명구조",
    "법규·행정",
]

FALLBACK = {
    "기상 및 해양환경": ("기상현상", "기상현상"),
    "조석·조류·해류": ("조석", "조석"),
    "항해·해도·항로표지": ("항법", "항법"),
    "선박 조종술 및 운용": ("운항", "운항상식"),
    "기관 및 정비": ("기관기초", "기관기초"),
    "구명·조난·소방": ("사고대응", "사고대응"),
    "응급처치·인명구조": ("응급처치", "응급처치"),
    "법규·행정": ("운항규칙", "운항규칙"),
}

RULES = [
    ("응급처치·인명구조", "CPR·AED", "심폐소생술", ["심폐소생술", "CPR", "AED", "자동심장충격기", "흉부압박", "인공호흡"]),
    ("응급처치·인명구조", "응급처치", "상처·출혈", ["응급처치", "출혈", "상처", "지혈", "소독거즈", "드레싱", "화상", "골절", "부목", "염좌", "탈구", "쇼크", "저체온", "환자", "의식", "기도", "맥박", "호흡"]),
    ("응급처치·인명구조", "인명구조", "익수자 구조", ["익수자", "물에 빠", "인명구조", "구조호흡", "구조자", "요구조자"]),
    ("구명·조난·소방", "구명설비", "구명설비", ["구명동의", "구명조끼", "구명부환", "구명줄", "구명설비", "구명뗏목", "구명정", "구명부기", "구명환", "구명복"]),
    ("구명·조난·소방", "조난신호", "조난통신", ["조난", "MAYDAY", "PAN PAN", "SECURITE", "조난통신", "긴급호출", "안전호출", "조난신호", "SOS", "EPIRB", "SART", "VHF", "초단파", "무선전화"]),
    ("구명·조난·소방", "소방", "화재·소화", ["화재", "소화기", "소화", "소방", "연소", "화염", "분말소화기", "이산화탄소소화기", "기름화재"]),
    ("구명·조난·소방", "사고대응", "사고대응", ["침수", "좌초", "전복", "충돌사고", "사고 발생", "비상", "퇴선", "누수", "예인", "표류"]),
    ("기관 및 정비", "연료계통", "연료계통", ["연료", "휘발유", "경유", "연료탱크", "연료필터", "연료펌프", "연료계통", "기화기", "카브레터", "혼합비"]),
    ("기관 및 정비", "냉각계통", "냉각계통", ["냉각", "냉각수", "해수펌프", "임펠러", "써모스탯", "과열", "오버히트"]),
    ("기관 및 정비", "윤활계통", "윤활계통", ["윤활", "윤활유", "오일", "엔진오일", "기어오일", "오일필터", "유압"]),
    ("기관 및 정비", "전기·점화", "전기·점화", ["배터리", "축전지", "점화", "점화플러그", "전기", "발전기", "퓨즈", "시동모터", "스파크", "전압", "전류"]),
    ("기관 및 정비", "기관고장", "고장진단", ["시동 불량", "시동이", "기관고장", "고장", "정지", "출력 저하", "소음", "진동", "배기가스", "흰 연기", "검은 연기", "역회전"]),
    ("기관 및 정비", "기관기초", "기관기초", ["기관", "엔진", "내연기관", "디젤기관", "가솔린기관", "프로펠러", "추진기", "선외기", "선내기", "선미추진기", "동력전달"]),
    ("기관 및 정비", "정비", "점검·정비", ["정비", "점검", "교환", "세척", "보관", "폐유", "그리스", "방청", "부식", "마모"]),
    ("조석·조류·해류", "조석", "조석", ["조석", "만조", "간조", "고조", "저조", "조차", "대조", "소조", "사리", "조금", "조석표", "월령", "삭", "망", "상현", "하현"]),
    ("조석·조류·해류", "조류", "조류", ["조류", "창조류", "낙조류", "게류", "순조", "역조", "유속", "유향", "밀물", "썰물"]),
    ("조석·조류·해류", "해류", "해류", ["해류", "난류", "한류", "쿠로시오", "대마난류", "해수순환"]),
    ("기상 및 해양환경", "태풍", "태풍", ["태풍", "태풍주의보", "태풍경보", "위험반원", "가항반원"]),
    ("기상 및 해양환경", "안개", "안개", ["안개", "복사무", "이류무", "증기무", "해무", "시정", "박무"]),
    ("기상 및 해양환경", "바람", "바람", ["바람", "풍향", "풍속", "해륙풍", "계절풍", "돌풍", "강풍", "연풍", "남서풍", "북동풍"]),
    ("기상 및 해양환경", "기상현상", "전선·기압", ["기압", "고기압", "저기압", "전선", "온난전선", "한랭전선", "폐색전선", "기단", "기압계", "기온", "습도", "구름", "강수", "소나기"]),
    ("기상 및 해양환경", "파랑", "파랑", ["파도", "파랑", "풍랑", "너울", "파고", "파장", "주기", "해일", "폭풍해일"]),
    ("기상 및 해양환경", "해양환경", "해양환경", ["기수", "염분", "염도", "수온", "수질", "해양환경", "해면", "해수"]),
    ("항해·해도·항로표지", "해도", "해도", ["해도", "수심", "등심선", "간출암", "암초", "저질", "방위표", "해도도식", "WGS", "좌표", "위도", "경도", "침로", "진침로", "자침로"]),
    ("항해·해도·항로표지", "항로표지", "항로표지", ["항로표지", "등대", "등부표", "입표", "부표", "등표", "방위표지", "측방표지", "고립장애표지", "안전수역표지", "특수표지"]),
    ("항해·해도·항로표지", "항해계기", "GPS·레이더", ["GPS", "플로터", "레이더", "나침반", "컴퍼스", "자이로", "AIS", "속력계", "수심계", "대지속력", "대수속력", "SOG", "STW"]),
    ("항해·해도·항로표지", "등화", "등화", ["등화", "항해등", "정박등", "현등", "선미등", "마스트등", "홍등", "녹등", "백등", "섬광등", "전주등"]),
    ("항해·해도·항로표지", "음향신호", "음향신호", ["음향신호", "기적", "사이렌", "단음", "장음", "무중신호", "주의환기신호", "경고신호", "조종신호"]),
    ("항해·해도·항로표지", "항법", "충돌예방항법", ["항법", "피항선", "유지선", "횡단", "마주치는", "추월", "앞지르기", "충돌", "충돌위험", "우현", "좌현", "선수", "선미", "상대선", "제한시계"]),
    ("선박 조종술 및 운용", "조종", "조종술", ["조종", "변침", "증속", "감속", "후진", "전진", "급선회", "선회", "활주", "사행", "키", "러더", "조타", "타각", "정지거리"]),
    ("선박 조종술 및 운용", "접안", "접안·계류", ["접안", "이안", "계류", "묘박", "투묘", "양묘", "닻", "닻줄", "계류색", "홋줄", "방현대", "부두", "안벽", "정박"]),
    ("선박 조종술 및 운용", "선체구조", "선체구조", ["선체", "선저", "선수", "선미", "현측", "갑판", "빌지", "트랜섬", "흘수", "건현", "복원성", "의장수", "배수량", "총톤수"]),
    ("선박 조종술 및 운용", "운항", "운항상식", ["운항", "출항", "입항", "항해 전", "운항 전", "승선", "탑승", "적재", "정원", "속력", "마력", "수상오토바이", "모터보트", "조종자"]),
    ("선박 조종술 및 운용", "실기시험", "실기시험", ["실기시험", "채점기준", "운항코스", "시험관", "부표 통과", "출발 전 점검"]),
    ("법규·행정", "벌칙·행정처분", "벌칙·과태료", ["벌칙", "과태료", "벌금", "징역", "행정처분", "면허취소", "효력정지", "처벌", "위반한 자", "금지규정"]),
    ("법규·행정", "면허·등록", "면허·등록", ["면허", "조종면허", "면허시험", "면허증", "갱신", "등록", "말소등록", "소유권", "검사증서", "안전검사", "임시검사", "신규검사"]),
    ("법규·행정", "운항규칙", "운항규칙", ["수상레저안전법", "운항규칙", "운항방법", "운항신고", "원거리 수상레저활동", "야간수상레저활동", "운항금지", "안전수칙", "수상레저활동자"]),
    ("법규·행정", "항만·항로", "항만·항로", ["항만법", "항만구역", "항로", "수로", "항계", "정박구역", "통항분리", "해상교통안전법"]),
    ("법규·행정", "해양환경법규", "해양환경관리", ["해양환경관리법", "오염", "오염물질", "폐기물", "기름기록부", "폐기물기록부", "분뇨", "유성혼합물", "해양오염", "방제", "배출", "폐유저장용기"]),
    ("법규·행정", "전파법", "전파법", ["전파법", "무선설비", "무선종사자", "적합성평가", "무선국", "통신보안"]),
    ("법규·행정", "보험·행정", "보험·신고", ["보험", "가입증명서", "신고", "허가", "승인", "해양경찰서장", "해양경찰청장", "시장·군수·구청장", "시·도지사"]),
]

BOOSTS = [
    ("항해·해도·항로표지", 8, ["등화", "음향신호", "기적", "단음", "장음", "피항선", "유지선", "횡단", "추월", "충돌위험", "항로표지", "해도"]),
    ("선박 조종술 및 운용", 6, ["수상오토바이", "모터보트", "접안", "계류", "조종", "변침", "활주", "실기시험", "운항"]),
    ("기관 및 정비", 8, ["기관", "엔진", "연료", "냉각", "윤활", "배터리", "시동", "프로펠러", "임펠러"]),
    ("응급처치·인명구조", 10, ["응급처치", "심폐소생술", "AED", "상처", "출혈", "골절", "화상", "저체온", "익수자"]),
    ("구명·조난·소방", 9, ["구명", "조난", "소화", "화재", "MAYDAY", "PAN PAN", "SECURITE", "EPIRB"]),
    ("조석·조류·해류", 10, ["조석", "조류", "만조", "간조", "사리", "조금", "순조", "역조", "해류"]),
    ("기상 및 해양환경", 8, ["태풍", "안개", "풍향", "풍속", "기압", "전선", "파도", "파랑", "너울", "기상", "해일"]),
    ("법규·행정", 7, ["벌칙", "과태료", "벌금", "징역", "행정처분", "면허", "등록", "검사", "신고", "허가", "보험", "오염", "폐기물", "전파법"]),
]


def load_questions() -> list[dict]:
    text = SRC.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\[.*\]);\s*$", text, re.S)
    if not match:
        raise ValueError("generalQuestions array not found")
    return json.loads(match.group(1))


def contains(text: str, keyword: str) -> bool:
    return keyword.lower() in text.lower()


def classify(question: dict) -> tuple[str, str, str, list[str], int, list[tuple[str, int]]]:
    content = " ".join([question.get("question", ""), " ".join(question.get("choices", [])), question.get("explanation", "")])
    scores: Counter[str] = Counter()
    sub_scores: Counter[tuple[str, str]] = Counter()
    detail_scores: Counter[tuple[str, str, str]] = Counter()
    tag_scores: Counter[str] = Counter()

    for category, sub_category, detail_category, keywords in RULES:
        for keyword in keywords:
            if contains(content, keyword):
                weight = 3 if len(keyword) >= 4 else 2
                scores[category] += weight
                sub_scores[(category, sub_category)] += weight
                detail_scores[(category, sub_category, detail_category)] += weight
                tag_scores[keyword] += weight

    for category, weight, keywords in BOOSTS:
        if any(contains(content, keyword) for keyword in keywords):
            scores[category] += weight

    if not scores:
        category = "선박 조종술 및 운용"
        sub_category, detail_category = FALLBACK[category]
        return category, sub_category, detail_category, [detail_category, sub_category], 0, []

    ordered = scores.most_common()
    category = ordered[0][0]
    sub_candidates = [(key[1], score) for key, score in sub_scores.items() if key[0] == category]
    detail_candidates = [(key[1], key[2], score) for key, score in detail_scores.items() if key[0] == category]

    if sub_candidates:
        sub_category = Counter(dict(sub_candidates)).most_common(1)[0][0]
    else:
        sub_category = FALLBACK[category][0]

    if detail_candidates:
        detail_category = max(detail_candidates, key=lambda item: item[2])[1]
    else:
        detail_category = FALLBACK[category][1]

    tags = [tag for tag, _ in tag_scores.most_common(8) if contains(content, tag)]
    if not tags:
        tags = [detail_category, sub_category, category]

    return category, sub_category, detail_category, tags[:6], scores[category], ordered


def main() -> None:
    questions = load_questions()
    rows = []
    suspicious = []
    for question in questions:
        category, sub_category, detail_category, tags, confidence, ordered = classify(question)
        if confidence < 6 or (len(ordered) > 1 and ordered[0][1] - ordered[1][1] <= 2):
            suspicious.append(
                {
                    "id": question["id"],
                    "category": category,
                    "subCategory": sub_category,
                    "detailCategory": detail_category,
                    "scores": ordered[:3],
                    "question": question["question"][:100],
                }
            )
        rows.append(
            {
                "id": question["id"],
                "category": category,
                "subCategory": sub_category,
                "detailCategory": detail_category,
                "tags": "|".join(tags),
            }
        )

    ids = [row["id"] for row in rows]
    allowed = set(CATEGORIES)
    errors = []
    if len(rows) != 700:
        errors.append(f"row count: {len(rows)}")
    if ids != list(range(1, 701)):
        errors.append("ids are not 1..700")
    if len(set(ids)) != 700:
        errors.append("duplicate ids")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [row["id"] for row in rows if not str(row[field]).strip()]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")
    bad_categories = [row["id"] for row in rows if row["category"] not in allowed]
    if bad_categories:
        errors.append(f"bad categories: {bad_categories[:20]}")
    if errors:
        raise SystemExit("\n".join(errors))

    with OUT.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "category", "subCategory", "detailCategory", "tags"])
        writer.writeheader()
        writer.writerows(rows)

    category_counts = Counter(row["category"] for row in rows)
    sub_counts = Counter((row["category"], row["subCategory"]) for row in rows)
    tag_counts = Counter(tag for row in rows for tag in row["tags"].split("|"))

    print(f"created={OUT}")
    print("category_counts")
    for category in CATEGORIES:
        print(f"{category}: {category_counts[category]}")
    print("subCategory_counts")
    for (category, sub_category), count in sub_counts.most_common():
        print(f"{category}/{sub_category}: {count}")
    print("top_tags")
    for tag, count in tag_counts.most_common(30):
        print(f"{tag}: {count}")
    print(f"suspicious_count={len(suspicious)}")
    for item in suspicious[:50]:
        print(json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
