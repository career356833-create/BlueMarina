/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const qc = JSON.parse(fs.readFileSync(path.join(root, "work/generated-explanations-qc.json"), "utf8"));
const generated = JSON.parse(fs.readFileSync(path.join(root, "work/generated-explanations.json"), "utf8"));

const targets = [
  ["general", 293],
  ["yacht", 108],
  ["yacht", 330],
  ["yacht", 350],
  ["yacht", 539],
  ["yacht", 576],
  ["yacht", 610],
  ["yacht", 624]
];

const qcMap = new Map(qc.results.map((item) => [`${item.licenseType}:${item.id}`, item]));
const generatedMap = new Map(generated.explanations.map((item) => [`${item.licenseType}:${item.id}`, item]));

function escapeTable(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function manualPoint(item) {
  const reasons = [...(item.reasons || []), ...(item.warnings || [])].join(" / ");
  if (item.status === "reject") {
    return "초안은 그대로 반영하지 말고 새로 줄여 작성해야 합니다. 특히 등대 등질, 주기, 높이, 광달거리 같은 표기와 수치 의미를 원문 문제 기준으로 대조해야 합니다.";
  }
  if (reasons.includes("문장 수 기준")) {
    return "초안의 핵심은 유지하되 2~5문장으로 줄이고, 정답 판단에 꼭 필요한 조건만 남겨야 합니다.";
  }
  if (reasons.includes("수치")) {
    return "정답 보기 안의 수치·기간·표기 기준이 실제 문제 의도와 맞는지 확인해야 합니다. 불확실한 수치는 해설에서 추가 단정하지 말고 보기 기준으로 설명하는 방식이 안전합니다.";
  }
  if (reasons.includes("카테고리 핵심어")) {
    return "해설이 카테고리 핵심 개념과 충분히 연결되는지 확인하고, 문제의 실제 쟁점에 맞는 용어로 다시 좁혀야 합니다.";
  }
  return "문제 조건, 정답 보기, 오답 보기의 차이를 사람이 한 번 더 읽고 반영 여부를 결정해야 합니다.";
}

const summaryRows = [];
const sections = [];

for (const [licenseType, id] of targets) {
  const key = `${licenseType}:${id}`;
  const item = qcMap.get(key);
  const generatedItem = generatedMap.get(key);
  if (!item || !generatedItem) throw new Error(`Missing review item: ${key}`);

  const reasons = [...(item.reasons || []), ...(item.warnings || [])];
  summaryRows.push(
    `| ${licenseType} | ${id} | ${escapeTable(item.category)} | ${item.status} | ${escapeTable(reasons.join(" / "))} |`
  );

  sections.push(`## ${licenseType} #${id}

- licenseType: ${licenseType}
- id: ${id}
- category: ${item.category}
- subCategory: ${item.subCategory}
- tags: ${(item.tags || []).join(", ")}
- answer: ${item.answer} / ${generatedItem.answerText}
- QC 판정: ${item.status}
- QC 사유: ${reasons.join(" / ") || "없음"}
- 수동 검토 필요 포인트: ${manualPoint(item)}

### Question

${item.question}

### Choices

${(item.choices || []).map((choice, index) => `${index}. ${choice}`).join("\n")}

### 기존 generatedExplanation

${item.generatedExplanation}
`);
}

const md = `# Blue Marina 남은 해설 누락 8문항 수동 검토 자료

생성일: ${new Date().toISOString()}

## 작업 원칙

- 원본 문제 데이터는 수정하지 않았습니다.
- 해설을 반영하지 않았습니다.
- QC에서 ready가 아닌 8개 문항만 검토 대상으로 정리했습니다.

## 요약

| licenseType | id | category | QC 판정 | QC 사유 |
| --- | --- | --- | --- | --- |
${summaryRows.join("\n")}

${sections.join("\n")}
`;

fs.writeFileSync(path.join(root, "docs/remaining-8-explanations-review.md"), md, "utf8");
console.log(JSON.stringify({ file: "docs/remaining-8-explanations-review.md", count: targets.length }, null, 2));
