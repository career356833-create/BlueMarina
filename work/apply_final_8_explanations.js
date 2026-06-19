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

function loadQuestions(file, exportName) {
  return evalArray(extractArrayAfter(read(file), `export const ${exportName}`));
}

function serializeQuestions(exportName, questions) {
  return `import type { Question } from "./questions";\n\nexport const ${exportName}: Question[] = ${JSON.stringify(questions, null, 2)};\n`;
}

function stable(q) {
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

function sentenceCount(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=다\.)\s+|(?<=요\.)\s+|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

const finalExplanations = {
  "general:293":
    "정답은 '기관이 1시간당 1마력을 얻기 위해 소비하는 연료량'입니다. 연료소비율은 단순히 한 시간 동안 쓴 전체 연료량이 아니라, 기관이 일정한 출력을 내는 데 필요한 연료의 양을 나타내는 개념입니다. 그래서 연료의 발열량이나 1실린더 기준 소비량과는 구분해야 합니다. 문제를 풀 때는 '1시간당 1마력'이라는 조건이 들어간 보기를 찾으면 됩니다.",
  "yacht:108":
    "정답은 '①느리고, ②빨라진다, ③베르누이정리, ④총합력'입니다. 세일 주위의 공기는 풍상측보다 풍하측에서 더 빠르게 흐르며, 이 압력 차이로 세일에 힘이 생깁니다. 이 원리를 설명하는 것이 베르누이정리이고, 세일에 작용하는 여러 힘을 합한 개념이 총합력입니다. 보일의 법칙이나 전진력·횡류력만으로 설명하는 보기는 이 문항의 흐름을 완전히 설명하지 못합니다.",
  "yacht:330":
    "정답은 'Fl. 8sec 20m 12M'입니다. 해도에서 Fl은 섬광등을 뜻하고, 8sec는 8초 주기, 20m는 등고, 12M은 광달거리를 나타냅니다. Occ는 엄폐등, F는 부동등, Al은 교색등을 뜻하므로 섬광등 조건과 맞지 않습니다. 이 문항은 등대 표기에서 등질 약어와 숫자의 의미를 함께 읽는 것이 핵심입니다.",
  "yacht:350":
    "정답은 '최대속도는 30노트 이상'입니다. 이 문항은 요트조종면허 실기시험에 사용하는 세일링요트 규격 중 옳지 않은 것을 고르는 문제입니다. 길이, 출력, 승선 정원 관련 보기는 문제은행에서 제시한 규격 조건에 해당하지만, 최대속도 30노트 이상은 해당 조건으로 보기 어렵습니다. 따라서 '옳지 않은 것'을 묻는 문제에서는 이 보기를 선택해야 합니다.",
  "yacht:539":
    "정답은 '해당 등록에 착오나 빠진 부분이 시장·군수·구청장의 잘못으로 인한 것인 경우 그 등록을 직권으로 경정하고 그 사실을 지체 없이 소유자 및 이해관계자에게 통지 한다'입니다. 이 문항은 등록 내용에 착오나 누락이 있을 때 누가, 어떤 사유에서, 언제 통지하는지를 묻습니다. 정답은 행정청의 잘못으로 인한 착오나 누락이면 직권으로 바로잡고 지체 없이 알린다는 흐름입니다. '3일 이내'나 행정청 잘못이 아닌 경우를 섞은 보기는 조건이 달라 오답입니다.",
  "yacht:576":
    "정답은 '방파제 외측'입니다. 문제의 출처 설명처럼 부두, 잔교, 안벽, 돌핀, 좁은 수로, 계류장 입구 부근 수역 등은 정박할 수 없는 수역으로 제시되어 있습니다. 반면 방파제 외측은 보기 중 정박 금지 수역으로 제시되지 않았으므로 정박이 가능한 곳으로 판단합니다. 이 문항은 정박이 금지되는 장소와 그렇지 않은 장소를 구분하는 문제입니다.",
  "yacht:610":
    "정답은 '통항분리수역 안에서 항행 안전을 유지하기 위한 작업을 하는 선박(조종성능제한 없음)은 통항분리수역의 출입구 부근에 정박할 수 있다.'입니다. 이 문항은 통항분리수역에서의 항행 방법 중 옳지 않은 설명을 고르는 문제입니다. 통항분리수역 출입구 부근은 선박 통항이 집중되는 곳이므로, 조종성능 제한이 없는 선박이 정박할 수 있다고 단정한 보기는 부적절합니다. 나머지 보기는 연안통항대 이용, 소형선·범선의 항행, 어로 선박의 방해 금지처럼 통항분리수역에서 구분해야 할 기본 원칙에 가깝습니다.",
  "yacht:624":
    "정답은 '수면에 떠 있는 상태로 항행 중인 선박은 마스트등, 현등, 선미등에 덧붙여 홍색의 섬광등 1개를 표시하여야 한다.'입니다. 항행 중인 일반 동력선은 기본적으로 마스트등, 현등, 선미등을 표시하는 것이 핵심입니다. 홍색 섬광등을 덧붙인다는 설명은 이 보기의 조건처럼 단순히 수면에 떠서 항행 중인 선박 전체에 적용되는 내용으로 보기 어렵습니다. 따라서 가장 옳지 않은 설명을 고르는 문제에서는 이 보기가 정답입니다."
};

const generalBefore = loadQuestions("src/data/general-questions.ts", "generalQuestions");
const yachtBefore = loadQuestions("src/data/yacht-questions.ts", "yachtQuestions");
const allBefore = [...generalBefore, ...yachtBefore];
const stableBefore = new Map(allBefore.map((q) => [`${q.licenseType}:${q.id}`, stable(q)]));

let applied = 0;
const appliedRows = [];
for (const q of allBefore) {
  const key = `${q.licenseType}:${q.id}`;
  const explanation = finalExplanations[key];
  if (!explanation) continue;
  q.explanation = explanation;
  applied += 1;
  appliedRows.push({
    "면허": q.licenseType,
    "ID": q.id,
    "카테고리": q.category,
    "문장 수": sentenceCount(explanation),
    "해설": explanation
  });
}

write("src/data/general-questions.ts", serializeQuestions("generalQuestions", generalBefore));
write("src/data/yacht-questions.ts", serializeQuestions("yachtQuestions", yachtBefore));

const generalAfter = loadQuestions("src/data/general-questions.ts", "generalQuestions");
const yachtAfter = loadQuestions("src/data/yacht-questions.ts", "yachtQuestions");
const allAfter = [...generalAfter, ...yachtAfter];

const stableIssues = [];
for (const q of allAfter) {
  const key = `${q.licenseType}:${q.id}`;
  const before = stableBefore.get(key);
  if (!before) {
    stableIssues.push({ key, issue: "new or missing before snapshot" });
    continue;
  }
  if (JSON.stringify(before) !== JSON.stringify(stable(q))) {
    stableIssues.push({ key, issue: "non-explanation field changed" });
  }
}

const missingAfter = allAfter
  .filter((q) => missingStatus(q.explanation) !== "present")
  .map((q) => ({
    licenseType: q.licenseType,
    id: q.id,
    category: q.category,
    status: missingStatus(q.explanation)
  }));

const untouchedUnexpected = [];
for (const q of allAfter) {
  const key = `${q.licenseType}:${q.id}`;
  const beforeExplanation = allBefore.find((item) => `${item.licenseType}:${item.id}` === key)?.explanation;
  if (!finalExplanations[key]) continue;
  if (q.explanation === beforeExplanation && missingStatus(beforeExplanation) !== "present") {
    untouchedUnexpected.push(key);
  }
}

const stats = {
  applied,
  total: allAfter.length,
  general: generalAfter.length,
  yacht: yachtAfter.length,
  missingAfter: missingAfter.length,
  stableIssues: stableIssues.length,
  untouchedUnexpected: untouchedUnexpected.length
};

const report = `# Blue Marina 해설 누락 최종 완료 보고서

생성일: ${new Date().toISOString()}

## 반영 원칙

- 남은 8문항의 \`explanation\` 필드만 수정했습니다.
- \`question\`, \`choices\`, \`answer\`, \`category\`, \`subCategory\`, \`detailCategory\`, \`tags\`는 값 기준으로 변경되지 않았음을 검증했습니다.
- commit, push, 배포는 수행하지 않았습니다.

## 반영 통계

- 최종 반영 문항 수: ${stats.applied}
- 전체 문항 수: ${stats.total}
- 일반조종면허 문항 수: ${stats.general}
- 요트조종면허 문항 수: ${stats.yacht}
- 최종 해설 누락 수: ${stats.missingAfter}

## 데이터 무결성 검증

- 전체 1,400문항 유지: ${stats.total === 1400 ? "PASS" : "FAIL"}
- 일반 700문항 유지: ${stats.general === 700 ? "PASS" : "FAIL"}
- 요트 700문항 유지: ${stats.yacht === 700 ? "PASS" : "FAIL"}
- 해설 누락 0개: ${stats.missingAfter === 0 ? "PASS" : "FAIL"}
- explanation 외 필드 변경 없음: ${stats.stableIssues === 0 ? "PASS" : "FAIL"}
- 대상 8문항 반영 확인: ${stats.applied === 8 && stats.untouchedUnexpected === 0 ? "PASS" : "FAIL"}

## 반영한 8문항

${mdTable(appliedRows, ["면허", "ID", "카테고리", "문장 수", "해설"])}

## 남은 누락 문항

${missingAfter.length ? mdTable(missingAfter, ["licenseType", "id", "category", "status"]) : "없음"}

## 무결성 이슈

${stableIssues.length ? JSON.stringify(stableIssues, null, 2) : "없음"}
`;

write("docs/explanation-final-completion-report.md", report);

console.log(JSON.stringify({ stats, missingAfter, report: "docs/explanation-final-completion-report.md" }, null, 2));
