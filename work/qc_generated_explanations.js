/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const input = JSON.parse(fs.readFileSync(path.join(root, "work/generated-explanations.json"), "utf8"));
const audit = JSON.parse(fs.readFileSync(path.join(root, "work/missing-explanations-audit.json"), "utf8"));
const top50KeySet = new Set(audit.top50Candidates.map((x) => `${x.licenseType}:${x.id}`));

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function sentenceCount(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return normalized
    .split(/(?<=다\.)\s+|(?<=요\.)\s+|(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function has(text, word) {
  return String(text || "").includes(word);
}

function any(text, words) {
  return words.some((word) => has(text, word));
}

function categoryExpectedTerms(category) {
  const map = {
    "기상 및 해양환경": ["바람", "풍향", "풍속", "기상", "파랑", "너울", "태풍", "안개", "수면"],
    "조석·조류·해류": ["조석", "조류", "해류", "만조", "간조", "고조", "저조", "창조", "낙조", "수심"],
    "항해·해도·항로표지": ["해도", "항로", "항로표지", "등화", "음향신호", "기적", "추월", "횡단", "마주침", "피항", "유지", "방위", "수심"],
    "선박 조종술 및 운용": ["조종", "접안", "계류", "정박", "세일", "돛", "요트", "속도", "풍상", "풍하", "선체", "모터보트"],
    "기관 및 정비": ["기관", "엔진", "연료", "냉각", "윤활", "전기", "점화", "시동", "프로펠러", "오일"],
    "구명·조난·소방": ["구명", "조난", "소방", "화재", "소화", "구조", "구명조끼", "신호"],
    "응급처치·인명구조": ["응급처치", "심폐소생술", "환자", "출혈", "골절", "화상", "저체온", "AED", "호흡"],
    "법규·행정": ["면허", "등록", "검사", "법규", "행정", "수상레저사업", "처분", "과태료", "벌금", "신고", "발급"]
  };
  return map[category] || [];
}

function templateTerms(text) {
  const terms = [];
  if (has(text, "해도와 항로표지 문제")) terms.push("해도템플릿");
  if (has(text, "기관 문제는")) terms.push("기관템플릿");
  if (has(text, "면허 관련 문항")) terms.push("면허템플릿");
  if (has(text, "접안과 계류 문제")) terms.push("접안템플릿");
  if (has(text, "요트의 세일과 돛")) terms.push("세일템플릿");
  if (has(text, "바람이나 파랑")) terms.push("기상템플릿");
  if (has(text, "음향신호 문제")) terms.push("음향템플릿");
  if (has(text, "등화 문제")) terms.push("등화템플릿");
  if (has(text, "조난과 구명설비")) terms.push("조난템플릿");
  if (has(text, "소방 문제")) terms.push("소방템플릿");
  if (has(text, "응급처치 문제")) terms.push("응급템플릿");
  return terms;
}

function isNegativeQuestion(q) {
  return /옳지 않은|틀린|아닌 것은|적절하지 않은|맞지 않는/.test(q.question || "");
}

function qcOne(item) {
  const reasons = [];
  const warnings = [];
  const text = item.generatedExplanation || "";
  const top50 = top50KeySet.has(`${item.licenseType}:${item.id}`);
  const sentences = sentenceCount(text);
  const tags = item.tags || [];
  const answer = item.answerText || "";
  const tmpl = templateTerms(text);

  if (!text.trim()) reasons.push("해설이 비어 있음");
  if (!has(text, answer)) reasons.push("해설에 정답 보기 문구가 포함되지 않음");
  if (!text.trim().startsWith(`정답은 '${answer}'`)) warnings.push("정답 선언 형식이 표준과 다름");
  if (sentences < 2 || sentences > 5) reasons.push(`문장 수 기준 이탈(${sentences}문장)`);
  if (any(text, ["반드시", "항상", "절대로"]) && any(item.category, ["법규", "행정"])) warnings.push("법규/기준 단정 표현 검토 필요");
  if (/제\d+조|\d+원|\d+일|\d+시간|\d+미터|\d+m|\d+도/.test(text)) warnings.push("수치·조문 표현 수동 확인 필요");

  const expectedTerms = categoryExpectedTerms(item.category);
  const combined = `${tags.join(" ")} ${item.question} ${text}`;
  const expectedHitCount = expectedTerms.filter((term) => combined.includes(term)).length;
  const tagMentionHits = tags.filter((tag) => tag && has(text, tag)).length;
  const importantHit = (item.importantTags || []).some((tag) => has(text, tag));

  if (expectedHitCount === 0) warnings.push("카테고리 핵심어와 해설 연결 약함");
  if (tagMentionHits === 0 && tags.length > 0) warnings.push("해설에 문항 태그가 직접 반영되지 않음");
  if ((item.importantTags || []).length > 0 && !importantHit) reasons.push("중요 태그가 해설에 반영되지 않음");

  if (item.category === "항해·해도·항로표지" && tmpl.includes("해도템플릿")) {
    const signalTags = ["추월", "횡단", "마주침", "음향신호", "등화", "기적"];
    if (tags.some((tag) => signalTags.includes(tag)) && !tags.some((tag) => ["해도", "수심", "방위"].includes(tag))) {
      reasons.push("항법/신호 문항에 해도 일반 템플릿이 적용됨");
    }
  }

  if (item.category === "구명·조난·소방" && tags.includes("기관") && tmpl.includes("소방템플릿")) {
    warnings.push("기관 태그가 포함된 소방 문항으로 수동 확인 필요");
  }
  if (item.category === "선박 조종술 및 운용" && tags.includes("세일") && !tmpl.includes("세일템플릿")) {
    reasons.push("세일 문항에 세일 전용 설명이 부족함");
  }
  if (item.category === "기관 및 정비" && !tmpl.includes("기관템플릿") && !any(text, ["연료계통", "윤활계통", "냉각계통"])) {
    warnings.push("기관 문항인데 기관/계통 설명이 약함");
  }
  if (isNegativeQuestion(item) && !any(text, ["옳지 않은", "틀린", "맞지 않", "직접 충족하지"])) {
    warnings.push("부정형 문항의 보기 판단 방식 확인 필요");
  }

  const genericPhrases = ["가장 잘 맞습니다", "직접적으로 연결됩니다", "핵심 조건"];
  const genericCount = genericPhrases.filter((phrase) => has(text, phrase)).length;
  if (genericCount >= 2 && tagMentionHits < 2) reasons.push("일반론 비중이 높고 문항 고유 설명이 약함");

  if (top50) {
    if (warnings.length) reasons.push(`TOP50 엄격 검수: ${warnings[0]}`);
    if (tagMentionHits < Math.min(2, tags.length)) reasons.push("TOP50 문항인데 태그 기반 설명이 충분히 구체적이지 않음");
  }

  let status = "ready";
  if (reasons.length) status = "needs-review";
  if (!text.trim() || !has(text, answer) || sentences < 2 || sentences > 6) status = "reject";

  return {
    licenseType: item.licenseType,
    id: item.id,
    category: item.category,
    subCategory: item.subCategory,
    detailCategory: item.detailCategory,
    tags: item.tags,
    importantTags: item.importantTags || [],
    top50,
    answer: item.answer,
    answerText: item.answerText,
    question: item.question,
    choices: item.choices,
    generatedExplanation: item.generatedExplanation,
    sentenceCount: sentences,
    status,
    reasons,
    warnings
  };
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

function statusRows(results, status) {
  return results.filter((x) => x.status === status).map((x) => ({
    "면허": x.licenseType,
    "ID": x.id,
    "TOP50": x.top50 ? "TOP50" : "",
    "카테고리": x.category,
    "태그": x.tags.slice(0, 5).join(", "),
    "사유": [...x.reasons, ...x.warnings].join(" / "),
    "해설 요약": x.generatedExplanation.slice(0, 130)
  }));
}

const results = input.explanations.map(qcOne);
const stats = {
  total: results.length,
  ready: results.filter((x) => x.status === "ready").length,
  needsReview: results.filter((x) => x.status === "needs-review").length,
  reject: results.filter((x) => x.status === "reject").length,
  byLicense: {},
  byCategory: {}
};

for (const r of results) {
  inc(stats.byLicense, `${r.licenseType}:${r.status}`);
  inc(stats.byCategory, `${r.category}:${r.status}`);
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "work/generated-explanations.json",
  criteria: [
    "정답과 해설 일치 여부",
    "오답을 정답처럼 설명하는지 여부",
    "문제/보기 내용 충돌 여부",
    "근거 없는 법령·수치 단정 여부",
    "일반론 과다 여부",
    "초보자 이해 가능성",
    "2~5문장 범위",
    "Blue Marina 해설 톤 유사성"
  ],
  stats,
  results
};

fs.writeFileSync(path.join(root, "work/generated-explanations-qc.json"), JSON.stringify(output, null, 2), "utf8");

const licenseRows = Object.entries(stats.byLicense).sort().map(([key, count]) => {
  const [licenseType, status] = key.split(":");
  return { "면허": licenseType, "상태": status, "수": count };
});
const categoryRows = Object.entries(stats.byCategory).sort().map(([key, count]) => {
  const [category, status] = key.split(":");
  return { "카테고리": category, "상태": status, "수": count };
});
const rejectRows = statusRows(results, "reject");
const needsRows = statusRows(results, "needs-review");
const readySampleRows = statusRows(results, "ready").slice(0, 30);

const md = `# Blue Marina 생성 해설 QC 리포트

생성일: ${output.generatedAt}

## 결론

- 전체 검수 수: ${stats.total}
- ready: ${stats.ready}
- needs-review: ${stats.needsReview}
- reject: ${stats.reject}

본 검수는 원본 문제 데이터에 반영하지 않은 검토용 분류입니다. TOP50 중요 문항은 일반 문항보다 엄격하게 판정했습니다.

## 면허별 통계

${mdTable(licenseRows, ["면허", "상태", "수"])}

## 카테고리별 통계

${mdTable(categoryRows, ["카테고리", "상태", "수"])}

## reject 문항

${rejectRows.length ? mdTable(rejectRows, ["면허", "ID", "TOP50", "카테고리", "태그", "사유", "해설 요약"]) : "reject 없음"}

## needs-review 문항

${needsRows.length ? mdTable(needsRows, ["면허", "ID", "TOP50", "카테고리", "태그", "사유", "해설 요약"]) : "needs-review 없음"}

## ready 샘플 30개

${readySampleRows.length ? mdTable(readySampleRows, ["면허", "ID", "TOP50", "카테고리", "태그", "사유", "해설 요약"]) : "ready 없음"}

## 주요 관찰

- 카테고리/태그 기반 템플릿 해설은 전체 구조를 빠르게 채우는 데 유용하지만, 일부 문항은 문제 고유 조건보다 일반론 비중이 큽니다.
- TOP50 문항은 반영 전 사람이 한 번 더 읽고, 특히 법규·행정 및 항해·해도·항로표지 문항은 실제 보기 조건과 충돌하지 않는지 확인하는 것이 좋습니다.
- reject는 자동 반영 금지, needs-review는 사람 검수 후 수정 또는 승인, ready는 형식상 바로 반영 가능한 후보로 분류했습니다.
`;

fs.writeFileSync(path.join(root, "docs/generated-explanations-qc.md"), md, "utf8");

console.log(JSON.stringify({
  stats,
  files: ["work/generated-explanations-qc.json", "docs/generated-explanations-qc.md"],
  examples: {
    needsReview: needsRows.slice(0, 5),
    reject: rejectRows.slice(0, 5)
  }
}, null, 2));
