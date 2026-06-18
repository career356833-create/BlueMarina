import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ROOT = path.resolve("C:/Users/USER/Documents/Codex/2026-06-12/kidsauto-ai-saas-mvp-next-js");
const BASE_URL = "http://localhost:3000";
const licenses = ["general", "yacht"];

function loadAnswerMap(fileName, licenseType) {
  const text = fs.readFileSync(path.join(ROOT, "src", "data", fileName), "utf8");
  const arrayStart = text.indexOf("= [");
  const arrayText = text.slice(text.indexOf("[", arrayStart), text.lastIndexOf("]") + 1);
  const parsed = JSON.parse(arrayText);
  const map = new Map();
  for (const question of parsed) {
    map.set(Number(question.id), { answer: Number(question.answer), licenseType });
  }
  return map;
}

const answerMaps = {
  general: loadAnswerMap("general-questions.ts", "general"),
  yacht: loadAnswerMap("yacht-questions.ts", "yacht")
};

const results = {
  home: {},
  licenses: {},
  consoleErrors: [],
  pageErrors: [],
  mobile: {},
  notes: []
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function choiceButtons(page) {
  return page.locator("section").first().locator("button");
}

async function getQuestionId(page) {
  const text = await page.locator("section").first().innerText();
  const match = text.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

async function answerFirstQuestion(page, choiceIndex = 0) {
  const choices = await choiceButtons(page);
  const count = await choices.count();
  assert(count === 4, `expected 4 choices, got ${count}`);
  const before = await page.locator("section").first().innerText();
  await choices.nth(choiceIndex).click();
  await page.waitForTimeout(150);
  const after = await page.locator("section").first().innerText();
  const selectedCount = await page.locator("section").first().locator(".bg-emerald-50, .bg-rose-50").count();
  assert(selectedCount > 0 || after !== before, "choice click did not change visible state");
  return { before, after };
}

async function clickNextIfVisible(page) {
  const next = page.locator("main > button").last();
  assert((await next.count()) > 0, "next button not found");
  const before = await page.locator("section").first().innerText();
  await next.click();
  await page.waitForTimeout(200);
  const after = await page.locator("section").first().innerText();
  assert(after !== before, "next button did not change question");
}

async function qaStudy(page, license) {
  await page.goto(`${BASE_URL}/study?license=${license}`);
  await page.waitForLoadState("networkidle");
  await answerFirstQuestion(page, 0);
  await clickNextIfVisible(page);
  return true;
}

async function qaRandom(page, license) {
  await page.goto(`${BASE_URL}/random?license=${license}`);
  await page.waitForLoadState("networkidle");
  const id = await getQuestionId(page);
  await answerFirstQuestion(page, 0);
  await clickNextIfVisible(page);
  return { firstQuestionId: id };
}

async function qaExam(page, license) {
  await page.goto(`${BASE_URL}/exam?license=${license}`);
  await page.waitForLoadState("networkidle");
  const ids = new Set();

  for (let i = 0; i < 50; i += 1) {
    const id = await getQuestionId(page);
    if (id) ids.add(id);
    await answerFirstQuestion(page, 0);
    const action = page.locator("main > button").last();
    await action.click();
    await page.waitForTimeout(80);
  }

  const resultText = await page.locator("main").innerText();
  const examHistory = await page.evaluate((key) => window.localStorage.getItem(key), `blue-marina:${license}:exam-history`);
  assert(ids.size === 50, `exam questions were not unique: ${ids.size}/50`);
  assert(Boolean(examHistory), "exam history was not saved");
  return {
    uniqueQuestions: ids.size,
    hasScore: /\d+/.test(resultText),
    examHistorySaved: Boolean(examHistory)
  };
}

async function qaWrong(page, license) {
  await page.goto(`${BASE_URL}/wrong?license=${license}`);
  await page.waitForLoadState("networkidle");
  const wrongKey = `blue-marina:${license}:wrong`;
  const initialWrongIds = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "[]"), wrongKey);
  assert(initialWrongIds.length > 0, `${license} wrong note is empty`);

  const id = await getQuestionId(page);
  const answer = answerMaps[license].get(id)?.answer;
  assert(Number.isInteger(answer), `cannot find answer for wrong question #${id}`);
  await answerFirstQuestion(page, answer);
  await page.waitForTimeout(150);
  const afterWrongIds = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "[]"), wrongKey);
  assert(!afterWrongIds.includes(id), "correct answer did not remove wrong question from localStorage");
  return { initialWrongCount: initialWrongIds.length, removedQuestionId: id, remainingWrongCount: afterWrongIds.length };
}

