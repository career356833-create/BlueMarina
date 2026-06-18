import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_TS = ROOT / "src" / "data" / "questions.ts"
V2_CSV = ROOT / "src" / "data" / "question-category-map-v2.csv"
OUT_CSV = ROOT / "src" / "data" / "question-category-map-v3.csv"
OUT_JSON = ROOT / "work" / "question-category-map-v3-validation.json"
OUT_MD = ROOT / "outputs" / "blue-marina-learning-system-v3-report.md"


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


POLICY = {
    "기상 및 해양환경": {
        "include": "태풍, 안개, 해륙풍, 계절풍, 기압, 바람, 풍랑, 너울, 파랑, 기온, 습도, 해양 생태·환경 현상",
        "exclude": "조석·조류·해류, 항로표지, 법령상 해양환경관리 처분·배출 기준",
    },
    "조석·조류·해류": {
        "include": "만조, 간조, 고조, 저조, 대조, 소조, 조차, 창조류, 낙조류, 정조, 게류, 해류",
        "exclude": "일반 기상, 해도 기호, 항로표지",
    },
    "항해·해도·항로표지": {
        "include": "해도, 수로서지, 방위, 위치선, 컴퍼스, GPS, DGPS, 레이더, 항로표지, 등대, 부표, IALA, 등화, 음향신호, 충돌예방 항법",
        "exclude": "요트 세일 운용, 기관 정비, 면허·등록 행정",
    },
    "선박 조종술 및 운용": {
        "include": "요트 구조·의장, 세일, 범주, 태킹, 자이브, 접안, 이안, 계류, 투묘, 조타, 선체 특성, 악천후 운용",
        "exclude": "항해계기 이론, 법령 행정, 엔진 정비",
    },
    "기관 및 정비": {
        "include": "기관 원리, 엔진, 연료, 냉각, 윤활, 전기·점화, 배터리, 시동, 고장진단, 정비",
        "exclude": "법정 검사·등록 서류, 해양환경 법규",
    },
    "구명·조난·소방": {
        "include": "구명조끼, 구명뗏목, 구명부환, 조난신호, 조난통신, EPIRB, GMDSS, 소화기, 화재 대응, 선박 사고대응",
        "exclude": "CPR·AED, 골절·화상 등 의료 응급처치",
    },
    "응급처치·인명구조": {
        "include": "CPR, AED, 심폐소생술, 익수자 구조, 인명구조, 지혈, 골절, 화상, 저체온증, 감염, 구조자 안전",
        "exclude": "구명설비 종류, 조난통신 장비",
    },
    "법규·행정": {
        "include": "면허, 등록, 검사, 안전교육, 사업자, 영업구역, 행정처분, 벌칙, 과태료, 수상레저안전법, 해상교통안전법, 해양환경관리법",
        "exclude": "법령명은 나오지만 실제 학습 주제가 등화·음향·항법·기관·응급처치인 문항",
    },
}


