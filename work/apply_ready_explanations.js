/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function extractArrayAfter(source, marker) {
  const startMarker = source.indexOf(marker);
  if (startMarker < 0) throw new Error(`Missing ${marker}`);

  const eq = source.indexOf("=", startMarker);
  const arrStart = source.indexOf("[", eq);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = arrStart; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(arrStart, i + 1);
    }
  }

  throw new Error(`Could not parse array after ${marker}`);
}

function evalArray(arrayLiteral) {
  return Function(`"use strict"; return (${arrayLiteral});`)();
}

function loadQuestions(file, name) {
  return evalArray(extractArrayAfter(read(file), `export const ${name}`));
}

function missingStatus(value) {
  if (value === undefined || value === null) return "missing_property";
  const text = String(value).trim();
  if (!text) return "empty_string";
  const normalized = text.replace(/\s+/g, " ");
  if (["해설 없음", "없음", "-", "해설없음", "해설 없음.", "N/A", "n/a", "NA", "없다"].includes(normalized)) {
    return "non_explanation_placeholder";
  }
  return "present";
}

function cloneStableQuestion(q) {
  return {
    id: q.id,
    licenseType: q.licenseType,
    question: q.question,
    choices: q.choices,
    answer: q.answer,
    category: q.category,
    subCategory: q.subCategory,
    detailCategory: q.detailCategory,
    tags: q.tags
  };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function serializeQuestions(exportName, questions) {
  return `import type { Question } from "./questions";\n\nexport const ${exportName}: Question[] = ${JSON.stringify(questions, null, 2)};\n`;
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

const qc = JSON.parse(read("work/generated-explanations-qc.json"));
const generated = JSON.parse(read("work/generated-explanations.json"));
const generatedMap = new Map(generated.explanations.map((item) => [`${item.licenseType}:${item.id}`, item]));
const readyItems = qc.results.filter((item) => item.status === "ready");
const blockedItems = qc.results.filter((item) => item.status !== "ready");
const readyMap = new Map();

for (const item of readyItems) {
  const generatedItem = generatedMap.get(`${item.licenseType}:${item.id}`);
  if (!generatedItem) throw new Error(`Generated explanation missing for ${item.licenseType}:${item.id}`);
  readyMap.set(`${item.licenseType}:${item.id}`, generatedItem.generatedExplanation);
}

const generalBefore = loadQuestions("src/data/general-questions.ts", "generalQuestions");
const yachtBefore = loadQuestions("src/data/yacht-questions.ts", "yachtQuestions");
const beforeByKey = new Map([...generalBefore, ...yachtBefore].map((q) => [`${q.licenseType}:${q.id}`, q]));
const stableBefore = new Map([...generalBefore, ...yachtBefore].map((q) => [`${q.licenseType}:${q.id}`, cloneStableQuestion(q)]));

function applyToList(list) {
  let changed = 0;
  const appliedKeys = [];
  for (const q of list) {
    const key = `${q.licenseType}:${q.id}`;
    const explanation = readyMap.get(key);
    if (!explanation) continue;
    q.explanation = explanation;
    changed += 1;
    appliedKeys.push(key);
  }
  return { changed, appliedKeys };
}

const generalApply = applyToList(generalBefore);
const yachtApply = applyToList(yachtBefore);

write("src/data/general-questions.ts", serializeQuestions("generalQuestions", generalBefore));
write("src/data/yacht-questions.ts", serializeQuestions("yachtQuestions", yachtBefore));

const generalAfter = loadQuestions("src/data/general-questions.ts", "generalQuestions");
const yachtAfter = loadQuestions("src/data/yacht-questions.ts", "yachtQuestions");
const afterAll = [...generalAfter, ...yachtAfter];
const afterByKey = new Map(afterAll.map((q) => [`${q.licenseType}:${q.id}`, q]));

const integrityIssues = [];
for (const [key, beforeStable] of stableBefore.entries()) {
  const after = afterByKey.get(key);
  if (!after) {
    integrityIssues.push({ key, issue: "문항이 사라짐" });
    continue;
  }
  if (!sameJson(beforeStable, cloneStableQuestion(after))) {
    integrityIssues.push({ key, issue: "explanation 외 필드 변경 감지" });
  }
}

const readyNotApplied = [];
for (const item of readyItems) {
  const key = `${item.licenseType}:${item.id}`;
  const after = afterByKey.get(key);
  const expected = readyMap.get(key);
  if (!after || after.explanation !== expected) readyNotApplied.push(key);
}

const blockedChanged = [];
for (const item of blockedItems) {
  const key = `${item.licenseType}:${item.id}`;
  const before = beforeByKey.get(key);
  const after = afterByKey.get(key);
  if (!before || !after) {
    blockedChanged.push({ key, issue: "문항 누락" });
    continue;
  }
  if (before.explanation !== after.explanation) {
    blockedChanged.push({ key, issue: "needs-review/reject explanation 변경됨" });
  }
}

const missingAfter = afterAll
  .filter((q) => missingStatus(q.explanation) !== "present")
  .map((q) => ({
    licenseType: q.licenseType,
    id: q.id,
    category: q.category,
    status: missingStatus(q.explanation)
  }));

const counts = {
  total: afterAll.length,
  general: generalAfter.length,
  yacht: yachtAfter.length,
  readyTotal: readyItems.length,
  appliedTotal: generalApply.changed + yachtApply.changed,
  appliedGeneral: generalApply.changed,
  appliedYacht: yachtApply.changed,
  blockedTotal: blockedItems.length,
  needsReview: qc.results.filter((item) => item.status === "needs-review").length,
  reject: qc.results.filter((item) => item.status === "reject").length,
  missingAfter: missingAfter.length
};

const blockedRows = blockedItems.map((item) => ({
  "상태": item.status,
  "면허": item.licenseType,
  "ID": item.id,
  "카테고리": item.category,
  "사유": [...(item.reasons || []), ...(item.warnings || [])].join(" / ")
}));

const missingRows = missingAfter.map((item) => ({
  "면허": item.licenseType,
  "ID": item.id,
  "카테고리": item.category,
  "누락상태": item.status
}));

const report = `# Blue Marina 해설 보완 1차 반영 보고서

생성일: ${new Date().toISOString()}

## 반영 원칙

- QC 결과 \`ready\`인 161개만 반영했습니다.
- \`needs-review\` 7개와 \`reject\` 1개는 반영하지 않았습니다.
- \`question\`, \`choices\`, \`answer\`, \`category\`, \`subCategory\`, \`detailCategory\`, \`tags\`는 값 기준으로 변경되지 않았음을 검증했습니다.
- 원본 데이터 파일에서 \`explanation\` 필드만 갱신했습니다.

## 반영 통계

- 전체 문항 수: ${counts.total}
- 일반조종면허 문항 수: ${counts.general}
- 요트조종면허 문항 수: ${counts.yacht}
- ready 대상 수: ${counts.readyTotal}
- 실제 반영 수: ${counts.appliedTotal}
- 일반조종면허 반영 수: ${counts.appliedGeneral}
- 요트조종면허 반영 수: ${counts.appliedYacht}
- 미반영 대상 수: ${counts.blockedTotal}
- 남은 해설 누락 수: ${counts.missingAfter}

## 무결성 검증

- 전체 1,400문항 유지: ${counts.total === 1400 ? "PASS" : "FAIL"}
- 일반 700문항 유지: ${counts.general === 700 ? "PASS" : "FAIL"}
- 요트 700문항 유지: ${counts.yacht === 700 ? "PASS" : "FAIL"}
- ready 161개 explanation 반영: ${readyNotApplied.length === 0 ? "PASS" : "FAIL"}
- needs-review/reject 미반영: ${blockedChanged.length === 0 ? "PASS" : "FAIL"}
- explanation 외 필드 변경 없음: ${integrityIssues.length === 0 ? "PASS" : "FAIL"}

## 미반영 needs-review/reject 목록

${mdTable(blockedRows, ["상태", "면허", "ID", "카테고리", "사유"])}

## 남은 해설 누락 목록

${mdTable(missingRows, ["면허", "ID", "카테고리", "누락상태"])}

## 상세 검증 이슈

- ready 미반영: ${readyNotApplied.length ? readyNotApplied.join(", ") : "없음"}
- blocked 변경: ${blockedChanged.length ? JSON.stringify(blockedChanged) : "없음"}
- 무결성 이슈: ${integrityIssues.length ? JSON.stringify(integrityIssues.slice(0, 20)) : "없음"}
`;

write("docs/explanation-apply-report.md", report);

console.log(JSON.stringify({
  counts,
  integrityIssues: integrityIssues.length,
  readyNotApplied,
  blockedChanged,
  remainingMissing: missingAfter,
  report: "docs/explanation-apply-report.md"
}, null, 2));
