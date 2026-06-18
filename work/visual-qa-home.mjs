import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = "http://localhost:3000";
const screenshotDir = path.resolve("work/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

const results = {
  screenshots: {
    mobile: path.join(screenshotDir, "home-mobile.png"),
    desktop: path.join(screenshotDir, "home-desktop.png")
  },
  mobile: {},
  desktop: {},
  ads: {},
  clicks: {},
  consoleErrors: [],
  pageErrors: [],
  network404: []
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collectPageSignals(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const links = Array.from(document.querySelectorAll("a")).map((link) => ({
      text: link.textContent?.replace(/\s+/g, " ").trim() ?? "",
      href: link.getAttribute("href") ?? "",
      rect: link.getBoundingClientRect().toJSON()
    }));
    const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({
      text: button.textContent?.replace(/\s+/g, " ").trim() ?? "",
      rect: button.getBoundingClientRect().toJSON()
    }));
    const ads = Array.from(document.querySelectorAll("aside")).map((ad) => ({
      text: ad.textContent?.replace(/\s+/g, " ").trim() ?? "",
      rect: ad.getBoundingClientRect().toJSON()
    }));
    const hero = Array.from(document.querySelectorAll("section")).find((section) => section.textContent?.includes("Blue Marina License"));
    const bottomNav = document.querySelector("nav.fixed");
    return {
      text,
      links,
      buttons,
      ads,
      heroRect: hero?.getBoundingClientRect().toJSON() ?? null,
      bottomNavRect: bottomNav?.getBoundingClientRect().toJSON() ?? null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight
    };
  });
}

async function clickAndVerify(page, label, selector, expectedUrlPart = null) {
  const locator = page.locator(selector).filter({ visible: true });
  const count = await locator.count();
  assert(count >= 1, `${label}: target not found`);
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  if (expectedUrlPart) {
    await Promise.all([
      page.waitForURL((url) => url.toString().includes(expectedUrlPart), { timeout: 10000 }),
      target.click()
    ]);
    results.clicks[label] = page.url();
    await page.goto(baseUrl);
    await page.waitForLoadState("networkidle");
  } else {
    const beforeUrl = page.url();
    await target.click();
    await page.waitForTimeout(150);
    results.clicks[label] = page.url() === beforeUrl ? "clicked-no-navigation" : page.url();
    if (page.url() !== beforeUrl) {
      await page.goto(baseUrl);
      await page.waitForLoadState("networkidle");
    }
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404) results.network404.push(response.url());
  });

  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: results.screenshots.mobile, fullPage: false });
  const mobile = await collectPageSignals(page);

  results.mobile = {
    brandVisible: mobile.text.includes("Blue Marina") && mobile.heroRect?.top < 120,
    startButtonsImmediate:
      mobile.links.some((link) => link.href === "/study?license=general" && link.rect.top < mobile.viewportHeight) &&
      mobile.links.some((link) => link.href === "/study?license=yacht" && link.rect.top < mobile.viewportHeight),
    noHorizontalScroll: mobile.scrollWidth <= mobile.clientWidth,
    bottomNavDoesNotCoverFirstActions: Boolean(
      mobile.bottomNavRect &&
        mobile.links
          .filter((link) => link.href === "/study?license=general" || link.href === "/study?license=yacht")
          .some((link) => link.rect.bottom < mobile.bottomNavRect.top)
    ),
    adCount: mobile.ads.length,
    firstAdBelowHero: Boolean(mobile.ads[0] && mobile.heroRect && mobile.ads[0].rect.top > mobile.heroRect.bottom - 20),
    hasPreparedButtons: mobile.buttons.some((button) => button.text.includes("준비중")),
    sectionCoverage: {
      guide: mobile.text.includes("면허취득 가이드"),
      locations: mobile.text.includes("시험장 / 교육장 안내"),
      official: mobile.text.includes("공식 신청 바로가기"),
      products: mobile.text.includes("추천 해양용품"),
      roadmap: mobile.text.includes("서비스 로드맵"),
      notices: mobile.text.includes("공지사항")
    }
  };

  await clickAndVerify(page, "일반조종면허 시작", 'a[href="/study?license=general"]', "/study?license=general");
  await clickAndVerify(page, "요트조종면허 시작", 'a[href="/study?license=yacht"]', "/study?license=yacht");
  await clickAndVerify(page, "랜덤풀이", 'a[href="/random?license=yacht"]', "/random?license=yacht");
  await clickAndVerify(page, "모의고사", 'a[href="/exam?license=yacht"]', "/exam?license=yacht");
  await clickAndVerify(page, "오답노트", 'a[href="/wrong?license=yacht"]', "/wrong?license=yacht");
  await clickAndVerify(page, "학습분석", 'a[href="/analysis?license=yacht"]', "/analysis?license=yacht");
  await clickAndVerify(page, "면허취득 가이드 카드", 'button:has-text("면허시험 안내")');
  await clickAndVerify(page, "시험장/교육장 카드", 'button:has-text("필기시험장")');
  await clickAndVerify(page, "공식 신청 바로가기 카드", 'button:has-text("조종면허 시험 신청")');
  await clickAndVerify(page, "준비중 카드", 'button:has-text("실기시험 영상")');

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  desktop.on("pageerror", (error) => results.pageErrors.push(error.message));
  desktop.on("response", (response) => {
    if (response.status() === 404) results.network404.push(response.url());
  });
  await desktop.goto(baseUrl);
  await desktop.waitForLoadState("networkidle");
  await desktop.screenshot({ path: results.screenshots.desktop, fullPage: true });
  const desktopSignals = await collectPageSignals(desktop);

  results.desktop = {
    heroPresent: desktopSignals.text.includes("Blue Marina License"),
    featureCardsVisible: desktopSignals.text.includes("핵심 기능") && desktopSignals.links.filter((link) => link.rect.top < 900).length >= 6,
    adCount: desktopSignals.ads.length,
    noHorizontalScroll: desktopSignals.scrollWidth <= desktopSignals.clientWidth,
    guideGridPresent:
      desktopSignals.text.includes("면허취득 가이드") &&
      desktopSignals.text.includes("시험장 / 교육장 안내") &&
      desktopSignals.text.includes("공식 신청 바로가기") &&
      desktopSignals.text.includes("추천 해양용품"),
    comingSoonLooksPlanned: desktopSignals.text.includes("준비중인 기능") && desktopSignals.text.includes("준비중"),
    oceanPlatformTone: desktopSignals.text.includes("바다로 가는 가장 쉬운 길") && desktopSignals.text.includes("해양레저")
  };

  results.ads = {
    heroBelow: mobile.ads[0]?.text ?? "",
    learningSide: mobile.ads[1]?.text ?? "",
    middleAds: mobile.ads.slice(2).map((ad) => ad.text),
    count: desktopSignals.ads.length
  };

  await desktop.close();
  await browser.close();

  fs.writeFileSync("work/screenshots/home-visual-qa.json", JSON.stringify(results, null, 2), "utf8");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(JSON.stringify({ error: error.message, results }, null, 2));
  process.exit(1);
});