SUB_RULES = {
    "기상 및 해양환경": {
        "기상현상": ["기상", "기온", "습도", "기압", "고기압", "저기압", "전선", "기단", "기온 역전"],
        "바람": ["바람", "풍향", "풍속", "계절풍", "해륙풍", "돌풍", "보퍼트"],
        "안개": ["안개", "해무", "이류무", "복사무", "시정"],
        "태풍": ["태풍", "위험반원", "가항반원", "열대저기압"],
        "파랑": ["풍랑", "너울", "파랑", "파도", "파고"],
        "해양환경현상": ["용승", "수온약층", "염분", "혼합층", "산소 최소층", "해수면", "표층수"],
    },
    "조석·조류·해류": {
        "조석": ["조석", "만조", "간조", "고조", "저조", "대조", "소조", "사리", "조금", "조차"],
        "조류": ["조류", "창조", "낙조", "정조", "게류", "유향", "유속"],
        "해류": ["해류", "표층 해류", "밀도차", "코리올리"],
    },
    "항해·해도·항로표지": {
        "해도": ["해도", "수로서지", "항행통보", "항로지", "수심", "저질", "암초", "간출", "나침도", "편차", "자차"],
        "항로표지": ["항로표지", "등대", "부표", "등부표", "IALA", "측방표지", "방위표지", "등색", "등질", "교량표"],
        "GPS": ["GPS", "DGPS", "위성항법"],
        "레이더": ["레이더", "허상", "최소탐지거리", "분해능", "스캐너"],
        "나침반": ["나침반", "컴퍼스", "마그네틱", "방위측정"],
        "항법": ["방위", "위치선", "중시선", "교차방위", "침로", "선위", "항정", "항정선", "대권", "속력", "항주거리", "도플러", "포인트", "항적", "육분의"],
        "등화": ["등화", "현등", "선미등", "마스트등", "전주등", "섬광등", "형상물"],
        "음향신호": ["음향신호", "기적신호", "단음", "장음", "무중신호", "주의환기"],
        "충돌예방항법": ["횡단", "마주치는", "추월", "피항선", "유지선", "좁은 수로", "통항분리", "제한된 시계", "안전한 속력", "선박 사이의 책무"],
    },
    "선박 조종술 및 운용": {
        "선체구조": ["선체", "선수", "선미", "좌현", "우현", "흘수", "건현", "전폭", "전장", "복원", "저항", "킬", "트림"],
        "요트의장": ["세일", "돛", "마스트", "붐", "지브", "집세일", "메인세일", "스피니커", "배튼", "그로밋", "텔테일"],
        "범주": ["범주", "태킹", "자이브", "풍상", "풍하", "빔리치", "브로드리치", "클로스홀드", "리핑", "세일트림"],
        "조종": ["조종", "조타", "선회", "전진", "후진", "프로펠러", "킥", "횡거", "종거", "배출류", "흡입류", "미드 십", "키(rudder)", "러더"],
        "접안·계류": ["접안", "이안", "계류", "계선", "닻", "투묘", "묘박", "로프", "매듭", "볼라드", "비트", "무어링"],
        "악천후운용": ["해묘", "스톰앵커", "히브투", "스커딩", "브로칭", "황천", "강풍", "전복"],
        "선내관리": ["식품", "식수", "위생", "냉장", "보관"],
    },
    "기관 및 정비": {
        "기관기초": ["기관", "엔진", "내연기관", "디젤", "가솔린", "2행정", "4행정", "피스톤", "플라이휠", "열효율"],
        "연료계통": ["연료", "연료유", "연료탱크", "연료필터", "연료펌프", "인젝터", "기화기", "옥탄가"],
        "냉각계통": ["냉각", "냉각수", "임펠러", "원심펌프", "서모스탯", "수온조절기", "플러싱"],
        "윤활계통": ["윤활", "윤활유", "엔진오일", "기어오일", "오일", "유압", "섬프"],
        "전기·점화": ["전기", "전류", "전원", "점화", "점화플러그", "배터리", "축전지", "퓨즈", "시동모터", "마그네틱스위치", "멀티테스터", "전원 회로"],
        "기관고장": ["고장", "과열", "오버히트", "출력", "정지", "소음", "진동", "과부하", "급정지", "압력 저하"],
    },
    "구명·조난·소방": {
        "구명설비": ["구명조끼", "구명부환", "구명뗏목", "구명줄", "구명줄발사기", "드로우백", "수압이탈", "보온구", "라이프라인"],
        "조난신호": ["조난신호", "신호홍염", "발연부", "로켓낙하산", "EPIRB", "GMDSS", "조난통신", "조난호출", "MAYDAY", "A1 해역", "A2 해역", "A3 해역", "A4 해역", "NAVTEX"],
        "소방": ["화재", "소화기", "유류화재", "B급", "C급", "소방", "진압"],
        "사고대응": ["조난", "비상", "전복", "침몰", "침수", "좌초", "임의좌주", "선박충돌", "사고대응"],
    },
    "응급처치·인명구조": {
        "인명구조": ["인명구조", "익수", "물에 빠진", "구조활동", "맨몸구조", "인간사슬", "구조자의 안전", "구조현장", "생존수영"],
        "응급처치": ["응급", "출혈", "지혈", "골절", "부목", "화상", "동상", "저체온", "쇼크", "감염", "기도폐쇄", "하임리히"],
        "CPR·AED": ["심폐소생", "CPR", "AED", "자동심장충격기", "가슴압박", "흉부압박", "인공호흡", "심정지", "심실세동"],
    },
    "법규·행정": {
        "면허·교육": ["면허", "조종면허", "필기시험", "실기시험", "시험대행", "안전교육", "결격", "갱신", "발급", "재발급"],
        "등록·검사": ["등록", "등록번호판", "말소", "변경등록", "안전검사", "신규검사", "정기검사", "임시검사", "검사필증", "도면", "무선설비", "시험운항", "시험운항허가", "위치발신장치", "등록신청서", "직권으로 경정", "운항구역"],
        "사업·영업": ["수상레저사업", "사업자", "사업장", "영업구역", "영업", "등록기준", "비상구조선", "인명구조용 장비"],
        "운항규칙": ["원거리", "정원", "주취", "야간", "기상특보", "제한속력", "운항규칙", "사고사실", "활동신고", "수상레저안전법", "적용 배제", "야간 수상레저활동"],
        "항만·항로법규": ["선박의 입항", "출항", "무역항", "수상구역", "방파제", "계선", "정박", "항행장애물", "폐기물 투기", "해상교통안전법", "교통안전특정해역", "연안통항대", "보호수역", "해양수산부장관", "해양레저활동", "허가권자", "선박의 폭", "거대선", "고속여객선", "우선피항선"],
        "해양환경법규": ["해양환경관리법", "선박오염방지규칙", "폐기물", "폐유", "분뇨", "오염", "방제", "배출", "유해액체물질", "방오도료", "영해기선", "기름여과장치", "플라스틱", "명예해양환경감시원", "해양환경"],
        "전파·무선통신법규": ["전파", "무선국", "무선설비", "MMSI", "집단호출", "통신장비", "긴급통신", "VHF", "채널 16"],
        "벌칙·행정처분": ["과태료", "벌금", "징역", "벌칙", "처분", "취소", "정지", "과징금", "업무정지", "지정취소"],
    },
}


