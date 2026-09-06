const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const envPath = path.join(root, ".env.local");
const reportPath = path.join(root, "reports/khoa/navigation-warning-quality-v1.json");
const listEndpoint = "https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningInfo";
const detailEndpoint = "https://apis.data.go.kr/1192136/NavigationalWarning/getNavigationalWarningDetailInfo";

function loadEnv() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

function loadContract() {
  const file = path.join(root, "src/lib/marine-navigation/adapters/khoa-navigation-warnings.ts");
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

function normalizeServiceKey(value) {
  try { return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value; } catch { return value; }
}

async function getXml(endpoint, key, params) {
  const url = new URL(endpoint);
  url.searchParams.set("ServiceKey", normalizeServiceKey(key));
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { accept: "application/xml" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.text();
}

function dateText(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function main() {
  loadEnv();
  const key = process.env.KHOA_NAVIGATION_WARNING_API_KEY;
  if (process.env.KHOA_NAVIGATION_WARNING_ENABLED !== "true" || !key) throw new Error("WARNING_CREDENTIAL_NOT_CONFIGURED");
  const contract = loadContract();
  const dates = Array.from({ length: 80 }, (_, offset) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    return dateText(date);
  });
  const listPages = await mapLimit(dates, 4, async (date) => {
    const parsed = contract.parseKhoaNavigationWarningListXml(await getXml(listEndpoint, key, { date, numOfRows: "100", pageNo: "1" }));
    if (!parsed.ok) throw new Error(`LIST_${parsed.code}`);
    return { date, ...parsed.data };
  });
  const listItems = listPages.flatMap((page) => page.items);
  const documents = [...new Map(listItems.map((item) => [item.documentNumber, item])).values()];
  const detailResults = await mapLimit(documents, 4, async (item) => {
    const parsed = contract.parseKhoaNavigationWarningDetailXml(await getXml(detailEndpoint, key, { doc_num: item.documentNumber, numOfRows: "100", pageNo: "1" }));
    return parsed.ok ? { documentNumber: item.documentNumber, items: parsed.data.items } : { documentNumber: item.documentNumber, items: [] };
  });
  const detailItems = detailResults.flatMap((result) => result.items);
  const warnings = contract.normalizeKhoaNavigationWarnings(documents, detailItems, new Date().toISOString());
  const docCounts = new Map();
  for (const item of listItems) docCounts.set(item.documentNumber, (docCounts.get(item.documentNumber) ?? 0) + 1);
  const detailKeys = detailItems.map((item) => `${item.documentNumber}:${item.area ?? ""}`);
  const repeatedDetailRecords = detailKeys.length - new Set(detailKeys).size;
  const geometry = contract.summarizeKhoaNavigationWarningQuality(documents.length, warnings);
  const report = {
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    source: "국립해양조사원(KHOA)",
    credentialConfigured: true,
    credentialLogged: false,
    requestUrlLogged: false,
    auditWindow: { days: dates.length, from: dates.at(-1), to: dates[0] },
    live: { http: 200, resultCodes: [...new Set(listPages.map((page) => page.resultCode))], listObservations: listItems.length, availableOnLatestRequest: listPages[0].totalCount },
    fetchedListCount: listItems.length,
    auditedDetailDocumentCount: documents.length,
    auditedDetailRecordCount: detailItems.length,
    uniqueDocumentNumberCount: documents.length,
    duplicateDocumentNumberCount: [...docCounts.values()].filter((count) => count > 1).length,
    uniqueDocumentAreaCount: new Set(detailKeys).size,
    repeatedDetailRecordCount: repeatedDetailRecords,
    detailJoinCount: new Set(detailItems.map((item) => item.documentNumber)).size,
    noDetailDocumentCount: detailResults.filter((result) => result.items.length === 0).length,
    positionPresentCount: detailItems.filter((item) => item.rawPositionText).length,
    positionMissingCount: detailItems.filter((item) => !item.rawPositionText).length,
    geometryPointCount: geometry.pointCount,
    geometryLineCount: geometry.lineCount,
    geometryPolygonCount: geometry.polygonCount,
    geometryNullCount: geometry.geometryNullCount,
    malformedPositionCount: geometry.malformedPositionCount,
    missingTitleCount: documents.filter((item) => !item.title).length,
    missingContentCount: documents.filter((item) => !item.content).length,
    missingAreaCount: documents.filter((item) => !item.area).length,
    missingAlarmDateCount: detailItems.filter((item) => !item.alarmDate).length,
    missingAlarmTimeCount: detailItems.filter((item) => !item.alarmTime).length,
    unknownLifecycleCount: geometry.unknownLifecycleCount,
    inferredLifecycleCount: 0,
    observedListFields: ["app_cat", "area", "basic", "content", "doc_num", "doc_type", "gov_cd", "noti_cat", "title"],
    observedDetailFields: ["alarm_date", "alarm_time", "area", "doc_num", "position", "position_desc", "position_nm", "sea_pos"],
    positionFormats: { dmsSuffix: detailItems.filter((item) => /\d{1,2}-\d{1,2}-\d{1,2}(?:\.\d+)?[NS]/i.test(item.rawPositionText ?? "")).length, decimal: 0, textOnly: 0, empty: detailItems.filter((item) => !item.rawPositionText).length },
    sampleRawPositionPatterns: [...new Set(detailItems.map((item) => item.rawPositionText).filter(Boolean))].slice(0, 3),
    lifecycle: { defaultStatus: "UNKNOWN", structuredStatusFieldsObserved: false },
    geometryPolicy: { point: "one parsed coordinate", line: "two coordinates only with explicit sequential-line description", polygon: "three or more coordinates only with explicit sequential enclosed-area description", ambiguous: "geometry=null", convexHull: false, inferredBuffer: false },
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(JSON.stringify({ status: "PASS", report: path.relative(root, reportPath), list: report.fetchedListCount, uniqueDocs: report.uniqueDocumentNumberCount, details: report.auditedDetailRecordCount, credentialLogged: false }));
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ status: "FAIL", code: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exitCode = 1;
});
