const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const helperSource = read('src/lib/today-sea/source-state.ts');
const compiled = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const helperExports = {};
vm.runInNewContext(compiled, { exports: helperExports });
const { classifyTodaySeaSource, classifySelectedObservationSource, selectExplicitStation, formatSeoulCalendarDate } = helperExports;
const hub = read('src/components/boat/home/TodaySeaOperationalHub.tsx');
const hero = read('src/components/boat/home/TodaysSeaExperience.tsx');
const page = read('src/app/today-sea/page.tsx');

test('each source reports available, stale, disabled, error or unknown independently', () => {
  assert.equal(classifyTodaySeaSource(true, { ok: true, freshness: 'fresh' }).status, 'AVAILABLE');
  assert.equal(classifyTodaySeaSource(true, { ok: true, freshness: 'stale' }).status, 'STALE');
  assert.equal(classifyTodaySeaSource(true, { ok: true, freshness: 'unavailable' }).status, 'UNKNOWN');
  assert.equal(classifyTodaySeaSource(false, { ok: false, code: 'SOURCE_DISABLED' }).status, 'DISABLED');
  assert.equal(classifyTodaySeaSource(false, { ok: false, code: 'API_KEY_MISSING' }).status, 'DISABLED');
  assert.equal(classifyTodaySeaSource(false, { ok: false, code: 'UPSTREAM_ERROR' }).status, 'ERROR');
  assert.equal(classifyTodaySeaSource(true, null).status, 'ERROR');
});

test('a source failure does not fabricate a datum or fail other sources', () => {
  const failed = classifyTodaySeaSource(false, { ok: false, code: 'UPSTREAM_TIMEOUT' });
  const available = classifyTodaySeaSource(true, { ok: true, freshness: 'fresh', stations: [{ stationId: 'R1' }] });
  assert.equal(failed.data, null);
  assert.equal(failed.status, 'ERROR');
  assert.equal(available.status, 'AVAILABLE');
  assert.equal(available.data.stations.length, 1);
});

test('empty selected-source responses are explicit instead of borrowing other stations', () => {
  for (const message of ['현재 제공된 RISA 관측 정점이 없습니다', '조석 예측 이벤트가 제공되지 않았습니다', '소해구의 예보 행이 제공되지 않았습니다', '선택한 정점의 관측값이 제공되지 않았습니다']) assert.ok(hub.includes(message), message);
});

test('station data requires an explicit exact station selection', () => {
  const rows = [{ stationId: '1', value: 10 }, { stationId: '2', value: 12 }];
  assert.equal(selectExplicitStation(rows, ''), null);
  assert.equal(selectExplicitStation(rows, '3'), null);
  assert.equal(selectExplicitStation(rows, '2'), rows[1]);
});

test('tide date is a Seoul calendar date even across a UTC day boundary', () => {
  assert.equal(formatSeoulCalendarDate(new Date('2026-09-25T15:30:00Z')), '2026-09-26');
  assert.match(hub, /date=\$\{encodeURIComponent\(tideDate\)\}/);
  assert.match(hub, /id="today-tide-date" type="date"/);
});

test('existing source APIs are reused without a combined upstream adapter', () => {
  for (const route of [
    '/api/fishing-condition/environment/realtime',
    '/api/sea-info/marine-observations/stations',
    '/api/sea-info/marine-observations?stationId=',
    '/api/sea-info/marine-forecast?',
    '/api/sea-info/tide?obsCode=',
    '/api/sea-info/weather-warnings',
    '/api/sea-info/navigation-warnings',
  ]) assert.ok(hub.includes(route), route);
  assert.doesNotMatch(hub, /femo|FEMO/i);
});

test('forecast, observation, prediction and reference notices have distinct labels', () => {
  for (const label of ['MODEL/FORECAST', 'OBSERVED', 'PREDICTION', '특보 · 참고정보', '공지 · 참고정보']) assert.ok(hub.includes(label), label);
  for (const source of ['기상청', '국립해양조사원', '국립수산과학원']) assert.ok(hub.includes(source), source);
});

test('RISA retains station timestamps, depth layers, stale status and undocumented timezone', () => {
  for (const token of ['surfaceC', 'middleC', 'bottomC', 'rawObservedAt', 'TIMEZONE_NOT_DOCUMENTED', 'selectedRisa.freshness', 'fetchedAt']) assert.ok(hub.includes(token), token);
  assert.match(hub, /selectedRisa\.freshness === "unavailable"/);
  assert.match(hub, /수온 값은 표시하지 않습니다/);
});

