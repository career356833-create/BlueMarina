import csv
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_TS = ROOT / "src" / "data" / "questions.ts"
OUT_CSV = ROOT / "src" / "data" / "question-category-map-v2.csv"
VALIDATION_JSON = ROOT / "work" / "question-category-map-v2-validation.json"


LEGAL_ADMIN = [
    "면허", "조종면허", "필기시험", "실기시험", "시험대행", "안전교육", "결격", "갱신", "발급", "재발급",
    "등록", "등록번호판", "말소", "변경등록", "신규검사", "정기검사", "임시검사", "안전검사", "검사필증",
    "수수료", "사업자", "사업장", "영업구역", "영업", "등록관청", "해양경찰서장", "시장·군수·구청장",
    "과태료", "벌금", "징역", "벌칙", "처분", "취소", "정지", "과징금", "위반", "신고", "허가", "승인",
    "법", "법률", "법상", "시행령", "시행규칙", "수상레저안전법", "수상레저기구등록법", "해상교통안전법",
    "해양환경관리법", "선박오염방지규칙", "연안사고 예방", "낚시 관리", "마리나항만", "적용 배제",
    "운항구역", "위치발신장치", "동력수상레저기구", "해양레저활동 금지구역", "교통안전특정해역",
    "폐기물", "폐유", "분뇨", "오염", "방제", "배출", "유해액체물질", "방오도료", "영해기선", "해양환경",
]
PORT_LAW = ["선박의 입항", "출항", "무역항", "수상구역", "항로에서", "계선", "정박", "예인선", "항행장애물", "방파제"]
OPERATING_RULE = ["주취", "야간", "정원", "원거리", "기상특보", "제한속력", "구명조끼", "안전모", "사고사실", "운항규칙"]

WEATHER = [
    "기상", "바람", "풍향", "풍속", "풍랑", "너울", "태풍", "전선", "안개", "해무", "이류무", "복사무",
    "기압", "고기압", "저기압", "계절풍", "해륙풍", "기온", "습도", "특보", "주의보", "경보", "보퍼트",
    "파고", "돌풍", "기단", "용승", "수온", "염분", "혼합층", "수온약층", "산소 최소층",
]
TIDE_CURRENT = ["조석", "조류", "해류", "만조", "간조", "고조", "저조", "대조", "소조", "사리", "조금", "창조", "낙조", "정조", "게류", "조차", "해면", "수심"]
CHART = ["해도", "수로서지", "항행통보", "수심", "등심선", "저질", "암초", "간출", "노출암", "항로지", "나침도", "편차", "자차"]
AID = ["등대", "부표", "등부표", "항로표지", "iala", "측방표지", "방위표지", "신위험물", "교량표", "등색", "등질", "좌현표지", "우현표지"]
INSTRUMENT = ["컴퍼스", "나침반", "gps", "dgps", "레이더", "ais", "vhf", "방위", "위치선", "중시선", "교차방위", "육분의", "속력", "항주거리", "음향측심", "대지속력", "대수속력"]
INSTRUMENT += ["항정", "항정선", "대권", "포인트", "도플러", "선속계", "mpH".lower(), "게이지"]

ENGINE = [
    "기관", "엔진", "내연기관", "디젤", "가솔린", "연료", "윤활", "윤활유", "엔진오일", "기어오일", "냉각",
    "냉각수", "임펠러", "원심펌프", "점화", "점화플러그", "시동", "시동모터", "배터리", "축전지", "전류",
    "퓨즈", "전기회로", "기화기", "필터", "오버히트", "과열", "출력", "회전수", "피스톤", "커넥팅로드",
    "플라이휠", "2행정", "4행정", "옥탄가", "멀티테스터", "전원 회로", "납축전지",
    "발열작용", "자기작용", "자화작용", "화학작용",
]
FUEL = ["연료", "연료유", "연료탱크", "연료필터", "연료펌프", "인젝터", "기화기", "옥탄가"]
COOLING = ["냉각", "냉각수", "임펠러", "원심펌프", "서모스탯", "수온조절기", "플러싱", "해수"]
LUBRICATION = ["윤활", "윤활유", "엔진오일", "기어오일", "오일", "유압", "섬프"]
ELECTRIC = ["점화", "점화플러그", "배터리", "축전지", "전류", "퓨즈", "전기", "전원", "시동모터", "마그네틱스위치", "멀티테스터"]
ENGINE_TROUBLE = ["고장", "과열", "오버히트", "출력", "정지", "소음", "진동", "급정지", "압력 저하", "자연 정지", "과부하"]

