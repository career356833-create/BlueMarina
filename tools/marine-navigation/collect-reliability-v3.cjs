#!/usr/bin/env node
// Manual, bounded, read-only upstream collection. Writes only versioned local artifacts.
// Never print credentials, request URLs, raw payloads, or personal data.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { loadEnvConfig } = require('@next/env');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

const root = path.resolve(__dirname, '../..');
loadEnvConfig(root, true);
function loadTs(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(require, module, module.exports);
  return module.exports;
}
const aids = loadTs('src/lib/marine-navigation/adapters/khoa-navigation-aids.ts');
const warnings = loadTs('src/lib/marine-navigation/adapters/khoa-navigation-warnings.ts');
const core = loadTs('src/lib/marine-navigation/reliability-v3.ts');
const directory = path.join(root, 'src/data/marine-navigation/v3');
const aidPath = path.join(directory, 'navigation-aids.json');
const listPath = path.join(directory, 'navigation-warning-list.json');
const detailsPath = path.join(directory, 'navigation-warning-details.json');
const options = new Set(process.argv.slice(2));
const mode = [...options].find((value) => ['--aids', '--warnings', '--all'].includes(value)) ?? '--all';
const forceRefresh = options.has('--force-refresh');
const probeAll = options.has('--probe-all');
const maxMinutesArg = [...options].find((value) => value.startsWith('--max-minutes='));
const maxMinutes = maxMinutesArg ? Number(maxMinutesArg.split('=')[1]) : 6;
if (!Number.isFinite(maxMinutes) || maxMinutes < 0.25 || maxMinutes > 15) throw new Error('INVALID_MAX_MINUTES');
const deadline = Date.now() + maxMinutes * 60_000;
const aidRows = 25;
const warningRows = 20;
const maxAidPages = 160;
const maxWarningPages = 20;
const xmlParser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

function loadJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function atomicWrite(file, value) {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  try { fs.renameSync(temporary, file); }
  catch (error) { fs.rmSync(temporary, { force: true }); throw error; }
}
function key(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_MISSING`);
  try { return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value; }
  catch { return value; }
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function classify(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'TIMEOUT';
  if (/^UPSTREAM_HTTP_5\d\d$/.test(error?.message ?? '')) return error.message;
  if (/^UPSTREAM_HTTP_4\d\d$/.test(error?.message ?? '')) return 'UPSTREAM_4XX';
  if (/INVALID|INCOMPLETE|COUNT|PAGE_LIMIT/.test(error?.message ?? '')) return 'INVALID_OR_INCOMPLETE_SOURCE';
  return 'NETWORK_OR_PARSE_ERROR';
}
function validatedAidPage(xml, categoryId) {
  if (XMLValidator.validate(xml) !== true) throw new Error('INVALID_OR_INCOMPLETE_XML');
  const parsed = aids.parseKhoaNavigationAidsXml(xml, categoryId);
  if (!parsed.ok) throw new Error(parsed.code);
  const body = xmlParser.parse(xml)?.response?.body;
  const rawItems = body?.items?.item;
  const rawItemCount = Array.isArray(rawItems) ? rawItems.length : rawItems ? 1 : 0;
  return { ...parsed.data, completeXml: true, rawItemCount };
}
async function requestXml(endpoint, params, requestTimeoutMs = 8_000) {
  const url = new URL(endpoint);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (Date.now() >= deadline) throw new Error('RUN_WINDOW_EXHAUSTED');
    if (attempt) await sleep(500 + Math.floor(Math.random() * 250));
    try {
      const remaining = deadline - Date.now();
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(Math.min(requestTimeoutMs, remaining)), headers: { accept: 'application/xml' } });
      if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
      const body = await response.text();
      if (Buffer.byteLength(body, 'utf8') > 2_000_000) throw new Error('INVALID_RESPONSE_SIZE');
      return body;
    } catch (error) {
      lastError = error;
      if (error?.message === 'UPSTREAM_HTTP_401' || error?.message === 'UPSTREAM_HTTP_403') break;
    }
  }
  throw lastError;
}
async function pace() { await sleep(200 + Math.floor(Math.random() * 150)); }

async function collectAidCategory(categoryId, serviceKey) {
  const pages = [];
  let total = null;
  for (let pageNo = 1; pageNo <= maxAidPages; pageNo += 1) {
    const xml = await requestXml(aids.KHOA_NAVIGATION_AIDS_ENDPOINT, { ServiceKey: serviceKey, buoyNm: categoryId, numOfRows: aidRows, pageNo });
    const page = validatedAidPage(xml, categoryId);
    if (pageNo === 1) {
      total = page.totalCount;
      if (Math.ceil(total / aidRows) > maxAidPages) throw new Error('PAGE_LIMIT_EXCEEDED');
    }
    if (!core.validateAidPage(page, categoryId, total, pageNo, aidRows)) throw new Error('INVALID_OR_INCOMPLETE_PAGE');
    pages.push(page);
    if (pages.reduce((count, part) => count + part.rawItemCount, 0) >= total) break;
    await pace();
  }
  return core.buildAidSnapshot(categoryId, pages, new Date().toISOString(), aidRows);
}

async function collectAids() {
  const serviceKey = key('KHOA_NAVIGATION_AIDS_API_KEY');
  const store = loadJson(aidPath);
  if (probeAll) {
    for (const categoryId of core.AID_CATEGORY_IDS) {
      if (Date.now() >= deadline) break;
      if (!core.shouldCollectAid(store, categoryId, forceRefresh)) continue;
      const attemptedAt = new Date().toISOString();
      try {
        const xml = await requestXml(aids.KHOA_NAVIGATION_AIDS_ENDPOINT, { ServiceKey: serviceKey, buoyNm: categoryId, numOfRows: aidRows, pageNo: 1 });
        const page = validatedAidPage(xml, categoryId);
        if (!core.validateAidPage(page, categoryId, page.totalCount, 1, aidRows)) throw new Error('INVALID_FIRST_PAGE');
        core.recordAidAttempt(store, categoryId, attemptedAt, null, 'COLLECTION_PENDING');
        console.log(JSON.stringify({ source: 'aids', categoryId, result: 'PROBED', totalCount: page.totalCount }));
      } catch (error) {
        core.recordAidAttempt(store, categoryId, attemptedAt, null, classify(error));
        console.log(JSON.stringify({ source: 'aids', categoryId, result: 'PROBE_FAILED', errorClass: classify(error) }));
      }
      atomicWrite(aidPath, store);
      await pace();
    }
  }
  // Smaller categories first: valid work survives if the bounded window ends on a large category.
  const order = ['A07', 'A09', 'A08', 'A04', 'A05', 'A06', 'A01', 'A02', 'A03'];
  for (const categoryId of order) {
    if (Date.now() >= deadline) break;
    const previous = store.categories[categoryId] ?? { lastAttemptAt: null, lastSuccessAt: null, lastErrorClass: null, attemptCount: 0 };
    if (!core.shouldCollectAid(store, categoryId, forceRefresh)) {
      console.log(JSON.stringify({ source: 'aids', categoryId, result: 'SKIPPED_VALID', itemCount: previous.snapshot.itemCount }));
      continue;
    }
    const attemptedAt = new Date().toISOString();
    try {
      const snapshot = await collectAidCategory(categoryId, serviceKey);
      const slot = core.recordAidAttempt(store, categoryId, attemptedAt, snapshot, null);
      console.log(JSON.stringify({ source: 'aids', categoryId, result: 'VALID', attempts: slot.attemptCount, itemCount: snapshot.itemCount, checksum: snapshot.payloadChecksum, lastSuccessAt: slot.lastSuccessAt }));
    } catch (error) {
      const slot = core.recordAidAttempt(store, categoryId, attemptedAt, null, classify(error));
      console.log(JSON.stringify({ source: 'aids', categoryId, result: 'FAILED', attempts: slot.attemptCount, errorClass: slot.lastErrorClass, retainedValid: core.isValidAidSnapshot(previous.snapshot, categoryId) }));
    }
    atomicWrite(aidPath, store);
    await pace();
  }
  console.log(JSON.stringify({ source: 'aids', aggregate: core.evaluateAids(store), itemsOmitted: true }, (key, value) => key === 'items' ? undefined : value));
}

async function fetchWarningPage(endpoint, serviceKey, params, parser, rows, expectedTotal, pageNo) {
  const xml = await requestXml(endpoint, { ServiceKey: serviceKey, numOfRows: rows, pageNo, ...params }, 20_000);
  if (XMLValidator.validate(xml) !== true) throw new Error('INVALID_OR_INCOMPLETE_XML');
  const metadataPresent = ['totalCount', 'pageNo', 'numOfRows'].every((name) => new RegExp(`<${name}>\\s*\\d+\\s*</${name}>`).test(xml));
  const parsed = parser(xml);
  if (!parsed.ok) throw new Error(parsed.code);
  const page = parsed.data;
  const total = expectedTotal ?? page.totalCount;
  if (!core.validateWarningPage(page, metadataPresent, total, pageNo, rows, params.doc_num)) throw new Error('INCOMPLETE_WARNING_PAGE');
  return page;
}
async function collectWarningPages(endpoint, serviceKey, params, parser, rows, maxPages) {
  const first = await fetchWarningPage(endpoint, serviceKey, params, parser, rows, null, 1);
  const total = first.totalCount;
  const pageCount = Math.max(1, Math.ceil(total / rows));
  if (pageCount > maxPages) throw new Error('PAGE_LIMIT_EXCEEDED');
  const items = [...first.items];
  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    await pace();
    const page = await fetchWarningPage(endpoint, serviceKey, params, parser, rows, total, pageNo);
    items.push(...page.items);
  }
  if (items.length !== total) throw new Error('INCOMPLETE_WARNING_TOTAL');
  return items;
}

async function collectWarnings() {
  const serviceKey = key('KHOA_NAVIGATION_WARNING_API_KEY');
  const listStore = loadJson(listPath);
  const detailStore = loadJson(detailsPath);
  const listEndpoint = 'https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningInfo';
  const detailEndpoint = 'https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningDetailInfo';
  listStore.lastAttemptAt = new Date().toISOString();
  try {
    const items = await collectWarningPages(listEndpoint, serviceKey, {}, warnings.parseKhoaNavigationWarningListXml, 100, 10);
    const fetchedAt = new Date().toISOString();
    const documentNumbers = [...new Set(items.map((item) => item.documentNumber))];
    listStore.snapshot = { source: '국립해양조사원(KHOA)', fetchedAt, itemCount: items.length, documentNumbers, payloadChecksum: core.checksum(items), items };
    listStore.lastSuccessAt = fetchedAt;
    listStore.lastErrorClass = null;
    atomicWrite(listPath, listStore);
    console.log(JSON.stringify({ source: 'warning-list', result: 'VALID', documents: documentNumbers.length, lastSuccessAt: fetchedAt, checksum: listStore.snapshot.payloadChecksum }));
    for (const documentNumber of documentNumbers) {
      if (Date.now() >= deadline) break;
      const previous = detailStore.documents[documentNumber] ?? { lastAttemptAt: null, lastSuccessAt: null, lastErrorClass: null };
      const slot = { ...previous, lastAttemptAt: new Date().toISOString() };
      try {
        const details = await collectWarningPages(detailEndpoint, serviceKey, { doc_num: documentNumber }, warnings.parseKhoaNavigationWarningDetailXml, warningRows, maxWarningPages);
        if (details.length === 0 || details.some((detail) => detail.documentNumber !== documentNumber)) throw new Error('INVALID_DOCUMENT_DETAILS');
        const successAt = new Date().toISOString();
        slot.snapshot = { documentNumber, fetchedAt: successAt, itemCount: details.length, payloadChecksum: core.checksum(details), items: details };
        slot.lastSuccessAt = successAt;
        slot.lastErrorClass = null;
        console.log(JSON.stringify({ source: 'warning-detail', documentNumber, result: 'VALID', itemCount: details.length, lastSuccessAt: successAt }));
      } catch (error) {
        slot.lastErrorClass = classify(error);
        console.log(JSON.stringify({ source: 'warning-detail', documentNumber, result: 'FAILED', errorClass: slot.lastErrorClass }));
      }
      detailStore.documents[documentNumber] = slot;
      atomicWrite(detailsPath, detailStore);
      await pace();
    }
  } catch (error) {
    listStore.lastErrorClass = classify(error);
    atomicWrite(listPath, listStore);
    console.log(JSON.stringify({ source: 'warning-list', result: 'FAILED', errorClass: listStore.lastErrorClass, retainedHistorical: core.validWarningList(listStore.snapshot) }));
  }
  const evaluated = core.evaluateWarnings(listStore, detailStore);
  console.log(JSON.stringify({ source: 'warnings', state: evaluated.state, documents: evaluated.documentNumbers.length, failedDocumentNumbers: evaluated.failedDocumentNumbers, dataMode: evaluated.dataMode, freshness: evaluated.freshness }));
}

(async () => {
  if (mode === '--aids' || mode === '--all') await collectAids();
  if (mode === '--warnings' || mode === '--all') await collectWarnings();
})().catch((error) => {
  console.error(JSON.stringify({ errorClass: classify(error) }));
  process.exitCode = 1;
});
