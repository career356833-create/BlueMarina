from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path


QUESTIONS_TS = Path("src/data/general-questions.ts")
V1_CSV = Path("src/data/question-category-map-general-v1.csv")
V2_CSV = Path("src/data/question-category-map-general-v2.csv")
REPORT = Path("work/question-category-map-general-v2-report.json")

ALLOWED_CATEGORIES = [
    "기상 및 해양환경",
    "조석·조류·해류",
    "항해·해도·항로표지",
    "선박 조종술 및 운용",
    "기관 및 정비",
    "구명·조난·소방",
    "응급처치·인명구조",
    "법규·행정",
]

SUSPICIOUS_IDS = {
    1, 27, 37, 38, 41, 42, 43, 45, 47, 50, 52, 53, 57, 58, 64, 72, 75, 81, 104, 107,
    114, 141, 143, 145, 147, 148, 149, 160, 161, 164, 167, 169, 171, 175, 178, 181,
    182, 183, 186, 189, 194, 195, 196, 198, 199, 202, 204, 205, 207, 208, 210, 218,
    224, 228, 241, 250, 254, 255, 258, 262, 263, 268, 269, 270, 271, 272, 274, 276,
    289, 300, 303, 309, 323, 326, 335, 357, 358, 361, 362, 386, 387, 388, 390, 393,
    394, 399, 403, 408, 412, 416, 418, 430, 435, 442, 445, 462, 469, 473, 478, 479,
    481, 488, 492, 497, 499, 501, 504, 521, 526, 545, 551, 555, 557, 558, 561, 562,
    563, 574, 576, 577, 580, 586, 588, 594, 595, 596, 601, 604, 606, 616, 617, 618,
    619, 624, 625, 626, 629, 630, 631, 638, 643, 657, 669, 672, 673, 674, 676, 684,
    697,
}

