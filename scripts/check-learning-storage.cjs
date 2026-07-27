/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
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

function createLocalStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    keys() {
      return Array.from(store.keys());
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

global.window = {
  localStorage: createLocalStorageMock(),
  setTimeout,
  clearTimeout
};

const {
  hydrateLearningStateFromSupabase,
  readAnswerHistory,
  readExamHistory,
  readProgress,
  readWrongIds,
  recordAnswer,
  resetProgress,
  saveExamHistory,
  saveWrongQuestion
} = require("../src/lib/boat/storage.ts");
const { getQuestionById } = require("../src/lib/boat/questions.ts");

async function main() {
  resetProgress("general");
  resetProgress("yacht");

  assert(readWrongIds("general").length === 0, "general wrong note should start empty");
  assert(readWrongIds("yacht").length === 0, "yacht wrong note should start empty");

  saveWrongQuestion(10, "general");
  assert(readWrongIds("general").includes(10), "general wrong note should store general question");
  assert(!readWrongIds("yacht").includes(10), "yacht wrong note must not include general question");

  const generalQuestion = getQuestionById(1, "general");
  const yachtQuestion = getQuestionById(1, "yacht");
  assert(generalQuestion, "general #1 must exist");
  assert(yachtQuestion, "yacht #1 must exist");

  recordAnswer(generalQuestion, false);
  recordAnswer(yachtQuestion, true);

  const generalProgress = readProgress("general");
  const yachtProgress = readProgress("yacht");
  assert(generalProgress.totalAttempts === 1, "general progress attempt count mismatch");
  assert(yachtProgress.totalAttempts === 1, "yacht progress attempt count mismatch");
  assert(generalProgress.wrongIds.includes(1), "general wrong progress should include failed question");
  assert(yachtProgress.correctIds.includes(1), "yacht correct progress should include correct question");
  assert(!yachtProgress.wrongIds.includes(1), "yacht wrong progress should not include correct question");

  assert(readAnswerHistory("general").length === 1, "general answer history should contain one answer");
  assert(readAnswerHistory("yacht").length === 1, "yacht answer history should contain one answer");
  assert(readAnswerHistory("general")[0].licenseType === "general", "general answer history license mismatch");
  assert(readAnswerHistory("yacht")[0].licenseType === "yacht", "yacht answer history license mismatch");

  saveExamHistory(
    {
      total: 50,
      correct: 45,
      score: 90,
      firstClassPassed: true,
      secondClassPassed: true
    },
    "general"
  );
  saveExamHistory(
    {
      total: 50,
      correct: 30,
      score: 60,
      firstClassPassed: false,
      secondClassPassed: true
    },
    "yacht"
  );

  assert(readExamHistory("general")[0].score === 90, "general exam history score mismatch");
  assert(readExamHistory("yacht")[0].score === 60, "yacht exam history score mismatch");

  resetProgress("general");
  assert(readProgress("general").totalAttempts === 0, "general reset should clear progress");
  assert(readAnswerHistory("general").length === 0, "general reset should clear answer history");
  assert(readExamHistory("general").length === 0, "general reset should clear exam history");
  assert(readProgress("yacht").totalAttempts === 1, "general reset must not clear yacht progress");
  assert(readExamHistory("yacht").length === 1, "general reset must not clear yacht exam history");

  const hydrateResult = await hydrateLearningStateFromSupabase("general");
  assert(hydrateResult.skipped === true, "Supabase hydrate should skip safely when env or user is unavailable");

  console.log("Learning storage check passed: license-separated progress, wrong note, answer history, exam history, reset, and Supabase-safe hydration verified.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
