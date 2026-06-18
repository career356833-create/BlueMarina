import csv
import json
import sys

start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
end = int(sys.argv[2]) if len(sys.argv) > 2 else start + 50

with open("work/questions.json", encoding="utf-8") as f:
    questions = {q["id"]: q for q in json.load(f)}

with open("src/data/question-category-map.csv", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

for row in rows:
    qid = int(row["id"])
    if start <= qid <= end:
        q = questions[qid]
        print(
            f"{qid}: {row['category']} / {row['subCategory']} / {row['detailCategory']} / {row['tags']} | "
            f"{q['question'][:90]}"
        )
