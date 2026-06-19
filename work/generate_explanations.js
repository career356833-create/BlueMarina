/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function truncate(text, len = 80) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length > len ? `${s.slice(0, len)}...` : s;
}

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function pickAnswer(q) {
  const idx = Number(q.answer);
  return Array.isArray(q.choices) && idx >= 0 && idx < q.choices.length ? q.choices[idx] : "";
}

function hasAny(tags, words) {
  return tags.some((tag) => words.includes(tag));
}

function tagText(tags) {
  return tags.length ? tags.slice(0, 4).join(", ") : "문항의 핵심 개념";
}

function wrongChoiceHint(q) {
  const wrongs = (q.choices || []).filter((_, i) => i !== q.answer).slice(0, 3);
  if (!wrongs.length) {
    return "오답은 보기의 용어가 비슷해 보여도 문제에서 묻는 핵심 조건과 맞지 않습니다.";
  }

  return `오답 보기(${wrongs.join(", ")})는 관련 용어이거나 비슷한 상황이지만, 이 문항에서 묻는 ${tagText(q.tags || [])} 조건을 직접 충족하지 않습니다.`;
}

function makeExplanation(q) {
  const tags = q.tags || [];
  const answer = pickAnswer(q);
  const answerSentence = `정답은 '${answer}'입니다.`;

  if (hasAny(tags, ["세일", "돛", "메인세일", "지브", "풍상", "풍하", "요트"])) {
    return `${answerSentence} 이 문항은 요트의 세일과 돛 운용에서 바람의 방향, 선체의 자세, 돛의 역할을 함께 판단하는 문제입니다. 세일 관련 문제는 용어가 비슷해도 실제로 어느 돛을 조정하는지, 풍상과 풍하 중 어느 상황인지가 정답을 가릅니다. ${wrongChoiceHint(q)} 문제를 풀 때는 먼저 바람을 받는 방향과 배가 움직이려는 방향을 나누어 생각하면 헷갈림이 줄어듭니다.`;
  }

  if (hasAny(tags, ["기관", "엔진", "디젤기관", "가솔린기관", "시동모터", "과열"])) {
    return `${answerSentence} 기관 문제는 증상만 외우기보다 연료, 공기, 압축, 냉각, 윤활, 전기 계통 중 어느 부분의 이상인지 구분해야 합니다. 이 보기의 내용은 문항에서 묻는 기관 작동 원리나 고장 원인과 가장 직접적으로 연결됩니다. ${wrongChoiceHint(q)} 실제 점검 순서를 떠올리면 먼저 안전을 확보하고 원인 계통을 좁혀 가는 방식으로 판단할 수 있습니다.`;
  }

  if (hasAny(tags, ["연료", "연료계통", "연료필터", "기름"])) {
    return `${answerSentence} 연료계통 문제는 연료 공급이 막히거나 공기가 섞이거나 불순물이 유입될 때 나타나는 증상을 묻는 경우가 많습니다. 정답 보기는 연료가 엔진까지 안정적으로 전달되어야 한다는 핵심 원리와 맞습니다. ${wrongChoiceHint(q)} 비슷한 기관 고장 보기라도 냉각, 윤활, 전기 문제와 연료 공급 문제를 구분해서 보아야 합니다.`;
  }

  if (hasAny(tags, ["윤활", "윤활유", "엔진오일", "오일"])) {
    return `${answerSentence} 윤활계통은 엔진 내부 마찰과 열을 줄여 손상을 막는 역할을 합니다. 이 문항의 정답은 윤활유의 역할이나 이상 증상과 직접 연결되므로 가장 적절합니다. ${wrongChoiceHint(q)} 윤활 문제는 냉각수 부족이나 연료 부족과 증상이 비슷하게 느껴질 수 있으므로, 문제에서 묻는 계통을 먼저 확인해야 합니다.`;
  }

  if (hasAny(tags, ["냉각", "냉각수", "임펠러"])) {
    return `${answerSentence} 냉각계통은 엔진 과열을 막기 위해 열을 밖으로 배출하는 장치와 흐름을 다루는 영역입니다. 정답 보기는 냉각수 흐름 또는 냉각 장치 이상과 가장 잘 맞는 설명입니다. ${wrongChoiceHint(q)} 기관 문제에서 과열이 나오면 연료나 전기보다 냉각수, 임펠러, 흡입구 막힘 같은 원인을 우선 떠올리면 좋습니다.`;
  }

  if (hasAny(tags, ["바람", "풍향", "풍속", "계절풍", "해륙풍", "파랑", "너울"])) {
    return `${answerSentence} 이 문항은 바람이나 파랑이 항해 상황에 어떤 영향을 주는지 묻는 문제입니다. 정답은 문제의 조건에서 바람의 방향, 세기, 또는 수면 상태를 판단하는 기준과 가장 잘 맞습니다. ${wrongChoiceHint(q)} 기상 문제는 용어를 외우는 것보다 바람이 불어오는 방향과 배가 받는 영향을 함께 생각해야 정확히 풀 수 있습니다.`;
  }

  if (hasAny(tags, ["조석", "조류", "만조", "간조", "저조", "고조", "창조", "낙조"])) {
    return `${answerSentence} 조석과 조류 문제는 물높이의 변화와 물의 흐름을 구분하는 것이 핵심입니다. 이 보기의 내용은 만조·간조 또는 창조·낙조의 관계를 판단하는 데 가장 알맞습니다. ${wrongChoiceHint(q)} 특히 수심, 좌초 위험, 항해 가능 시간과 연결해 생각하면 정답을 고르기 쉽습니다.`;
  }

  if (hasAny(tags, ["면허", "조종면허", "실기시험", "필기시험", "안전교육", "발급"])) {
    return `${answerSentence} 면허 관련 문항은 취득, 시험, 안전교육, 발급 절차 중 어느 단계에 해당하는지를 묻는 경우가 많습니다. 정답 보기는 문제에서 요구하는 절차나 자격 조건과 가장 직접적으로 맞습니다. ${wrongChoiceHint(q)} 단계가 비슷해 보여도 필기시험, 실기시험, 안전교육, 면허증 발급을 순서대로 나누어 보면 오답을 줄일 수 있습니다.`;
  }

  if (hasAny(tags, ["등록", "변경등록", "말소", "안전검사", "검사"])) {
    return `${answerSentence} 등록과 검사 문제는 기구를 운항하기 전 필요한 행정 절차와 사후 변경 절차를 구분하는 것이 중요합니다. 이 보기는 등록, 변경, 말소, 검사 중 문제에서 묻는 단계와 가장 잘 대응됩니다. ${wrongChoiceHint(q)} 행정 절차 문제는 비슷한 용어가 많으므로 누가, 언제, 무엇을 해야 하는지 세 요소를 따로 확인해야 합니다.`;
  }

  if (hasAny(tags, ["해도", "수심", "방위", "항로표지", "등대", "등부표"])) {
    return `${answerSentence} 해도와 항로표지 문제는 위치, 수심, 위험물, 방향 정보를 읽어 안전한 항로를 판단하는 문제입니다. 정답 보기는 문제에서 제시한 해도 정보나 표지의 의미와 가장 잘 맞습니다. ${wrongChoiceHint(q)} 해도 문제는 숫자나 기호만 보지 말고, 그 정보가 실제 항행 중 어떤 위험을 알려 주는지 연결해서 판단해야 합니다.`;
  }

  if (hasAny(tags, ["등화", "현등", "선미등", "마스트등", "정박등", "전주등"])) {
    return `${answerSentence} 등화 문제는 야간이나 시계가 제한된 상황에서 상대 선박의 상태와 진행 방향을 판단하는 문제입니다. 정답 보기는 보이는 등화의 종류와 선박의 상태를 가장 정확히 설명합니다. ${wrongChoiceHint(q)} 색이나 등 이름만 외우기보다 어느 방향에서 보이는 등인지, 항행 중인지 정박 중인지 함께 판단해야 합니다.`;
  }

  if (hasAny(tags, ["음향신호", "기적", "장음", "단음"])) {
    return `${answerSentence} 음향신호 문제는 시계 제한, 좁은 수로, 추월, 변침 등 상황별 신호를 구분하는 것이 핵심입니다. 이 보기는 문제에서 제시한 조종 또는 경고 상황에 맞는 신호로 볼 수 있습니다. ${wrongChoiceHint(q)} 장음과 단음의 횟수만 외우기보다 어떤 행동을 알리는 신호인지 함께 기억해야 실수를 줄일 수 있습니다.`;
  }

  if (hasAny(tags, ["조난", "구조", "구명", "구명조끼", "구명부환", "신호홍염"])) {
    return `${answerSentence} 조난과 구명설비 문제는 상황에 맞는 장비를 선택하고 구조 요청을 안전하게 이어 가는 것이 핵심입니다. 정답 보기는 조난 상황에서 우선해야 할 행동 또는 장비의 목적과 가장 잘 맞습니다. ${wrongChoiceHint(q)} 장비 이름이 비슷해도 사람을 띄우는 장비인지, 위치를 알리는 신호인지, 구조를 기다리는 장비인지 구분해야 합니다.`;
  }

  if (hasAny(tags, ["소화", "화재", "연소", "소화기"])) {
    return `${answerSentence} 소방 문제는 불이 나는 원인과 불을 끄는 원리를 구분해야 합니다. 정답 보기는 연소 조건 또는 화재 대응 방법과 가장 직접적으로 연결됩니다. ${wrongChoiceHint(q)} 화재 상황에서는 당황해서 행동 순서를 놓치기 쉬우므로, 먼저 안전 확보와 적절한 소화 방법 선택을 떠올리면 됩니다.`;
  }

  if (hasAny(tags, ["응급처치", "심폐소생술", "CPR", "AED", "출혈", "골절", "화상", "저체온"])) {
    return `${answerSentence} 응급처치 문제는 환자의 상태를 먼저 파악하고 생명에 직접 영향을 주는 위험부터 처리하는 순서를 묻습니다. 정답 보기는 해당 증상이나 상황에서 가장 우선해야 할 처치와 맞습니다. ${wrongChoiceHint(q)} 처치 방법을 외울 때는 의식 확인, 호흡 확인, 구조 요청, 필요한 처치의 흐름으로 정리하면 좋습니다.`;
  }

  if (hasAny(tags, ["접안", "계류", "닻", "닻줄", "정박"])) {
    return `${answerSentence} 접안과 계류 문제는 배를 안전하게 멈추고 묶어 두기 위해 필요한 장비와 조작을 묻습니다. 정답 보기는 선박을 고정하거나 접안 상황을 판단하는 핵심 조건과 가장 잘 맞습니다. ${wrongChoiceHint(q)} 접안 문제는 속도, 바람, 조류, 줄의 역할을 함께 보아야 하며 한 가지 용어만 보고 판단하면 실수하기 쉽습니다.`;
  }

  if (hasAny(tags, ["추월", "횡단", "마주침", "피항선", "유지선", "항법"])) {
    return `${answerSentence} 항법 문제는 두 선박의 상대 위치와 진행 방향을 기준으로 피항 의무를 판단하는 것이 핵심입니다. 정답 보기는 문제에서 제시한 상황에서 적용해야 할 선박 사이의 책무와 가장 잘 맞습니다. ${wrongChoiceHint(q)} 먼저 마주침, 횡단, 추월 중 어떤 상황인지 구분한 뒤 어느 선박이 피해야 하는지 판단해야 합니다.`;
  }

  const category = q.category || "해당 분야";
  return `${answerSentence} 이 문항은 ${category} 영역에서 ${tagText(tags)} 개념을 묻는 문제입니다. 정답 보기는 문제의 조건과 가장 직접적으로 연결되는 설명이며, 핵심 용어의 의미를 정확히 알고 있어야 고를 수 있습니다. ${wrongChoiceHint(q)} 비슷한 보기가 섞여 있을 때는 문제에서 묻는 상황, 대상, 행동을 차례로 나누어 확인하는 것이 좋습니다.`;
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

const audit = JSON.parse(read("work/missing-explanations-audit.json"));
const yacht = loadQuestions("src/data/yacht-questions.ts", "yachtQuestions");
const general = loadQuestions("src/data/general-questions.ts", "generalQuestions");
const sourceMap = new Map([...general, ...yacht].map((q) => [`${q.licenseType}:${q.id}`, q]));
const importantTags = new Set(["세일", "돛", "기관", "엔진", "바람", "면허", "조종면허", "해도", "연료", "윤활"]);

const generated = [];
const mismatches = [];

for (const missing of audit.missingQuestions) {
  const key = `${missing.licenseType}:${missing.id}`;
  const source = sourceMap.get(key);
  if (!source) {
    mismatches.push({ key, reason: "source question not found" });
    continue;
  }

  const mismatchReasons = [];
  if (truncate(source.question, 80) !== missing.questionPreview) mismatchReasons.push("questionPreview mismatch");
  if (source.answer !== missing.answer) mismatchReasons.push("answer mismatch");
  if (JSON.stringify(source.choices) !== JSON.stringify(missing.choices)) mismatchReasons.push("choices mismatch");
  if (mismatchReasons.length) {
    mismatches.push({ key, reason: mismatchReasons.join(", "), audit: missing, sourcePreview: truncate(source.question, 80) });
  }

  const important = (source.tags || []).filter((tag) => importantTags.has(tag));
  generated.push({
    licenseType: source.licenseType,
    id: source.id,
    category: source.category,
    subCategory: source.subCategory,
    detailCategory: source.detailCategory,
    tags: source.tags || [],
    importantTags: important,
    needsPriorityReview: important.length > 0,
    question: source.question,
    choices: source.choices,
    answer: source.answer,
    answerText: pickAnswer(source),
    generatedExplanation: makeExplanation(source),
    reviewStatus: "draft",
    sourceExplanationStatus: missing.explanationStatus
  });
}

const byLicense = {};
const byCategory = {};
for (const item of generated) {
  inc(byLicense, item.licenseType);
  inc(byCategory, item.category || "(빈 category)");
}

const top50Keys = new Set(audit.top50Candidates.map((x) => `${x.licenseType}:${x.id}`));
const top50 = generated.filter((x) => top50Keys.has(`${x.licenseType}:${x.id}`)).sort((a, b) => {
  const ai = audit.top50Candidates.findIndex((x) => x.licenseType === a.licenseType && x.id === a.id);
  const bi = audit.top50Candidates.findIndex((x) => x.licenseType === b.licenseType && x.id === b.id);
  return ai - bi;
});

const output = {
  generatedAt: new Date().toISOString(),
  status: "review-draft",
  sourceAudit: "work/missing-explanations-audit.json",
  generationPolicy: [
    "원본 문제 데이터 미수정",
    "2~5문장 검토용 초안",
    "정답 이유와 오답 혼동 포인트 포함",
    "중요 태그 별도 표시"
  ],
  stats: {
    totalGenerated: generated.length,
    generalGenerated: byLicense.general || 0,
    yachtGenerated: byLicense.yacht || 0,
    generatedByCategory: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .map(([category, count]) => ({ category, count })),
    importantTaggedCount: generated.filter((x) => x.needsPriorityReview).length,
    top50Count: top50.length,
    mismatchCount: mismatches.length
  },
  dataMismatches: mismatches,
  explanations: generated
};

fs.writeFileSync(path.join(root, "work/generated-explanations.json"), JSON.stringify(output, null, 2), "utf8");

const categoryRows = output.stats.generatedByCategory.map((x) => ({ "카테고리": x.category, "생성 수": x.count }));
const allRows = generated.map((x) => ({
  "면허": x.licenseType,
  "ID": x.id,
  "카테고리": x.category,
  "중요": x.needsPriorityReview ? `중요(${x.importantTags.join(", ")})` : "",
  "정답": x.answerText,
  "초안 해설": x.generatedExplanation
}));
const top50Rows = top50.map((x, i) => ({
  "순위": i + 1,
  "면허": x.licenseType,
  "ID": x.id,
  "카테고리": x.category,
  "중요태그": x.importantTags.join(", "),
  "정답": x.answerText,
  "초안 해설": x.generatedExplanation
}));

const reviewMd = `# Blue Marina 해설 초안 생성 리뷰

생성일: ${output.generatedAt}

## 상태

- 산출물 상태: 검토용 초안
- 원본 문제 데이터 수정: 없음
- 자동 반영: 없음
- 기준 감사 파일: \`work/missing-explanations-audit.json\`

## 생성 통계

- 전체 생성 수: ${output.stats.totalGenerated}
- 일반조종면허 생성 수: ${output.stats.generalGenerated}
- 요트조종면허 생성 수: ${output.stats.yachtGenerated}
- 중요 태그 포함 문항 수: ${output.stats.importantTaggedCount}
- 데이터 불일치 수: ${output.stats.mismatchCount}

## 카테고리별 생성 수

${mdTable(categoryRows, ["카테고리", "생성 수"])}

## 데이터 불일치 여부

${mismatches.length ? mdTable(mismatches.map((m) => ({ "키": m.key, "사유": m.reason })), ["키", "사유"]) : "불일치 없음"}

## 전체 생성 해설 목록

${mdTable(allRows, ["면허", "ID", "카테고리", "중요", "정답", "초안 해설"])}
`;

fs.writeFileSync(path.join(root, "docs/generated-explanations-review.md"), reviewMd, "utf8");

const top50Md = `# Blue Marina TOP50 해설 보완 후보 리뷰

생성일: ${output.generatedAt}

이 문서는 \`work/missing-explanations-audit.json\`의 TOP50 보완 후보에 대해 생성된 검토용 해설 초안만 따로 정리한 파일입니다. 원본 문제 데이터에는 반영하지 않았습니다.

## TOP50 목록

${mdTable(top50Rows, ["순위", "면허", "ID", "카테고리", "중요태그", "정답", "초안 해설"])}
`;

fs.writeFileSync(path.join(root, "docs/top50-explanations-review.md"), top50Md, "utf8");

console.log(JSON.stringify({
  stats: output.stats,
  files: [
    "work/generated-explanations.json",
    "docs/generated-explanations-review.md",
    "docs/top50-explanations-review.md"
  ],
  top50: top50.map((x) => ({ licenseType: x.licenseType, id: x.id, category: x.category, importantTags: x.importantTags }))
}, null, 2));