CLASSIFICATION_RULES = [
    (
        "응급처치·인명구조",
        "CPR·AED",
        "심폐소생술",
        ["심폐소생술", "CPR", "AED", "자동심장충격기", "흉부압박", "인공호흡"],
    ),
    (
        "응급처치·인명구조",
        "응급처치",
        "응급처치",
        ["응급처치", "출혈", "지혈", "상처", "화상", "골절", "부목", "쇼크", "저체온", "동상", "환자", "기도", "맥박", "호흡"],
    ),
    (
        "응급처치·인명구조",
        "인명구조",
        "익수자 구조",
        ["익수자", "물에 빠", "사람이 물에 빠", "구조자", "요구조자", "생존수영", "구조술"],
    ),
    (
        "구명·조난·소방",
        "구명설비",
        "구명설비",
        ["구명뗏목", "구명조끼", "구명동의", "구명환", "구명부환", "구명줄", "구명 장비", "구명장비", "로프의 시험 하중"],
    ),
    (
        "구명·조난·소방",
        "조난신호",
        "조난통신",
        ["조난", "MAYDAY", "PAN PAN", "SECURITE", "EPIRB", "SART", "VHF", "무선전화", "기류신호"],
    ),
    (
        "구명·조난·소방",
        "소방",
        "화재·소화",
        ["화재", "소화기", "소화", "소방", "유독가스", "기름화재", "불이 나고"],
    ),
    (
        "구명·조난·소방",
        "사고대응",
        "해양사고 대응",
        ["좌초", "이초", "침수", "충돌 사고", "장애물과의 접촉", "임의좌주", "전복", "표류", "해양사고 대처"],
    ),
    (
        "기관 및 정비",
        "연료계통",
        "연료계통",
        ["연료", "연료계통", "휘발유", "경유", "연료필터", "연료탱크", "연료가 고갈"],
    ),
    (
        "기관 및 정비",
        "냉각계통",
        "냉각계통",
        ["냉각", "냉각수", "임펠러", "해수펌프", "오버히트", "과열"],
    ),
    (
        "기관 및 정비",
        "윤활계통",
        "윤활계통",
        ["윤활", "오일", "엔진오일", "기어오일", "윤활유"],
    ),
    (
        "기관 및 정비",
        "전기·점화",
        "전기·점화",
        ["배터리", "축전지", "점화", "점화플러그", "전기", "퓨즈", "시동모터"],
    ),
    (
        "기관 및 정비",
        "기관고장",
        "고장진단",
        ["기관고장", "고장", "시동", "출력 저하", "기관이", "엔진", "선외기", "프로펠러", "추진기", "릴리프 밸브", "압력"],
    ),
    (
        "조석·조류·해류",
        "조석",
        "조석",
        ["조석", "만조", "간조", "고조", "저조", "조차", "대조", "소조", "사리", "조금", "조석표", "물때"],
    ),
    (
        "조석·조류·해류",
        "조류",
        "조류",
        ["조류", "창조류", "낙조류", "게류", "순조", "역조", "유속", "유향", "해조류"],
    ),
    (
        "조석·조류·해류",
        "해류",
        "해류",
        ["해류", "난류", "한류"],
    ),
    (
        "기상 및 해양환경",
        "기상현상",
        "기상특보",
        ["기상특보", "풍랑", "폭풍해일", "호우", "대설", "강풍", "주의보", "경보"],
    ),
    (
        "기상 및 해양환경",
        "태풍",
        "태풍",
        ["태풍", "위험반원", "가항반원"],
    ),
    (
        "기상 및 해양환경",
        "안개",
        "안개",
        ["안개", "복사안개", "해무", "시정", "제한시계"],
    ),
    (
        "기상 및 해양환경",
        "바람",
        "바람",
        ["풍향", "풍속", "바람", "해륙풍", "계절풍"],
    ),
    (
        "기상 및 해양환경",
        "파랑",
        "파랑",
        ["파도", "파랑", "너울", "파고", "파장", "폭풍우"],
    ),
    (
        "기상 및 해양환경",
        "해양환경",
        "해양환경",
        ["기수", "염도", "해양환경", "수온", "수질", "이안류"],
    ),
    (
        "항해·해도·항로표지",
        "해도",
        "해도",
        ["해도", "수심", "암초", "저질", "간출암", "편차", "교차방위법", "물표", "좌표"],
    ),
    (
        "항해·해도·항로표지",
        "항로표지",
        "항로표지",
        ["항로표지", "등대", "등부표", "부표", "교량표지", "광달거리"],
    ),
    (
        "항해·해도·항로표지",
        "항해계기",
        "GPS·레이더",
        ["GPS", "DGPS", "레이더", "자기컴퍼스", "컴퍼스", "AIS", "선박자동식별장치", "대지속력", "대수속력", "SOG", "STW"],
    ),
    (
        "항해·해도·항로표지",
        "등화",
        "등화",
        ["등화", "항해등", "정박등", "현등", "선미등", "마스트등", "섬광등"],
    ),
    (
        "항해·해도·항로표지",
        "음향신호",
        "음향신호",
        ["음향신호", "기적", "사이렌", "단음", "장음", "무중신호", "타종", "조종신호", "경고신호"],
    ),
    (
        "항해·해도·항로표지",
        "항법",
        "충돌예방항법",
        ["항법", "피항선", "유지선", "횡단", "마주치는", "추월", "충돌위험", "우현", "좌현", "정박 중인 동력레저기구"],
    ),
    (
        "선박 조종술 및 운용",
        "조종",
        "조종술",
        ["조종", "변침", "증속", "감속", "후진", "전진", "선회", "킥", "타각", "러더", "사행"],
    ),
    (
        "선박 조종술 및 운용",
        "접안",
        "접안·계류",
        ["접안", "이안", "계류", "묘박", "투묘", "닻", "닻줄", "계류색"],
    ),
    (
        "선박 조종술 및 운용",
        "선체구조",
        "선체구조",
        ["선체", "복원력", "복원성", "주요 치수", "흘수", "건현", "배수량", "의장수", "선박의 길이"],
    ),
    (
        "선박 조종술 및 운용",
        "운항",
        "운항상식",
        ["운항", "항주", "속력", "노트", "해리", "입항", "출항", "수상오토바이", "모터보트", "운항 경로", "암초를 피하기"],
    ),
    (
        "선박 조종술 및 운용",
        "실기시험",
        "실기시험",
        ["실기시험", "채점기준", "시험관", "운항코스"],
    ),
    (
        "법규·행정",
        "벌칙·행정처분",
        "벌칙·과태료",
        ["벌칙", "과태료", "벌금", "징역", "행정처분", "면허취소", "효력정지", "위반한 자"],
    ),
    (
        "법규·행정",
        "면허·등록",
        "면허·등록",
        ["면허", "조종면허", "면허시험", "면허증", "등록", "말소등록", "안전검사", "검사증서"],
    ),
    (
        "법규·행정",
        "운항규칙",
        "운항규칙",
        ["수상레저안전법", "운항신고", "야간수상레저활동", "원거리 수상레저활동", "운항금지", "운항방법"],
    ),
    (
        "법규·행정",
        "항만·항로",
        "항만·항로",
        ["항만법", "항만구역", "항계", "정박구역", "통항분리", "해상교통안전법상", "해상교통안전법", "수역", "항로를 점거", "선박 통항"],
    ),
    (
        "법규·행정",
        "해양환경법규",
        "해양환경관리",
        ["해양환경관리법", "오염", "오염물질", "폐기물", "기름기록부", "폐유", "분뇨", "배출", "방제"],
    ),
    (
        "법규·행정",
        "전파법",
        "전파법",
        ["전파법", "무선설비", "적합성평가", "무선국"],
    ),
    (
        "법규·행정",
        "보험·행정",
        "보험·신고",
        ["보험", "신고", "허가", "승인", "해양경찰서장", "해양경찰청장", "시장·군수·구청장"],
    ),
]


