const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const client = fs.readFileSync(path.join(root, "src/app/fishing-spots/conditions/fishing-condition-client.tsx"), "utf8");
const fetcher = fs.readFileSync(path.join(root, "src/lib/fishing-condition/read-model-client.ts"), "utf8");
const speciesContract = fs.readFileSync(path.join(root, "src/lib/fishing-condition/fishing-spot-integration.ts"), "utf8");

test("Fishing Condition UI has a dedicated route and read-model client", () => {
  assert.ok(fs.existsSync(path.join(root, "src/app/fishing-spots/conditions/page.tsx")));
  assert.match(fetcher, /\/api\/fishing-condition\/read-model/);
  assert.doesNotMatch(client, /\/api\/fishing-condition\/(comparison|explanation|evidence)/);
});

test("UI keeps the approved ten canonical species and explicit month selection", () => {
  for (const id of ["BM-SPECIES-000755", "BM-SPECIES-000751", "BM-SPECIES-000188", "BM-SPECIES-000012", "BM-SPECIES-000465", "BM-SPECIES-000444", "BM-SPECIES-000417", "BM-SPECIES-000501", "BM-SPECIES-003107", "BM-SPECIES-003111"]) assert.match(speciesContract, new RegExp(id));
  assert.match(client, /FISHING_CONDITION_SPECIES/);
  assert.match(client, /월 선택/);
  assert.match(client, /Array\.from\(\{ length: 12 \}/);
});

test("UI exposes source and depth boundaries without nearest-location inference", () => {
  assert.match(client, /nifs-risa/);
  assert.match(client, /nifs-femo-sea/);
  assert.match(client, /MIDDLE/);
  assert.match(client, /disabled/);
  assert.doesNotMatch(client, /nearest|closest|현재 위치|추천 정점/i);
});

test("UI renders evidence, limitations, freshness, empty and loading states", () => {
  for (const token of ["환경 자료", "산란 시기", "회유", "월별 어획 원기록", "근거와 최신성", "해석의 한계", "원자료 행 없음", "aria-live", "skeleton"]) assert.match(client, new RegExp(token));
  assert.doesNotMatch(client, /score\s*:|probability\s*:|ranking\s*:/i);
});
