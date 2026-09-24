const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function loadTs(file) {
  const output = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, require);
  return module.exports;
}

const personal = loadTs("src/lib/home/personalization.ts");
const report = JSON.parse(read("reports/home/home-personalization-v1.json"));

test("records a compact home personalization decision with environment limits", () => {
  assert.equal(report.decision, "HOME_PERSONALIZATION_V1_READY_WITH_ENV_LIMITATIONS");
  assert.equal(report.homepageAuthority.marineVideoHero, "PRESERVED");
  assert.equal(report.homepageAuthority.primaryServiceEntries, 6);
  assert.equal(report.homepageAuthority.secondaryServiceEntries, 2);
});

test("recent highlights order, deduplicate, cap, and skip unsupported records", () => {
  const recent = personal.getRecentHighlights([
    { entityType: "FISH", entityId: "fish-1", label: "이전 어종", href: "/fish/fish-1", viewedAt: "2026-09-20T00:00:00.000Z" },
    { entityType: "FISH", entityId: "fish-1", label: "최신 어종", href: "/fish/fish-1", viewedAt: "2026-09-22T00:00:00.000Z" },
    { entityType: "CHARTER", entityId: "stale", label: "잘못된 출조", href: "/market/stale", viewedAt: "2026-09-23T00:00:00.000Z" },
    { entityType: "COMMUNITY_POST", entityId: "post-1", label: "작성글", href: "/community/post-1", viewedAt: "2026-09-21T00:00:00.000Z" },
  ]);
  assert.deepEqual(recent.map((item) => item.label), ["최신 어종", "작성글"]);
  assert.equal(personal.HOME_RECENT_LIMIT, 6);
});

test("saved highlights group supported records and omit unsafe CTA records", () => {
  const groups = personal.getSavedHighlights([
    { id: "1", entityType: "FISHING_SPOT", entityId: "spot-1", label: "포인트", href: "/fishing-spots/spot-1", savedAt: "2026-09-23T00:00:00.000Z" },
    { id: "2", entityType: "CHARTER", entityId: "gone", label: "오래된 출조", href: "/charters", savedAt: "2026-09-23T00:00:00.000Z" },
    { id: "3", entityType: "MARKET_LISTING", entityId: "market-1", label: "장비", href: "https://outside.example", savedAt: "2026-09-23T00:00:00.000Z" },
  ]);
  assert.deepEqual(groups.map((group) => [group.type, group.items.length]), [["FISHING_SPOT", 1]]);
  assert.equal(personal.HOME_SAVED_GROUP_LIMIT, 2);
});

test("home preserves the hero and defers personalized client UI until after service entries", () => {
  const home = read("src/components/boat/home/HomeLanding.tsx");
  assert.match(home, /<MarineVideoHero\s*\/>/);
  assert.match(home, /<PersonalizedHomeSection\s*\/>/);
  assert.ok(home.indexOf("<MarineVideoHero") < home.indexOf("<PersonalizedHomeSection"));
  assert.match(home, /platformServiceEntries/);
});

test("personalized section contains all user state, privacy, and limitation boundaries", () => {
  const source = read("src/components/boat/home/PersonalizedHomeSection.tsx");
  assert.match(source, /"signed-out"/);
  assert.match(source, /"limited"/);
  assert.match(source, /ACCOUNT_RECENT_STORAGE_KEY/);
  assert.match(source, /fetch\("\/api\/account"/);
  assert.match(source, /getCharter\(item\.entityId\)/);
  assert.match(source, /현재 공개 정보를 확인할 수 없는 항목은 열기 링크를 표시하지 않습니다/);
  assert.match(source, /item\.entityType === "FISH"/);
  assert.match(source, /이 기기에 저장됨/);
  assert.match(source, /저장 항목과 서버 활동은 표시하지 않습니다/);
  assert.doesNotMatch(source, /email/);
  assert.doesNotMatch(source, /추천|인기|trending|personalized score/i);
});

test("Account and platform routes remain linked without adding a new persistence contract", () => {
  const source = read("src/components/boat/home/PersonalizedHomeSection.tsx");
  for (const href of ["/account", "/account/saved", "/fishing-spots", "/fish", "/charters"]) assert.match(source, new RegExp(`href=\"${href.replaceAll("/", "\\/")}\"`));
  assert.equal(report.database.localApply, 0);
  assert.equal(report.database.remoteApply, 0);
  assert.equal(report.backendLimitations.featureFlag, "ACCOUNT_BACKEND_ENABLED");
  assert.equal(report.safety.recommendation, 0);
  assert.equal(report.privacy.emailExposure, 0);
});