SAFETY = [
    "구명", "구조", "익수", "인명구조", "조난", "비상", "사고", "전복", "침몰", "침수", "좌초", "임의좌주",
    "화재", "소화기", "응급", "심폐소생", "cpr", "aed", "자동심장충격기", "흉부압박", "가슴압박", "인공호흡",
    "기도", "하임리히", "출혈", "지혈", "골절", "부목", "화상", "동상", "저체온", "의식", "호흡", "맥박",
    "119", "신호홍염", "발연부", "로켓낙하산", "epirb", "구명조끼", "구명부환", "구명뗏목", "드로우백", "eeBD".lower(),
    "구조활동", "맨몸구조", "인간사슬", "물에 빠진", "감염병", "병원체", "구조자의 안전",
]
DISTRESS = ["조난신호", "신호홍염", "발연부", "로켓낙하산", "epirb", "조난통신", "mayday", "메이데이", "gmdss"]
DISTRESS += ["조난호출", "무선국", "통신권", "a1 해역", "a2 해역", "a3 해역", "a4 해역", "inmarsat", "iridium"]
LIFESAVING = ["구명조끼", "구명부환", "구명뗏목", "구명줄", "구명줄발사기", "드로우백", "수압이탈", "생존수영", "보온구"]
FIRST_AID = ["응급", "출혈", "지혈", "골절", "부목", "화상", "동상", "저체온", "쇼크", "기도폐쇄", "하임리히", "감염", "처치"]
CPR = ["심폐소생", "cpr", "aed", "자동심장충격기", "흉부압박", "가슴압박", "인공호흡", "심정지", "심실세동"]

YACHT = [
    "요트", "세일", "돛", "마스트", "붐", "지브", "집세일", "메인세일", "스피니커", "클루", "러프", "리치",
    "리핑", "트림", "텔테일", "배튼", "그로밋", "킬", "센터보드", "러더", "타자루", "콕핏", "크루", "스키퍼",
    "범주", "태킹", "자이브", "풍상", "풍하", "빔리치", "브로드리치", "클로스홀드", "히브투", "스커딩", "브로칭",
]
HULL = ["선체", "선수", "선미", "좌현", "우현", "흘수", "건현", "전폭", "전장", "트림", "복원", "저항", "톤수", "선저", "킬", "모노헐", "카타마란", "트리마란"]
MANEUVER = ["조종", "선회", "전진", "후진", "정지", "프로펠러", "킥", "횡거", "종거", "배출류", "흡입류", "추진", "조타", "미드 십", "타"]
BERTHING = ["접안", "이안", "계류", "계선", "닻", "투묘", "묘박", "해묘", "앵커", "로프", "매듭", "볼라드", "비트", "무어링", "닻줄"]
NAV_RULE = [
    "횡단", "마주치는", "추월", "피항선", "유지선", "안전한 속력", "좁은 수로", "통항분리", "제한된 시계",
    "무중신호", "기적신호", "음향신호", "단음", "장음", "등화", "형상물", "현등", "선미등", "마스트등",
    "전주등", "조종불능선", "조종제한선", "흘수제약선", "도선선", "예인선열",
]