def load_questions():
    source = QUESTIONS_TS.read_text(encoding="utf-8")
    array = source.split("export const questions: Question[] = ", 1)[1].rsplit("\n];", 1)[0] + "\n]"
    return json.loads(array)


def text_of(q):
    answer_text = ""
    if isinstance(q.get("answer"), int) and 0 <= q["answer"] < len(q.get("choices", [])):
        answer_text = q["choices"][q["answer"]]
    return " ".join([q["question"], " ".join(q["choices"]), answer_text, q.get("explanation", "")]).lower()


def hits(text, words):
    return [word for word in words if word.lower() in text]


def flatten_words(category):
    words = []
    for sub_words in SUB_RULES[category].values():
        words.extend(sub_words)
    return words


def score(text, category):
    return sum(len(hits(text, words)) for words in SUB_RULES[category].values())


def pick_sub_detail(text, category):
    best_sub = None
    best_hits = []
    for sub, words in SUB_RULES[category].items():
        sub_hits = hits(text, words)
        if len(sub_hits) > len(best_hits):
            best_sub = sub
            best_hits = sub_hits
    if best_sub is None:
        best_sub = next(iter(SUB_RULES[category]))
    detail = best_sub
    if category == "항해·해도·항로표지" and best_sub in {"등화", "음향신호", "충돌예방항법"}:
        detail = best_sub
    elif category == "법규·행정" and best_sub == "해양환경법규":
        detail = "오염방지·배출기준"
    elif category == "법규·행정" and best_sub == "전파·무선통신법규":
        detail = "무선설비·통신규정"
    return best_sub, detail, best_hits


def dedupe(items):
    seen = set()
    result = []
    for item in items:
        item = str(item).strip()
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def has_any(text, category):
    return score(text, category) > 0