test('warning absence and UNKNOWN lifecycle never produce a safety verdict', () => {
  assert.match(hub, /현재 조회된 특보 없음/);
  assert.match(hub, /표시 건수 0도 안전 판정이 아닙니다/);
  assert.match(hub, /UNKNOWN lifecycle은 확정된 현재 위험구역으로 해석하지 않습니다/);
});

test('KMA observation has a default-off server boundary and source-time freshness', () => {
  const server = read('src/lib/sea-info/kma-marine-observation-server.ts');
  for (const route of ['src/app/api/sea-info/marine-observations/route.ts', 'src/app/api/sea-info/marine-observations/stations/route.ts', 'src/app/api/sea-info/marine-observations/[stationId]/route.ts']) {
    assert.match(read(route), /SOURCE_DISABLED/);
  }
  assert.match(server, /KMA_MARINE_OBSERVATION_ENABLED !== "true"/);
  assert.match(server, /requireKmaMarineObservationEnabled\(\)/);
  assert.match(hub, /deriveKmaObservationFreshness\(selectedObservation\?\.observedAt\)/);
  assert.match(hub, /selectedObservationFreshness === "unavailable"/);
});

test('selected observation badge follows source timestamp without hiding source failures', () => {
  const source = { status: 'AVAILABLE', data: { observations: [] }, code: null };
  assert.equal(classifySelectedObservationSource(source, true, 'stale').status, 'STALE');
  assert.equal(classifySelectedObservationSource(source, true, 'unavailable').status, 'UNKNOWN');
  assert.equal(classifySelectedObservationSource(source, false, 'fresh').status, 'UNKNOWN');
  assert.equal(classifySelectedObservationSource(source, true, 'fresh').status, 'AVAILABLE');
  assert.equal(classifySelectedObservationSource({ ...source, status: 'STALE' }, true, 'fresh').status, 'STALE');
  assert.equal(classifySelectedObservationSource({ ...source, status: 'ERROR' }, true, 'fresh').status, 'ERROR');
  assert.match(hub, /state=\{kmaStationId \? observationCardState : kmaStations\}/);
});

test('tide stays a prediction and never becomes safe-depth guidance', () => {
  assert.match(hub, /조석 예측을 실제 관측이나 안전 수심으로 해석하지 않습니다/);
  assert.match(hub, /DATUM_NOT_DOCUMENTED/);
});

test('navigation links contain no inferred destination or species decision', () => {
  assert.match(hub, /href="\/sea"/);
  assert.match(hub, /href="\/sea\/navigation"/);
  assert.match(hub, /href="\/fishing-spots\/conditions"/);
  assert.doesNotMatch(hub, /href="\/sea\/navigation\?/);
  assert.doesNotMatch(hub, /nearest|closest|geolocation|safeRoute/i);
});

test('cinematic hero remains and unsupported optimization claims are removed', () => {
  assert.match(hero, /TODAYS_SEA_VIDEO_PATH/);
  assert.match(hero, /공공 데이터 확인/);
  assert.doesNotMatch(hero, /최적 출항 시간|추천 포인트|안전한 출조를 계획하세요/);
  assert.match(page, /<TodaySeaOperationalHub \/>/);
});

test('mobile and desktop layout retain accessible source selection', () => {
  assert.match(hub, /sm:grid-cols-2/);
  assert.match(hub, /lg:grid-cols-2/);
  assert.match(hub, /pb-28/);
  assert.match(hub, /min-w-0/);
  for (const id of ['today-risa-station', 'today-tide-station', 'today-kma-station']) assert.ok(hub.includes(`htmlFor="${id}"`));
  assert.match(read('src/components/boat/ai-captain/BlueMarinaCaptainWidget.tsx'), /pathname === "\/today-sea"/);
  assert.match(read('src/components/boat/ai-captain/BlueMarinaCaptainWidget.tsx'), /max-sm:hidden/);
});

test('no score, recommendation engine or station inference is introduced', () => {
  const source = `${hub}\n${hero}\n${helperSource}`;
  assert.doesNotMatch(source, /seaScore|safetyScore|fishingScore|recommendationScore|riskScore|bestTime|bestSpot|catchProbability/);
  assert.doesNotMatch(source, /findNearest|nearestStation|tideDepth|depthSafety/i);
});
