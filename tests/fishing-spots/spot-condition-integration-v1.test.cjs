const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const spots = JSON.parse(read("src/data/fishing-spots.json"));
const integration = read("src/lib/fishing-condition/fishing-spot-integration.ts");
const list = read("src/app/fishing-spots/fishing-spots-client.tsx");
const detail = read("src/app/fishing-spots/[id]/page.tsx");
const conditionsPage = read("src/app/fishing-spots/conditions/page.tsx");
const conditionsClient = read("src/app/fishing-spots/conditions/fishing-condition-client.tsx");
const mapView = read("src/components/sea/MapView.tsx");

const canonicalNames = new Set(["참돔", "감성돔", "농어", "조피볼락", "넙치", "갈치", "고등어", "방어", "주꾸미", "문어"]);
const explicitAliases = new Map([["광어", "넙치"], ["우럭", "조피볼락"]]);
const splitTargets = (spot) => spot.targetFish.split("|").map((item) => item.trim()).filter(Boolean);
const mappedTargets = (spot) => splitTargets(spot).map((name) => explicitAliases.get(name) ?? name).filter((name) => canonicalNames.has(name));

test("canonical species spot links list to detail and detail to preselected conditions", () => {
  const spot = spots.find((item) => mappedTargets(item).length > 0);
  assert.ok(spot);
  assert.match(list, /\/fishing-spots\/\$\{encodeURIComponent\(spot\.id\)\}/);
  assert.match(detail, /buildFishingConditionHref\(spot, item\.id\)/);
  assert.match(integration, /params\.set\("speciesId"/);
});

test("multiple canonical species remain separate condition actions", () => {
  const spot = spots.find((item) => new Set(mappedTargets(item)).size >= 2);
  assert.ok(spot, "fixture with multiple canonical species must exist");
  assert.match(detail, /species\.canonical\.map/);
  assert.match(detail, /aria-label=\{`\$\{item\.name\} 조건 분석`\}/);
});

test("invalid query species id safely falls back to the unselected state", () => {
  assert.match(conditionsPage, /getFishingConditionSpecies\(first\(query\.speciesId\)\)/);
  assert.match(conditionsClient, /initialSpeciesId = ""/);
  assert.match(integration, /conditionSpeciesById\.get\(speciesId\) \?\? null/);
});

test("spot without canonical species shows direct-selection fallback", () => {
  const spot = spots.find((item) => mappedTargets(item).length === 0);
  assert.ok(spot, "fixture without canonical target species must exist");
  assert.match(detail, /연결 가능한 대상 어종 정보가 없습니다/);
  assert.match(detail, /buildFishingConditionHref\(spot\)/);
  assert.match(detail, /자동 추론하지 않습니다/);
});

test("spot coordinates reuse map focus and navigation destination contracts", () => {
  assert.ok(spots.every((spot) => Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lng))));
  assert.match(detail, /buildFishingSpotMapHref\(spot\)/);
  assert.match(detail, /navigationDestinationFromFishingSpot\(spot\)/);
  assert.match(mapView, /new URLSearchParams\(window\.location\.search\)\.get\("spotId"\)/);
  assert.match(mapView, /setSelectedFeature\(\{ kind: "fishing-spot", id: spot\.id \}\)/);
});

test("spot context on conditions preserves backlink and location disclaimer", () => {
  assert.match(conditionsPage, /detailHref: `\/fishing-spots\/\$\{encodeURIComponent\(spot\.id\)\}`/);
  assert.match(conditionsClient, /상세로 돌아가기/);
  assert.match(conditionsClient, /포인트 위치와 해양 관측 정점은 별도입니다/);
});

test("deep link preselects only species and keeps explicit condition selectors", () => {
  assert.match(conditionsClient, /useState\(initialSpeciesId\)/);
  for (const initialValue of [
    /const \[month, setMonth\] = useState\(""\)/,
    /const \[sourceId, setSourceId\] = useState<FishingConditionSourceId \| "">\(""\)/,
    /const \[locationId, setLocationId\] = useState\(""\)/,
    /const \[depth, setDepth\] = useState<FishingConditionDepth \| "">\(""\)/,
  ]) assert.match(conditionsClient, initialValue);
});

test("integration adds no score probability ranking or recommendation UI", () => {
  const combined = [integration, detail, conditionsPage].join("\n");
  assert.doesNotMatch(combined, /catchProbability|recommendedSpecies|bestMonth|todayBest|percentage|rating|stars|gauge/i);
});