def load_questions() -> dict[int, dict]:
    text = QUESTIONS_TS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\[.*\]);\s*$", text, re.S)
    if not match:
        raise ValueError("generalQuestions array not found")
    return {item["id"]: item for item in json.loads(match.group(1))}


def load_v1() -> list[dict[str, str]]:
    with V1_CSV.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def content_of(question: dict) -> str:
    return " ".join([question.get("question", ""), " ".join(question.get("choices", [])), question.get("explanation", "")])


def classify(question: dict) -> dict[str, str]:
    content = content_of(question)
    scores: Counter[str] = Counter()
    sub_scores: Counter[tuple[str, str]] = Counter()
    detail_scores: Counter[tuple[str, str, str]] = Counter()
    tag_scores: Counter[str] = Counter()

    for category, sub_category, detail_category, keywords in CLASSIFICATION_RULES:
        for keyword in keywords:
            if keyword.lower() in content.lower():
                weight = 4 if len(keyword) >= 4 else 2
                if keyword in question.get("question", ""):
                    weight += 3
                scores[category] += weight
                sub_scores[(category, sub_category)] += weight
                detail_scores[(category, sub_category, detail_category)] += weight
                tag_scores[keyword] += weight

    # Explicit tie breakers based on the concept needed to answer the question.
    qtext = question.get("question", "")
    if any(term in qtext for term in ["법상", "규칙상", "시행령", "시행규칙"]) and not any(
        term in qtext for term in ["등화", "음향신호", "피항", "유지선", "추월", "횡단"]
    ):
        scores["법규·행정"] += 10
    if any(term in qtext for term in ["사람이 물에 빠", "익수자", "물에 빠졌"]):
        scores["응급처치·인명구조"] += 12
    if any(term in qtext for term in ["화재", "소화", "구명", "조난"]):
        scores["구명·조난·소방"] += 10
    if any(term in qtext for term in ["대처", "조치", "조치사항"]) and any(term in content for term in ["침수", "좌초", "전복", "표류"]):
        scores["구명·조난·소방"] += 6
    if any(term in qtext for term in ["태풍", "안개", "기상", "풍랑", "파도", "파랑", "폭풍우"]):
        scores["기상 및 해양환경"] += 8
    if any(term in qtext for term in ["조석", "조류", "물때", "대지속력", "대수속력"]):
        scores["조석·조류·해류"] += 8
    if any(term in qtext for term in ["해도", "GPS", "DGPS", "AIS", "컴퍼스", "등대", "교량표지", "광달거리"]):
        scores["항해·해도·항로표지"] += 8
    if any(term in qtext for term in ["속력", "항주 거리", "입항까지 소요", "운항 경로", "수상오토바이", "모터보트 운항"]):
        scores["선박 조종술 및 운용"] += 8
    if any(term in qtext for term in ["복원력", "주요 치수", "킥", "로프"]):
        scores["선박 조종술 및 운용"] += 8
    if any(term in qtext for term in ["기관", "엔진", "연료", "냉각", "윤활", "시동", "배터리"]):
        scores["기관 및 정비"] += 8

    if not scores:
        category = "선박 조종술 및 운용"
    else:
        category = scores.most_common(1)[0][0]

    sub_candidates = [(key[1], value) for key, value in sub_scores.items() if key[0] == category]
    detail_candidates = [(key[1], key[2], value) for key, value in detail_scores.items() if key[0] == category]
    sub_category = max(sub_candidates, key=lambda item: item[1])[0] if sub_candidates else {
        "기상 및 해양환경": "기상현상",
        "조석·조류·해류": "조석",
        "항해·해도·항로표지": "항법",
        "선박 조종술 및 운용": "운항",
        "기관 및 정비": "기관기초",
        "구명·조난·소방": "사고대응",
        "응급처치·인명구조": "응급처치",
        "법규·행정": "운항규칙",
    }[category]
    detail_category = max(detail_candidates, key=lambda item: item[2])[1] if detail_candidates else {
        "기상 및 해양환경": "기상현상",
        "조석·조류·해류": "조석",
        "항해·해도·항로표지": "항법",
        "선박 조종술 및 운용": "운항상식",
        "기관 및 정비": "기관기초",
        "구명·조난·소방": "사고대응",
        "응급처치·인명구조": "응급처치",
        "법규·행정": "운항규칙",
    }[category]

    tags = [tag for tag, _ in tag_scores.most_common(6) if tag.lower() in content.lower()]
    if not tags:
        tags = [detail_category, sub_category, category]

    return {
        "category": category,
        "subCategory": sub_category,
        "detailCategory": detail_category,
        "tags": "|".join(tags[:6]),
    }


