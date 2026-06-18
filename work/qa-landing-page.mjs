import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const browser = await chromium.launch({ headless: true });
const results = { mobile: {}, desktop: {}, consoleErrors: [], pageErrors: [] };

async function checkViewport(name, viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600 });
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  const text = await page.locator("main").innerText();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const links = await page.locator("main a").evaluateAll((items) =>
    items.map((item) => ({
      text: item.textContent?.replace(/\s+/g, " ").trim(),
      href: item.getAttribute("href")
    }))
  );
  await page.screenshot({ path: `work/landing-${name}.png`, fullPage: false });
  await page.close();
  return {
    hasHero: text.includes("Blue Marina") && text.includes("바다로 가는 가장 쉬운 길"),
    hasGeneralLink: links.some((link) => link.href === "/study?license=general"),
    hasYachtLink: links.some((link) => link.href === "/study?license=yacht"),
    hasExamLink: links.some((link) => link.href === "/exam?license=yacht"),
    hasAnalysisLink: links.some((link) => link.href === "/analysis?license=yacht"),
    hasAds: text.includes("광고 영역"),
    hasGuide: text.includes("면허취득 가이드"),
    hasLocations: text.includes("시험장 / 교육장 안내"),
    hasOfficial: text.includes("공식 신청 바로가기"),
    hasProducts: text.includes("추천 해양용품"),
    hasRoadmap: text.includes("서비스 로드맵"),
    hasNotices: text.includes("공지사항"),
    noHorizontalScroll: scrollWidth <= clientWidth,
    linkCount: links.length
  };
}

results.mobile = await checkViewport("mobile", { width: 390, height: 844 });
results.desktop = await checkViewport("desktop", { width: 1440, height: 1000 });
await browser.close();

fs.writeFileSync("work/landing-qa-result.json", JSON.stringify(results, null, 2), "utf8");
console.log(JSON.stringify(results, null, 2));
