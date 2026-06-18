import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_JSON = ROOT / "work" / "questions.json"
MAP_CSV = ROOT / "src" / "data" / "question-category-map.csv"
OUT_JSON = ROOT / "work" / "category_audit_results.json"
OUT_MD = ROOT / "work" / "category_audit_report.md"


CATEGORIES = ["법규", "항해·기상", "선박운용", "기관", "안전·응급처치"]

RULES = {
    "법규": [
        "수상레저안전법", "해사안전법", "선박법", "선박안전법", "항만법", "법", "법령", "시행령", "규칙", "규정",
        "면허", "무면허", "조종면허", "등록", "검사", "안전검사", "과태료", "벌칙", "처벌", "취소", "정지",
        "신고", "허가", "승인", "제한", "금지", "명령", "위반", "행정", "관청", "해양경찰", "한국해양교통안전공단",
        "원거리 수상레저활동", "기구 등록", "동력수상레저기구 등록", "보험", "보험가입", "운항규칙", "속력 제한",
    ],
    "항해·기상": [
        "해도", "나침반", "컴퍼스", "방위", "진방위", "자방위", "상대방위", "위치", "위치선", "위도", "경도",
        "침로", "항로", "항해", "항법", "등대", "등부표", "부표", "표지", "항로표지", "등질", "등색",
        "조석", "조류", "해류", "창조", "낙조", "만조", "간조", "대조", "소조", "수심", "해면",
        "기상", "기압", "고기압", "저기압", "전선", "태풍", "안개", "해무", "시정", "파랑", "너울", "풍랑",
        "바람", "풍향", "풍속", "계절풍", "기온", "습도", "해륙풍", "특보", "주의보", "경보",
        "횡단상태", "마주침", "추월", "피항선", "유지선", "음향신호", "등화", "형상물", "선박 사이의 책무",
        "충돌", "충돌예방", "국제해상충돌예방규칙",
    ],
    "선박운용": [
        "조종", "운용", "운항", "출항", "입항", "접안", "이안", "계류", "묘박", "닻", "앵커", "로프",
        "매듭", "선체", "선수", "선미", "좌현", "우현", "흘수", "건현", "트림", "복원성", "선회", "후진",
        "정지거리", "타", "키", "핸들", "조타", "활주", "감속", "가속", "파도 타기", "예인", "견인",
        "프로펠러", "추진기", "스크루", "캐비테이션", "슬립", "선외기 틸트", "trim", "tilt",
    ],
    "기관": [
        "기관", "엔진", "내연기관", "가솔린", "디젤", "연료", "연료탱크", "윤활", "윤활유", "오일", "냉각",
        "냉각수", "임펠러", "펌프", "점화", "점화플러그", "플러그", "시동", "배터리", "축전지", "발전기",
        "전기", "퓨즈", "차단기", "기화기", "카뷰레터", "필터", "연료필터", "공기필터", "오버히트", "과열",
        "배기가스", "흡기", "압축", "폭발", "배기", "2행정", "4행정", "변속", "기어", "중립", "스로틀",
    ],
    "안전·응급처치": [
        "안전", "사고", "위험", "구조", "구명", "구명조끼", "구명부환", "인명", "익수", "물에 빠", "추락",
        "전복", "침수", "침몰", "조난", "비상", "응급", "응급처치", "심폐소생", "CPR", "인공호흡", "흉부압박",
        "출혈", "지혈", "골절", "화상", "저체온", "쇼크", "환자", "의식", "호흡", "맥박", "119", "소화기",
        "화재", "폭발", "유류화재", "피난", "대피", "인명구조", "안전장비", "항해 전 점검",
    ],
}

STRONG_RULES = {
    "기관": ["엔진", "기관", "연료", "윤활", "냉각", "임펠러", "점화", "플러그", "배터리", "오버히트", "기화기"],
    "안전·응급처치": ["응급처치", "심폐소생", "CPR", "흉부압박", "인공호흡", "출혈", "지혈", "골절", "화상", "저체온", "구조", "익수", "소화기", "화재"],
    "법규": ["수상레저안전법", "과태료", "벌칙", "처벌", "면허", "등록", "안전검사", "신고", "허가", "위반"],
}


def normalize_text(value):
    if isinstance(value, list):
        return " ".join(normalize_text(v) for v in value)
    return str(value or "").lower()


def keyword_hits(text, words):
    hits = []
    lower = text.lower()
    for word in words:
        if word.lower() in lower:
            hits.append(word)
    return hits