def suspicion_count(rows: list[dict[str, str]], questions: dict[int, dict]) -> tuple[int, list[int]]:
    ids: list[int] = []
    for row in rows:
        qid = int(row["id"])
        question = questions[qid]
        content = content_of(question)
        category = row["category"]
        tags = row["tags"].split("|")
        has_category_signal = any(tag and tag.lower() in content.lower() for tag in tags)
        if not has_category_signal and category not in content:
            ids.append(qid)
    return len(ids), ids


def main() -> None:
    questions = load_questions()
    rows = load_v1()
    before_by_id = {int(row["id"]): dict(row) for row in rows}
    output_rows: list[dict[str, str]] = []
    changed: list[dict[str, str]] = []

    for row in rows:
        qid = int(row["id"])
        next_row = dict(row)
        if qid in SUSPICIOUS_IDS:
            refined = classify(questions[qid])
            next_row.update(refined)
            before = before_by_id[qid]
            if any(before[field] != next_row[field] for field in ["category", "subCategory", "detailCategory", "tags"]):
                changed.append(
                    {
                        "id": str(qid),
                        "from": f"{before['category']} / {before['subCategory']} / {before['detailCategory']} / {before['tags']}",
                        "to": f"{next_row['category']} / {next_row['subCategory']} / {next_row['detailCategory']} / {next_row['tags']}",
                    }
                )
        output_rows.append(next_row)

    ids = [int(row["id"]) for row in output_rows]
    errors = []
    if len(output_rows) != 700:
        errors.append(f"row count {len(output_rows)}")
    if ids != list(range(1, 701)):
        errors.append("ids are not 1..700")
    if len(set(ids)) != 700:
        errors.append("duplicate ids")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [row["id"] for row in output_rows if not row[field].strip()]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")
    bad = [row["id"] for row in output_rows if row["category"] not in ALLOWED_CATEGORIES]
    if bad:
        errors.append(f"bad categories: {bad[:20]}")
    if errors:
        raise SystemExit("\n".join(errors))

    with V2_CSV.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "category", "subCategory", "detailCategory", "tags"])
        writer.writeheader()
        writer.writerows(output_rows)

    remaining_count, remaining_ids = suspicion_count(output_rows, questions)
    report = {
        "created": str(V2_CSV),
        "changed_count": len(changed),
        "changed": changed,
        "category_counts": dict(Counter(row["category"] for row in output_rows)),
        "remaining_suspicious_count": remaining_count,
        "remaining_suspicious_ids": remaining_ids,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