DETAILS = {
    "면허·등록": [
        ("조종면허", ["조종면허", "면허시험", "필기시험", "실기시험", "면허증", "갱신", "면허취소", "효력정지"]),
        ("등록·검사", ["등록", "등록번호판", "안전검사", "신규검사", "정기검사", "검사필증", "변경등록", "말소등록"]),
        ("사업·교육", ["사업자", "사업장", "안전교육", "시험대행", "면제교육", "위탁기관"]),
    ],
    "운항규칙": [
        ("야간·기상특보", ["야간", "기상특보", "풍랑주의보", "활동신고"]),
        ("원거리·정원·주취", ["원거리", "정원", "주취", "혈중알코올", "속력", "안전장비"]),
        ("해양환경·오염방지", ["해양환경관리법", "선박오염방지규칙", "폐기물", "폐유", "분뇨", "오염", "방제", "배출", "유해액체물질", "방오도료"]),
        ("운항의무", ["운항규칙", "착용", "사고", "신고사항", "시정명령"]),
    ],
    "항만·항로": [
        ("입항·출항", ["입항", "출항", "무역항", "수상구역"]),
        ("항로·정박", ["항로", "정박", "계선", "예인선", "방파제", "항행장애물"]),
    ],
    "벌칙·행정처분": [
        ("벌칙·과태료", ["벌금", "징역", "과태료", "벌칙"]),
        ("행정처분", ["처분", "취소", "정지", "과징금", "업무정지", "지정취소"]),
    ],
    "조석·조류": [
        ("조석", ["조석", "만조", "간조", "고조", "저조", "대조", "소조", "사리", "조금", "조차"]),
        ("조류·해류", ["조류", "해류", "창조", "낙조", "정조", "게류", "유향", "유속"]),
    ],
    "기상": [
        ("바람·기압", ["바람", "풍향", "풍속", "기압", "고기압", "저기압", "계절풍", "해륙풍"]),
        ("해상기상", ["풍랑", "너울", "파고", "태풍", "안개", "해무", "전선", "기상특보"]),
    ],
    "해도": [
        ("해도·수로서지", ["해도", "수로서지", "항행통보", "항로지", "수심", "저질"]),
        ("방위·선위", ["방위", "위치선", "중시선", "교차방위", "편차", "자차"]),
    ],
    "항로표지": [
        ("부표·등대", ["부표", "등부표", "등대", "항로표지", "iala", "측방표지", "방위표지"]),
        ("등색·등질", ["등색", "등질", "섬광", "홍색", "녹색"]),
    ],
    "항해계기": [
        ("컴퍼스·GPS", ["컴퍼스", "나침반", "gps", "dgps", "ais", "vhf"]),
        ("레이더·측정장비", ["레이더", "육분의", "속력", "대지속력", "대수속력", "음향측심"]),
    ],
    "선체구조": [
        ("선체·치수", ["선체", "선수", "선미", "좌현", "우현", "흘수", "건현", "전폭", "전장", "톤수"]),
        ("복원성·저항", ["복원", "저항", "트림", "횡경사", "킬", "선저"]),
    ],
    "조종": [
        ("추진·선회", ["조종", "선회", "전진", "후진", "프로펠러", "킥", "조타", "타"]),
        ("악천후조종", ["히브투", "스커딩", "브로칭", "황천", "해묘"]),
    ],
    "접안": [
        ("접안·이안", ["접안", "이안", "현측", "진입각", "계류"]),
        ("투묘·로프", ["닻", "투묘", "묘박", "로프", "매듭", "볼라드", "비트", "무어링"]),
    ],
    "항법": [
        ("충돌예방", ["횡단", "마주치는", "추월", "피항선", "유지선", "안전한 속력"]),
        ("등화·음향", ["등화", "형상물", "현등", "선미등", "마스트등", "음향신호", "기적신호", "단음", "장음"]),
    ],
    "요트운용": [
        ("요트의장", ["세일", "돛", "마스트", "붐", "지브", "집세일", "메인세일", "스피니커", "킬"]),
        ("범주", ["범주", "태킹", "자이브", "풍상", "풍하", "빔리치", "트림", "텔테일"]),
    ],
    "기관기초": [
        ("기관원리", ["기관", "엔진", "내연기관", "2행정", "4행정", "피스톤", "플라이휠"]),
    ],
    "연료계통": [("연료장치", FUEL)],
    "냉각계통": [("냉각장치", COOLING)],
    "윤활계통": [("윤활장치", LUBRICATION)],
    "전기·점화": [("전기·점화장치", ELECTRIC)],
    "기관고장": [("고장진단", ENGINE_TROUBLE)],
    "구명설비": [("구명장비", LIFESAVING)],
    "조난신호": [("조난통신·신호", DISTRESS)],
    "사고대응": [("사고·비상대응", ["사고", "전복", "침몰", "침수", "좌초", "화재", "소화기", "구조", "인명구조"])],
    "응급처치": [("일반응급처치", FIRST_AID)],
    "CPR·AED": [("심폐소생술", CPR)],
}


def extract_questions_from_ts():
    source = QUESTIONS_TS.read_text(encoding="utf-8")
    marker = "export const questions: Question[] = "
    start = source.index(marker) + len(marker)
    end = source.rindex("\n];") + 2
    return json.loads(source[start:end])


def normalize(q):
    parts = [q["question"], " ".join(q["choices"]), q.get("explanation", "")]
    return " ".join(parts).lower()


def hits(text, words):
    return [word for word in words if word.lower() in text]


def score(text, words):
    return len(hits(text, words))


