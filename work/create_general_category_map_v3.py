from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path


V2_CSV = Path("src/data/question-category-map-general-v2.csv")
V3_CSV = Path("src/data/question-category-map-general-v3.csv")

ALLOWED_CATEGORIES = {
    "기상 및 해양환경",
    "조석·조류·해류",
    "항해·해도·항로표지",
    "선박 조종술 및 운용",
    "기관 및 정비",
    "구명·조난·소방",
    "응급처치·인명구조",
    "법규·행정",
}

PATCHES = {
    1: {
        "category": "항해·해도·항로표지",
        "subCategory": "등화",
        "detailCategory": "등화",
        "tags": "야간항행|등화식별|항해등|경계|파랑",
    },
    43: {
        "category": "구명·조난·소방",
        "subCategory": "사고대응",
        "detailCategory": "표류·구조요청",
        "tags": "연료고갈|표류|위치확인|구조요청|GPS",
    },
    46: {
        "category": "선박 조종술 및 운용",
        "subCategory": "운항",
        "detailCategory": "임의좌주·사고대응",
        "tags": "임의좌주|해안선정|이초|선체기울임|만조|간조",
    },
    143: {
        "category": "법규·행정",
        "subCategory": "운항규칙",
        "detailCategory": "기상특보 활동 제한",
        "tags": "수상레저안전법|기상특보|활동제한|운항규칙|신고예외",
    },
    453: {
        "category": "법규·행정",
        "subCategory": "면허·등록",
        "detailCategory": "동력수상레저기구 정의",
        "tags": "수상레저안전법|동력수상레저기구|법령상정의|무동력수상레저기구",
    },
    460: {
        "category": "법규·행정",
        "subCategory": "운항규칙",
        "detailCategory": "기상특보 활동 제한",
        "tags": "수상레저안전법|기상특보|활동신고|활동제한|신고예외",
    },
    547: {
        "category": "법규·행정",
        "subCategory": "운항규칙",
        "detailCategory": "안전장비 착용 지시",
        "tags": "수상레저안전법|안전장비|구명조끼|착용지시|행정기관권한",
    },
    590: {
        "category": "항해·해도·항로표지",
        "subCategory": "항법",
        "detailCategory": "좁은 수로 항법",
        "tags": "좁은수로|항행규칙|항법|우측항행|게류|역조",
    },
    654: {
        "category": "항해·해도·항로표지",
        "subCategory": "항법",
        "detailCategory": "선박 사이 책무",
        "tags": "진로우선권|선박사이책무|항법|흘수제약선|어로선|범선",
    },
    686: {
        "category": "법규·행정",
        "subCategory": "해양환경법규",
        "detailCategory": "해양환경관리법 용어 정의",
        "tags": "해양환경관리법|기름정의|석유제품|유성혼합물|폐유",
    },
}


def main() -> None:
    with V2_CSV.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    for row in rows:
        patch = PATCHES.get(int(row["id"]))
        if patch:
            row.update(patch)

    ids = [int(row["id"]) for row in rows]
    errors: list[str] = []
    if len(rows) != 700:
        errors.append(f"row count is {len(rows)}")
    if ids != list(range(1, 701)):
        errors.append("ids are not continuous 1..700")
    if len(set(ids)) != 700:
        errors.append("duplicate ids exist")
    for field in ["category", "subCategory", "detailCategory", "tags"]:
        empty_ids = [row["id"] for row in rows if not row[field].strip()]
        if empty_ids:
            errors.append(f"empty {field}: {empty_ids[:20]}")
    bad_categories = [row["id"] for row in rows if row["category"] not in ALLOWED_CATEGORIES]
    if bad_categories:
        errors.append(f"bad categories: {bad_categories[:20]}")

    patched_ids = {int(row["id"]) for row in rows if int(row["id"]) in PATCHES}
    if patched_ids != set(PATCHES):
        errors.append(f"missing patched ids: {sorted(set(PATCHES) - patched_ids)}")

    for qid, expected in PATCHES.items():
        row = rows[qid - 1]
        for field, value in expected.items():
            if row[field] != value:
                errors.append(f"id {qid} field {field} not patched")

    if errors:
        raise SystemExit("\n".join(errors))

    with V3_CSV.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "category", "subCategory", "detailCategory", "tags"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"created={V3_CSV}")
    print("category_counts")
    counts = Counter(row["category"] for row in rows)
    for category in [
        "기상 및 해양환경",
        "조석·조류·해류",
        "항해·해도·항로표지",
        "선박 조종술 및 운용",
        "기관 및 정비",
        "구명·조난·소방",
        "응급처치·인명구조",
        "법규·행정",
    ]:
        print(f"{category}: {counts[category]}")
    print("patched_rows")
    for qid in sorted(PATCHES):
        row = rows[qid - 1]
        print(f"{qid}: {row['category']} / {row['subCategory']} / {row['detailCategory']} / {row['tags']}")


if __name__ == "__main__":
    main()
