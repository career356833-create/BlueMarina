/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const allowedCategories = new Set([
  "기상 및 해양환경",
  "조석·조류·해류",
  "항해·해도·항로표지",
  "선박 조종술 및 운용",
  "기관 및 정비",
  "구명·조난·소방",
  "응급처치·인명구조",
  "법규·행정"
]);

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, "src", request.slice(2)), parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;

  module._compile(output, filename);
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertQuestionBank(questions, licenseType) {
  const pool = questions.filter((question) => question.licenseType === licenseType);
  assert(pool.length === 700, `${licenseType} question count must be 700, received ${pool.length}`);

  const ids = new Set();

  for (const question of pool) {
    assert(Number.isInteger(question.id), `${licenseType} question id must be an integer`);
    assert(question.id >= 1 && question.id <= 700, `${licenseType} question id out of range: ${question.id}`);
    assert(!ids.has(question.id), `${licenseType} duplicate question id: ${question.id}`);
    ids.add(question.id);

    assert(typeof question.question === "string" && question.question.trim().length > 0, `${licenseType} #${question.id} has empty question`);
    assert(Array.isArray(question.choices) && question.choices.length === 4, `${licenseType} #${question.id} must have 4 choices`);
    question.choices.forEach((choice, index) => {
      assert(typeof choice === "string" && choice.trim().length > 0, `${licenseType} #${question.id} choice ${index} is empty`);
    });
    assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3, `${licenseType} #${question.id} answer out of range`);
    assert(typeof question.explanation === "string" && question.explanation.trim().length > 0, `${licenseType} #${question.id} has empty explanation`);
    assert(allowedCategories.has(question.category), `${licenseType} #${question.id} invalid category: ${question.category}`);
    assert(typeof question.subCategory === "string" && question.subCategory.trim().length > 0, `${licenseType} #${question.id} has empty subCategory`);
    assert(typeof question.detailCategory === "string" && question.detailCategory.trim().length > 0, `${licenseType} #${question.id} has empty detailCategory`);
    assert(Array.isArray(question.tags) && question.tags.length > 0, `${licenseType} #${question.id} has empty tags`);
  }

  for (let id = 1; id <= 700; id += 1) {
    assert(ids.has(id), `${licenseType} missing question id: ${id}`);
  }
}

function assertNoDebugLogs() {
  const coreFiles = [
    "src/components/boat/QuestionCard.tsx",
    "src/app/study/page.tsx",
    "src/app/random/page.tsx",
    "src/app/exam/page.tsx",
    "src/app/wrong/page.tsx",
    "src/app/progress/progress-client.tsx",
    "src/app/analysis/analysis-client.tsx"
  ];

  for (const relativePath of coreFiles) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert(!source.includes("console.log"), `${relativePath} contains console.log`);
  }
}

const { questions } = require("../src/data/questions.ts");
const { theories } = require("../src/data/theories.ts");
const { getAllQuestions, getMockExamQuestions, getQuestionsByCategory, getQuestionsByTag } = require("../src/lib/boat/questions.ts");

assert(questions.length === 1400, `total question count must be 1400, received ${questions.length}`);
assertQuestionBank(questions, "general");
assertQuestionBank(questions, "yacht");

for (const licenseType of ["general", "yacht"]) {
  assert(getAllQuestions(licenseType).length === 700, `${licenseType} getAllQuestions count mismatch`);
  assert(getMockExamQuestions(licenseType, 50).length === 50, `${licenseType} mock exam must return 50 questions`);
  assert(getQuestionsByCategory(licenseType, "전체").length === 700, `${licenseType} all category must return 700 questions`);

  const sampleTag = getAllQuestions(licenseType).find((question) => question.tags.length > 0)?.tags[0];
  assert(sampleTag && getQuestionsByTag(licenseType, sampleTag).length > 0, `${licenseType} tag lookup failed`);
}

assert(theories.length === 30, `theory count must be 30, received ${theories.length}`);
assert(theories.every((theory) => theory.status === "ready"), "all theories must be ready");
assertNoDebugLogs();

console.log("Learning core check passed: 1400 questions, 30 ready theories, route helpers, and debug-log guard verified.");