def pick_detail(sub_category, text):
    best_name = sub_category
    best_hits = []
    for name, words in DETAILS[sub_category]:
        current_hits = hits(text, words)
        if len(current_hits) > len(best_hits):
            best_name = name
            best_hits = current_hits
    return best_name, best_hits


def dedupe(items):
    seen = set()
    result = []
    for item in items:
        item = str(item).strip()
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def classify(q):
    text = normalize(q)

    safety_score = score(text, SAFETY)
    engine_score = score(text, ENGINE)
    weather_score = score(text, WEATHER) + score(text, TIDE_CURRENT)
    nav_score = score(text, CHART) + score(text, AID) + score(text, INSTRUMENT)
    yacht_score = score(text, YACHT) + score(text, HULL) + score(text, MANEUVER) + score(text, BERTHING) + score(text, NAV_RULE)
    legal_score = score(text, LEGAL_ADMIN) + score(text, PORT_LAW) + score(text, OPERATING_RULE)

    # Strong concepts first. This prevents "해상교통안전법상" from swallowing practical navigation topics.
    if legal_score >= 2 and any(word in text for word in ["안전검사", "시행규칙", "무선설비", "설치가 제외", "제출해야"]):
        category, sub = "법규", "면허·등록"
    elif "수상레저안전법" in text and "영업구역" in text and "무선국" in text:
        category, sub = "법규", "운항규칙"
    elif score(text, CPR) >= 1:
        category, sub = "안전·응급처치", "CPR·AED"
    elif score(text, FIRST_AID) >= 1:
        category, sub = "안전·응급처치", "응급처치"
    elif score(text, DISTRESS) >= 1:
        category, sub = "안전·응급처치", "조난신호"
    elif score(text, LIFESAVING) >= 1 and legal_score < 3:
        category, sub = "안전·응급처치", "구명설비"
    elif safety_score >= 2 and safety_score >= legal_score:
        category, sub = "안전·응급처치", "사고대응"
    elif engine_score >= 2 or score(text, ELECTRIC) >= 1:
        category = "기관"
        if score(text, ENGINE_TROUBLE) >= 1:
            sub = "기관고장"
        elif score(text, COOLING) >= 1:
            sub = "냉각계통"
        elif score(text, LUBRICATION) >= 1:
            sub = "윤활계통"
        elif score(text, ELECTRIC) >= 1:
            sub = "전기·점화"
        elif score(text, FUEL) >= 1:
            sub = "연료계통"
        else:
            sub = "기관기초"
    elif score(text, TIDE_CURRENT) >= 1:
        category, sub = "항해·기상", "조석·조류"
    elif score(text, WEATHER) >= 1:
        category, sub = "항해·기상", "기상"
    elif score(text, AID) >= 1:
        category, sub = "항해·기상", "항로표지"
    elif score(text, CHART) >= 1:
        category, sub = "항해·기상", "해도"
    elif score(text, INSTRUMENT) >= 1:
        category, sub = "항해·기상", "항해계기"
    elif score(text, NAV_RULE) >= 1:
        category, sub = "선박운용", "항법"
    elif score(text, YACHT) >= 1:
        category, sub = "선박운용", "요트운용"
    elif score(text, BERTHING) >= 1:
        category, sub = "선박운용", "접안"
    elif score(text, MANEUVER) >= 1:
        category, sub = "선박운용", "조종"
    elif score(text, HULL) >= 1:
        category, sub = "선박운용", "선체구조"
    elif legal_score >= 1:
        category = "법규"
        if score(text, ["벌금", "징역", "과태료", "벌칙", "처분", "취소", "정지", "과징금", "업무정지", "지정취소"]) >= 1:
            sub = "벌칙·행정처분"
        elif score(text, PORT_LAW) >= 1:
            sub = "항만·항로"
        elif score(text, ["해양환경관리법", "선박오염방지규칙", "폐기물", "폐유", "분뇨", "오염", "방제", "배출", "유해액체물질", "방오도료"]) >= 1:
            sub = "운항규칙"
        elif score(text, OPERATING_RULE) >= 1:
            sub = "운항규칙"
        else:
            sub = "면허·등록"
    else:
        category, sub = "선박운용", "요트운용"

    # Legal administrative phrases should override only when the core topic is administrative.
    if legal_score >= 3 and category not in ["안전·응급처치", "기관"] and score(text, NAV_RULE + AID + CHART + INSTRUMENT + WEATHER + TIDE_CURRENT) == 0:
        category = "법규"
        if score(text, ["벌금", "징역", "과태료", "벌칙", "처분", "취소", "정지", "과징금", "업무정지", "지정취소"]) >= 1:
            sub = "벌칙·행정처분"
        elif score(text, PORT_LAW) >= 1:
            sub = "항만·항로"
        elif score(text, ["해양환경관리법", "선박오염방지규칙", "폐기물", "폐유", "분뇨", "오염", "방제", "배출", "유해액체물질", "방오도료"]) >= 1:
            sub = "운항규칙"
        elif score(text, OPERATING_RULE) >= 1:
            sub = "운항규칙"
        else:
            sub = "면허·등록"

    detail, detail_hits = pick_detail(sub, text)
    tag_candidates = detail_hits

    if category == "법규":
        tag_candidates += hits(text, LEGAL_ADMIN + PORT_LAW + OPERATING_RULE)
    elif category == "항해·기상":
        tag_candidates += hits(text, WEATHER + TIDE_CURRENT + CHART + AID + INSTRUMENT)
    elif category == "선박운용":
        tag_candidates += hits(text, YACHT + HULL + MANEUVER + BERTHING + NAV_RULE)
    elif category == "기관":
        tag_candidates += hits(text, ENGINE + FUEL + COOLING + LUBRICATION + ELECTRIC + ENGINE_TROUBLE)
    elif category == "안전·응급처치":
        tag_candidates += hits(text, SAFETY + DISTRESS + LIFESAVING + FIRST_AID + CPR)

    tags = dedupe(tag_candidates)[:5]
    if not tags:
        tags = [detail]

    return {
        "id": q["id"],
        "category": category,
        "subCategory": sub,
        "detailCategory": detail,
        "tags": "|".join(tags),
    }