def suggest_category(question):
    text = normalize_text([question["question"], question["choices"], question.get("explanation", "")])
    scores = {}
    hits_by_cat = {}
    for category, words in RULES.items():
        hits = keyword_hits(text, words)
        strong_hits = keyword_hits(text, STRONG_RULES.get(category, []))
        score = len(hits) + 2 * len(strong_hits)
        scores[category] = score
        hits_by_cat[category] = sorted(set(hits), key=hits.index)

    # Collision-prevention rule is usually studied as navigation, not general statute.
    if any(word in text for word in ["횡단상태", "마주침", "추월", "피항선", "유지선", "음향신호", "등화", "형상물"]):
        scores["항해·기상"] += 5
    if "수상레저안전법" in text or "조종면허" in text:
        scores["법규"] += 5
    if any(word in text for word in ["응급처치", "심폐소생", "인공호흡", "흉부압박"]):
        scores["안전·응급처치"] += 6
    if any(word in text for word in ["엔진", "기관", "연료", "냉각", "윤활", "점화", "임펠러"]):
        scores["기관"] += 6

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best, best_score = ordered[0]
    second, second_score = ordered[1]
    confidence = best_score - second_score
    if best_score == 0:
        return None, scores, hits_by_cat, 0
    return best, scores, hits_by_cat, confidence


def read_map():
    with MAP_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        mapping = {}
        for row in reader:
            mapping[int(row["id"])] = {
                "category": row["category"].strip(),
                "subCategory": row["subCategory"].strip(),
                "detailCategory": row["detailCategory"].strip(),
                "tags": [tag.strip() for tag in re.split(r"[|,]", row["tags"]) if tag.strip()],
            }
        return mapping


def main():
    questions = json.loads(QUESTIONS_JSON.read_text(encoding="utf-8"))
    mapping = read_map()
    merged = []
    suspicious = []

    for q in questions:
        m = mapping[q["id"]]
        q2 = {**q, **m}
        suggestion, scores, hits, confidence = suggest_category(q2)
        q2["suggestedCategory"] = suggestion
        q2["scores"] = scores
        q2["hits"] = hits
        q2["confidence"] = confidence
        merged.append(q2)

        current = m["category"]
        if suggestion and suggestion != current and scores[suggestion] >= 3 and confidence >= 2:
            suspicious.append({
                "id": q["id"],
                "current": current,
                "currentFull": f'{current} > {m["subCategory"]} > {m["detailCategory"]} > {", ".join(m["tags"])}',
                "suggested": suggestion,
                "scores": scores,
                "hits": hits[suggestion],
                "question": q["question"],
                "choices": q["choices"],
                "explanation": q.get("explanation", ""),
            })

    current_counts = Counter(q["category"] for q in merged)
    suggested_counts = Counter(q["suggestedCategory"] or q["category"] for q in merged)
    sub_count = len({q["subCategory"] for q in merged})
    detail_count = len({q["detailCategory"] for q in merged})
    tag_count = len({tag for q in merged for tag in q["tags"]})

    result = {
        "total": len(merged),
        "currentCounts": dict(current_counts),
        "suggestedCounts": dict(suggested_counts),
        "subCategoryCount": sub_count,
        "detailCategoryCount": detail_count,
        "tagCount": tag_count,
        "suspiciousCount": len(suspicious),
        "suspicious": suspicious,
    }
    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append(f"# Category audit report")
    lines.append("")
    lines.append(f"- total: {len(merged)}")
    lines.append(f"- suspicious: {len(suspicious)}")
    lines.append(f"- subCategory count: {sub_count}")
    lines.append(f"- detailCategory count: {detail_count}")
    lines.append(f"- tag count: {tag_count}")
    lines.append("")
    lines.append("## Current counts")
    for c in CATEGORIES:
        lines.append(f"- {c}: {current_counts[c]}")
    lines.append("")
    lines.append("## Suggested counts")
    for c in CATEGORIES:
        lines.append(f"- {c}: {suggested_counts[c]}")
    lines.append("")
    lines.append("## Suspicious")
    for item in suspicious:
        lines.append(f"### {item['id']}")
        lines.append(f"- current: {item['currentFull']}")
        lines.append(f"- suggested: {item['suggested']}")
        lines.append(f"- hits: {', '.join(item['hits'])}")
        lines.append(f"- question: {item['question']}")
        lines.append(f"- explanation: {item['explanation']}")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({k: v for k, v in result.items() if k != "suspicious"}, ensure_ascii=False, indent=2))
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")


if __name__ == "__main__":
    main()