def classify(q):
    text = text_of(q)
    scores = {category: score(text, category) for category in CATEGORIES}

    # Strong medical first.
    if hits(text, SUB_RULES["응급처치·인명구조"]["CPR·AED"]):
        category = "응급처치·인명구조"
    elif len(hits(text, SUB_RULES["응급처치·인명구조"]["응급처치"])) >= 1:
        category = "응급처치·인명구조"
    elif len(hits(text, SUB_RULES["응급처치·인명구조"]["인명구조"])) >= 1 and scores["법규·행정"] < 3:
        category = "응급처치·인명구조"
    # Distress/lifesaving/fire.
    elif scores["구명·조난·소방"] >= 1 and scores["법규·행정"] < 3:
        category = "구명·조난·소방"
    # Administrative law should win for registration/inspection/business/environment/regulatory questions.
    elif scores["법규·행정"] >= 2 and not (
        scores["항해·해도·항로표지"] >= 2 and any(w in text for w in ["등화", "음향신호", "기적신호", "피항선", "유지선", "추월", "횡단"])
    ):
        category = "법규·행정"
    # Engine.
    elif scores["기관 및 정비"] >= 1:
        category = "기관 및 정비"
    # Tide/current separate from weather.
    elif scores["조석·조류·해류"] >= 1:
        category = "조석·조류·해류"
    elif scores["기상 및 해양환경"] >= 1:
        category = "기상 및 해양환경"
    elif scores["항해·해도·항로표지"] >= 1:
        category = "항해·해도·항로표지"
    elif scores["선박 조종술 및 운용"] >= 1:
        category = "선박 조종술 및 운용"
    else:
        # Last resort: infer from content words; keep it explicit in tags.
        if "요트" in text or "세일" in text:
            category = "선박 조종술 및 운용"
        elif "법" in text or "시행" in text:
            category = "법규·행정"
        else:
            category = "선박 조종술 및 운용"

    # Fix law-vs-practical navigation boundaries.
    if category == "법규·행정" and any(w in text for w in ["등화", "음향신호", "기적신호", "단음", "장음", "현등", "마스트등", "선미등", "전주등", "피항선", "유지선", "마주치는", "횡단", "추월", "제한된 시계", "안전한 속력"]):
        if not any(w in text for w in ["과태료", "벌금", "징역", "처분", "허가권자", "고시하여야", "해양레저활동 금지구역"]):
            category = "항해·해도·항로표지"

    # Weather-environment law words must stay law if they are about legal disposal/reporting.
    if any(w in text for w in ["해양환경관리법", "선박오염방지규칙", "폐기물", "폐유", "분뇨", "오염물질", "방제의무", "영해기선", "유해액체물질", "방오도료", "기름여과장치"]):
        category = "법규·행정"

    # Wireless distress vs legal equipment.
    if "무선설비" in text and ("설치가 제외" in text or "시행규칙" in text):
        category = "법규·행정"
    elif any(w in text for w in ["조난통신", "조난호출", "a1 해역", "a2 해역", "a3해역", "a4 해역", "navtex"]):
        category = "구명·조난·소방"

    sub, detail, tag_hits = pick_sub_detail(text, category)
    tags = tag_hits + hits(text, flatten_words(category))
    tags = dedupe(tags)[:6]
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
    ids = [int(r["id"]) for r in rows]
    errors = []
    if len(rows) != 700:
        errors.append(f"row count {len(rows)} != 700")
    if sorted(ids) != list(range(1, 701)):
        errors.append("ids are not exactly 1..700")
    if len(ids) != len(set(ids)):
        errors.append("duplicate ids exist")
    allowed = set(CATEGORIES)
    invalid = [r for r in rows if r["category"] not in allowed]
    if invalid:
        errors.append(f"invalid categories: {invalid[:5]}")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty = [r["id"] for r in rows if not str(r[field]).strip()]
        if empty:
            errors.append(f"empty {field}: {empty[:20]}")
    return errors