def validate(rows):
    ids = [int(row["id"]) for row in rows]
    errors = []
    if len(rows) != 700:
        errors.append(f"row count {len(rows)} != 700")
    if sorted(ids) != list(range(1, 701)):
        errors.append("ids are not exactly 1..700")
    if len(ids) != len(set(ids)):
        errors.append("duplicate ids exist")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [row["id"] for row in rows if not str(row[field]).strip()]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")
    allowed = {"법규", "항해·기상", "선박운용", "기관", "안전·응급처치"}
    invalid = [row for row in rows if row["category"] not in allowed]
    if invalid:
        errors.append(f"invalid category: {invalid[:5]}")
    return errors


def independent_suspicion(row):
    q = QUESTIONS[int(row["id"])]
    text = normalize(q)
    cat = row["category"]
    suspicious = []
    if cat == "기관" and score(text, ENGINE) == 0:
        suspicious.append("기관 핵심 키워드 없음")
    if cat == "안전·응급처치" and score(text, SAFETY + DISTRESS) == 0:
        suspicious.append("안전/응급 핵심 키워드 없음")
    if cat == "항해·기상" and score(text, WEATHER + TIDE_CURRENT + CHART + AID + INSTRUMENT) == 0:
        suspicious.append("항해/기상 핵심 키워드 없음")
    if cat == "법규" and score(text, LEGAL_ADMIN + PORT_LAW + OPERATING_RULE) == 0:
        suspicious.append("법규 핵심 키워드 없음")
    if cat == "선박운용" and score(text, YACHT + HULL + MANEUVER + BERTHING + NAV_RULE) == 0:
        suspicious.append("선박운용 핵심 키워드 없음")
    return suspicious


QUESTIONS = {}


def main():
    global QUESTIONS
    questions = extract_questions_from_ts()
    QUESTIONS = {int(q["id"]): q for q in questions}
    rows = [classify(q) for q in questions]

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "category", "subCategory", "detailCategory", "tags"])
        writer.writeheader()
        writer.writerows(rows)

    errors = validate(rows)
    suspicions = {row["id"]: independent_suspicion(row) for row in rows if independent_suspicion(row)}
    stats = {
        "rows": len(rows),
        "categoryCounts": dict(Counter(row["category"] for row in rows)),
        "subCategoryCounts": dict(Counter(row["subCategory"] for row in rows)),
        "detailCategoryCount": len(set(row["detailCategory"] for row in rows)),
        "tagCount": len({tag for row in rows for tag in row["tags"].split("|") if tag}),
        "validationErrors": errors,
        "suspiciousCount": len(suspicions),
        "suspicious": suspicions,
    }
    VALIDATION_JSON.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print(f"wrote {OUT_CSV}")


if __name__ == "__main__":
    main()
