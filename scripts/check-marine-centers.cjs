/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const expectedTypeCounts = {
  "written-test": 31,
  "practical-test": 30,
  "safety-education": 31,
  "exemption-education": 35
};
const validTypes = new Set(Object.keys(expectedTypeCounts));
const validLicenses = new Set(["general", "yacht"]);
const validStatuses = new Set(["active", "unknown", "closed"]);
const mojibakeMarkers = ["�", "????", "怨듭", "硫", "湲", "諛", "珥"];

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, "src", request.slice(2)), parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;

  module._compile(output, filename);
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCleanText(value, field, id) {
  if (typeof value !== "string") return;
  for (const marker of mojibakeMarkers) {
    assert(!value.includes(marker), `${id} ${field} contains mojibake marker: ${marker}`);
  }
}

const { marineCenters } = require("../src/data/marine-centers.ts");

assert(Array.isArray(marineCenters), "marineCenters must be an array");
assert(marineCenters.length === 127, `marine center count must be 127, received ${marineCenters.length}`);

const ids = new Set();
const typeCounts = Object.fromEntries(Object.keys(expectedTypeCounts).map((type) => [type, 0]));
let officialUrlCount = 0;
let coordinateCount = 0;
let writtenTestUnknownLicenseCount = 0;

for (const center of marineCenters) {
  assert(typeof center.id === "string" && center.id.trim().length > 0, "center id is required");
  assert(!ids.has(center.id), `duplicate center id: ${center.id}`);
  ids.add(center.id);

  assert(validTypes.has(center.type), `${center.id} invalid type: ${center.type}`);
  typeCounts[center.type] += 1;
  assert(typeof center.name === "string" && center.name.trim().length > 0, `${center.id} name is required`);
  assert(typeof center.region === "string" && center.region.trim().length > 0, `${center.id} region is required`);
  assert(typeof center.address === "string" && center.address.trim().length > 0, `${center.id} address is required`);
  assert(typeof center.sourceCheckedAt === "string" && center.sourceCheckedAt.trim().length > 0, `${center.id} sourceCheckedAt is required`);
  assert(!center.status || validStatuses.has(center.status), `${center.id} invalid status: ${center.status}`);

  for (const field of ["id", "name", "region", "city", "address", "phone", "officialUrl", "sourceUrl", "sourceCheckedAt", "note", "status"]) {
    assertCleanText(center[field], field, center.id);
  }

  const licenses = center.availableLicenses ?? [];
  assert(Array.isArray(licenses), `${center.id} availableLicenses must be an array`);
  for (const license of licenses) {
    assert(validLicenses.has(license), `${center.id} invalid license: ${license}`);
  }

  if (center.type === "written-test" && licenses.length === 0) {
    writtenTestUnknownLicenseCount += 1;
    assert(
      typeof center.note === "string" && center.note.includes("필기시험장 응시 가능 면허는 공식 접수 화면 확인 필요"),
      `${center.id} written-test empty license note is required`
    );
  }

  if (center.officialUrl) {
    officialUrlCount += 1;
    assert(/^https?:\/\//.test(center.officialUrl), `${center.id} officialUrl must be http(s)`);
  }

  if (typeof center.lat === "number" || typeof center.lng === "number") {
    assert(typeof center.lat === "number" && typeof center.lng === "number", `${center.id} lat/lng must be paired`);
    coordinateCount += 1;
  }
}

for (const [type, expectedCount] of Object.entries(expectedTypeCounts)) {
  assert(typeCounts[type] === expectedCount, `${type} count must be ${expectedCount}, received ${typeCounts[type]}`);
}

assert(writtenTestUnknownLicenseCount === 31, `written-test unknown license count must be 31, received ${writtenTestUnknownLicenseCount}`);

console.log(
  [
    "Marine centers check passed:",
    `${marineCenters.length} centers`,
    `typeCounts=${JSON.stringify(typeCounts)}`,
    `officialUrls=${officialUrlCount}`,
    `coordinates=${coordinateCount}`
  ].join(" ")
);