def suspicion(row, q):
    text = text_of(q)
    category = row["category"]
    reasons = []
    if score(text, category) == 0:
        reasons.append("분류 카테고리 핵심 키워드 미검출")
    if category == "법규·행정" and any(w in text for w in ["등화", "음향신호", "기적신호", "피항선", "유지선"]) and not any(w in text for w in ["과태료", "벌금", "처분", "허가", "선박의 입항", "출항 등에 관한 법률"]):
        reasons.append("실무 항법 문제가 법규로 분류되었을 가능성")
    if category in {"기상 및 해양환경", "조석·조류·해류"} and any(w in text for w in ["해양환경관리법", "선박오염방지규칙", "폐기물", "오염물질"]):
        reasons.append("해양환경 법규 문제가 자연환경으로 분류되었을 가능성")
    return reasons


def read_v2_counts():
    if not V2_CSV.exists():
        return {}
    with V2_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        return dict(Counter(row["category"] for row in csv.DictReader(f)))


def write_report(rows, validation, v2_counts):
    cat_counts = Counter(r["category"] for r in rows)
    sub_counts = Counter((r["category"], r["subCategory"]) for r in rows)
    tag_counts = Counter(tag for r in rows for tag in r["tags"].split("|") if tag)

    lines = [
        "# Blue Marina 학습체계 v3 보고서",
        "",
        "## 포함/제외 기준",
        "",
    ]
    for category in CATEGORIES:
        lines.extend([
            f"### {category}",
            f"- 포함: {POLICY[category]['include']}",
            f"- 제외: {POLICY[category]['exclude']}",
            "",
        ])
    lines.extend(["## 카테고리별 문항 수", ""])
    for category in CATEGORIES:
        lines.append(f"- {category}: {cat_counts[category]}")
    lines.extend(["", "## 중분류별 문항 수", ""])
    for (category, sub), count in sorted(sub_counts.items()):
        lines.append(f"- {category} / {sub}: {count}")
    lines.extend(["", "## 상위 태그 TOP30", ""])
    for tag, count in tag_counts.most_common(30):
        lines.append(f"- {tag}: {count}")
    lines.extend(["", "## 검증", ""])
    if validation["errors"]:
        lines.append("- 오류: " + "; ".join(validation["errors"]))
    else:
        lines.append("- 700행/id 1~700/중복 없음/빈 값 없음/허용 category 검증 PASS")
    lines.append(f"- 자동 오분류 의심 문항: {validation['suspiciousCount']}")
    if validation["suspicious"]:
        for item in validation["suspicious"][:50]:
            lines.append(f"  - {item['id']}: {', '.join(item['reasons'])}")
    lines.extend(["", "## v2 대비 차이점", ""])
    if v2_counts:
        lines.append("- v2는 5대 대분류, v3는 8대 최종 커리큘럼으로 재설계")
        lines.append("- 조석·조류·해류를 기상과 분리")
        lines.append("- 구명·조난·소방과 응급처치·인명구조를 분리")
        lines.append("- 법규·행정에서 해양환경법규/전파·무선통신법규를 별도 중분류로 관리")
        lines.append("")
        lines.append("### v2 카테고리 수")
        for key, value in v2_counts.items():
            lines.append(f"- {key}: {value}")
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main():
    questions = load_questions()
    rows = [classify(q) for q in questions]
    errors = validate(rows)
    q_by_id = {int(q["id"]): q for q in questions}
    suspicious = []
    for row in rows:
        reasons = suspicion(row, q_by_id[int(row["id"])])
        if reasons:
            suspicious.append({"id": int(row["id"]), "reasons": reasons, "category": row["category"]})

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "category", "subCategory", "detailCategory", "tags"])
        writer.writeheader()
        writer.writerows(rows)

    validation = {
        "rows": len(rows),
        "categoryCounts": dict(Counter(r["category"] for r in rows)),
        "subCategoryCounts": {f"{k[0]} / {k[1]}": v for k, v in Counter((r["category"], r["subCategory"]) for r in rows).items()},
        "topTags": dict(Counter(tag for r in rows for tag in r["tags"].split("|") if tag).most_common(30)),
        "errors": errors,
        "suspiciousCount": len(suspicious),
        "suspicious": suspicious,
    }
    OUT_JSON.write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(rows, validation, read_v2_counts())
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    print(f"wrote {OUT_CSV}")
    print(f"wrote {OUT_MD}")


if __name__ == "__main__":
    main()
