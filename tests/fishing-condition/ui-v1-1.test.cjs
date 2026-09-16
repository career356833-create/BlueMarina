const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const client = fs.readFileSync(path.join(root, "src/app/fishing-spots/conditions/fishing-condition-client.tsx"), "utf8");
const fetcher = fs.readFileSync(path.join(root, "src/lib/fishing-condition/read-model-client.ts"), "utf8");
const captain = fs.readFileSync(path.join(root, "src/components/boat/ai-captain/BlueMarinaCaptainWidget.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const fishingHero = fs.readFileSync(path.join(root, "src/components/boat/home/FishingExperienceSection.tsx"), "utf8");

test("AI Captain desktop mode uses a route-aware safe area", () => {
  assert.match(captain, /startsWith\("\/fishing-spots"\)/);
  assert.match(captain, /data-safe-area/);
  assert.match(css, /blue-captain-widget\[data-safe-area="true"\]/);
  assert.match(css, /bottom: 86px/);
});

test("AI Captain mobile mode uses a compact trigger above BottomNav", () => {
  assert.match(css, /width: 44px/);
  assert.match(css, /bottom: 96px/);
});

test("temperature cards expose the profile reference range", () => {
  assert.match(fetcher, /profileReference/);
  assert.match(client, /현재 수온/);
  assert.match(client, /선호 수온 근거/);
  assert.match(client, /관찰 수온 범위/);
});

test("temperature cards explicitly show when no comparison range exists", () => {
  assert.match(client, /비교 기준 없음/);
});

test("migration relations are rendered as Korean factual statements", () => {
  assert.match(client, /선택한 월이 이 이동 시기 범위에 포함됩니다/);
  assert.match(client, /선택한 월이 이 이동 시기 범위 밖입니다/);
  assert.match(client, /북상과 남하는 서로 다른 이동 근거입니다/);
  assert.doesNotMatch(client, />\{card\.relation\}</);
});

test("read-model and station failures provide real retry controls", () => {
  assert.match(client, /fetchFishingConditionReadModel\(query, controller\.signal\)/);
  assert.match(client, /onClick=\{\(\) => void runQuery\(\)\}/);
  assert.match(client, /setLocationReloadKey/);
  assert.match(client, /requestControllerRef/);
});

test("station helper exposes source and supported depth context", () => {
  assert.match(client, /지원 수심/);
  assert.match(client, /depthSummary/);
});

test("unit-unverified state has a specific user-facing label", () => {
  assert.match(client, /단위 확인 필요/);
});

test("unsupported profile state has a specific user-facing label", () => {
  assert.match(client, /어종 비교 근거 없음/);
});

test("occurrence records use semantic table markup", () => {
  for (const token of ["<table", "<caption", "scope=\"col\"", "scope=\"row\""]) {
    assert.match(client, new RegExp(token));
  }
});

test("missing occurrence rows are distinct from zero values", () => {
  assert.match(client, /원자료 행이 없습니다/);
  assert.match(client, /원자료 행 없음은 0으로 해석하지 않습니다/);
});

test("provider-null state never invents an official provider", () => {
  assert.match(client, /출처 정보 미확인/);
  assert.doesNotMatch(client, /source\.provider \?\? "공식 자료"/);
});

test("limitations use progressive disclosure", () => {
  assert.match(client, /상세 제한사항 보기/);
  assert.match(client, /<details/);
});

test("loading feedback is announced through a status region", () => {
  assert.match(client, /role="status"/);
  assert.match(client, /aria-live="polite"/);
});

test("errors are announced through an alert region", () => {
  assert.match(client, /role="alert"/);
  assert.match(client, /다시 시도/);
});

test("V1.1 keeps auxiliary quality and product boundaries intact", () => {
  assert.match(client, /환경 관측값 없음/);
  assert.match(client, /현재 자료원을 이용할 수 없습니다/);
  assert.match(client, /데이터 계보 보기/);
  assert.match(fishingHero, /blue-marina-fishing-experience\.png[\s\S]*priority/);
  assert.doesNotMatch(client, /catchProbability|recommendedSpecies|bestMonth|percentage|rating|stars/i);
});