async function qaProgress(page, license) {
  await page.goto(`${BASE_URL}/progress?license=${license}`);
  await page.waitForLoadState("networkidle");
  const text = await page.locator("main").innerText();
  const progress = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), `blue-marina:${license}:progress`);
  assert(progress && progress.totalAttempts > 0, "progress key missing or empty");
  return { totalAttempts: progress.totalAttempts, textLength: text.length };
}

async function qaAnalysis(page, license) {
  await page.goto(`${BASE_URL}/analysis?license=${license}`);
  await page.waitForLoadState("networkidle");
  const answerHistory = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "[]"), `blue-marina:${license}:answer-history`);
  assert(answerHistory.length > 0, "answer history missing");
  const reviewLink = page.locator('main a[href*="/study?license="], main a[href*="/random?license="]').first();
  assert((await reviewLink.count()) > 0, "review start link not found");
  const href = await reviewLink.getAttribute("href");
  assert(Boolean(href), "review link href missing");
  await reviewLink.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL(`**${href}`, { timeout: 10000 }),
    reviewLink.click()
  ]);
  await page.waitForLoadState("networkidle");
  const url = page.url();
  assert(url.includes(`license=${license}`), "review link did not preserve license");
  assert(url.includes("/study?") || url.includes("/random?"), "review link did not navigate to study or random");
  return { answerHistoryCount: answerHistory.length, reviewUrl: url };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (["error"].includes(msg.type())) results.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));

  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.localStorage.clear());

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  results.mobile.noHorizontalScroll = scrollWidth <= clientWidth;

  const generalHomeLink = page.locator('a[href="/study?license=general"]').first();
  await generalHomeLink.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL("**/study?license=general", { timeout: 10000 }),
    generalHomeLink.click()
  ]);
  await page.waitForLoadState("networkidle");
  results.home.generalCardUrl = page.url();
  assert(page.url().includes("/study?license=general"), "general card did not navigate to general study");

  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  const yachtHomeLink = page.locator('a[href="/study?license=yacht"]').filter({ hasText: "요트조종면허" }).first();
  await yachtHomeLink.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL("**/study?license=yacht", { timeout: 10000 }),
    yachtHomeLink.click()
  ]);
  await page.waitForLoadState("networkidle");
  results.home.yachtCardUrl = page.url();
  assert(page.url().includes("/study?license=yacht"), "yacht card did not navigate to yacht study");

  for (const license of licenses) {
    results.licenses[license] = {};
    results.licenses[license].study = await qaStudy(page, license);
    results.licenses[license].random = await qaRandom(page, license);
    results.licenses[license].exam = await qaExam(page, license);
    results.licenses[license].wrong = await qaWrong(page, license);
    results.licenses[license].progress = await qaProgress(page, license);
    results.licenses[license].analysis = await qaAnalysis(page, license);
  }

  const keys = await page.evaluate(() => Object.keys(window.localStorage).sort());
  results.localStorageKeys = keys.filter((key) => key.startsWith("blue-marina:"));
  results.localStorageSeparated =
    results.localStorageKeys.some((key) => key.startsWith("blue-marina:general:")) &&
    results.localStorageKeys.some((key) => key.startsWith("blue-marina:yacht:"));

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(JSON.stringify({ error: error.message, stack: error.stack, results }, null, 2));
  process.exit(1);
});
