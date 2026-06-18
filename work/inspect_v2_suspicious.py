import json
from pathlib import Path

source = Path("src/data/questions.ts").read_text(encoding="utf-8")
array_text = source.split("export const questions: Question[] = ", 1)[1].rsplit("\n];", 1)[0] + "\n]"
questions = {q["id"]: q for q in json.loads(array_text)}

ids = [130, 135, 137, 149, 153, 177, 182, 185, 251, 271, 339, 343, 346, 405, 456, 517, 542, 591, 593, 598, 606, 621, 660, 663, 666, 671, 674, 680, 685, 687, 688, 693, 696]

for qid in ids:
    q = questions[qid]
    print(f"\n{qid}: {q['question']}")
    print(f"choices: {q['choices']}")
    print(f"explanation: {q.get('explanation', '')[:300]}")
