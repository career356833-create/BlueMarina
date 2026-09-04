const fs = require("node:fs");
const path = require("node:path");
const { XMLParser } = require("fast-xml-parser");

const ENDPOINT = "https://apis.data.go.kr/1192136/Buoy/getBuoyInfo";
const BUSAN_CSV_URL = "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003167928&fileDetailSn=1&insertDataPrcus=N";
const CATEGORY_CODES = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09"];
const MAX_ROWS = 5_000;
const REQUEST_TIMEOUT_MS = 15_000;
const REPORT_PATH = path.resolve(process.cwd(), "reports/khoa/navigation-aids-quality-v1.json");

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const entries = fs.readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    if (separator <= 0 || line.trimStart().startsWith("#")) return [];
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [[name, value]];
  });
  return Object.fromEntries(entries);
}

function normalizeServiceKey(value) {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

function asString(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseCoordinate(value, minimum, maximum) {
  const raw = asString(value);
  if (!raw) return null;
  const decimal = Number(raw);
  if (Number.isFinite(decimal) && decimal >= minimum && decimal <= maximum) return decimal;

  const direction = raw.match(/[NSEW]\s*$/i)?.[0].trim().toUpperCase() ?? null;
  const directionalDecimal = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*([NSEW])$/i);
  if (directionalDecimal) {
    const absolute = Math.abs(Number(directionalDecimal[1]));
    const sign = /[SW]/i.test(directionalDecimal[2]) ? -1 : 1;
    const parsed = sign * absolute;
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
  }
  const components = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (components.length !== 3) return null;
  const [degrees, minutes, seconds] = components;
  if (minutes >= 60 || seconds >= 60) return null;
  const sign = direction === "S" || direction === "W" || raw.trimStart().startsWith("-") ? -1 : 1;
  const parsed = sign * (degrees + minutes / 60 + seconds / 3_600);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function normalizeName(value) {
  return (asString(value) ?? "").replace(/\s+/g, "").toLowerCase();
}

function distanceMeters(left, right) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = radians(right.latitude - left.latitude);
  const deltaLongitude = radians(right.longitude - left.longitude);
  const latitude1 = radians(left.latitude);
  const latitude2 = radians(right.latitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(value);
      value = "";
    } else value += character;
  }
  fields.push(value);
  return fields;
}

async function crosscheckBusan(records) {
  const response = await fetch(BUSAN_CSV_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`BUSAN_SOURCE_${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let text = new TextDecoder("utf-8").decode(bytes);
  if (text.includes("\uFFFD")) text = new TextDecoder("euc-kr").decode(bytes);
  const rows = text.split(/\r?\n/).slice(1).filter(Boolean).map(parseCsvLine);
  const liveByName = new Map();
  for (const { item } of records) {
    const name = normalizeName(item.buoyKr);
    if (!name) continue;
    const latitude = parseCoordinate(item.wgs84North, -90, 90);
    const longitude = parseCoordinate(item.wgs84East, -180, 180);
    if (latitude === null || longitude === null) continue;
    const candidates = liveByName.get(name) ?? [];
    candidates.push({ latitude, longitude });
    liveByName.set(name, candidates);
  }
  const samples = rows.slice(0, 20).map((row) => {
    const [sourceId, name, active, , position] = row;
    const [latitudeRaw, longitudeRaw] = (position ?? "").split(",").map((part) => part.trim());
    const latitude = parseCoordinate(latitudeRaw, -90, 90);
    const longitude = parseCoordinate(longitudeRaw, -180, 180);
    const candidates = liveByName.get(normalizeName(name)) ?? [];
    const distances = latitude === null || longitude === null
      ? []
      : candidates.map((candidate) => distanceMeters({ latitude, longitude }, candidate));
    const nearestDistanceMeters = distances.length > 0 ? Math.round(Math.min(...distances)) : null;
    return {
      sourceId,
      name,
      active,
      nameMatched: candidates.length > 0,
      nearestDistanceMeters,
      coordinateMatchedWithin250m: nearestDistanceMeters !== null && nearestDistanceMeters <= 250,
    };
  });
  return {
    sourceRowCount: rows.length,
    sampleCount: samples.length,
    nameMatchedCount: samples.filter((sample) => sample.nameMatched).length,
    coordinateMatchedWithin250mCount: samples.filter((sample) => sample.coordinateMatchedWithin250m).length,
    typeComparison: "UNAVAILABLE_SECONDARY_STRUCTURED_FIELD",
    statusComparison: "UNAVAILABLE_PRIMARY_FIELD",
    differences: samples.filter((sample) => !sample.nameMatched || !sample.coordinateMatchedWithin250m),
  };
}

async function fetchCategory(serviceKey, categoryCode) {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    ServiceKey: serviceKey,
    buoyNm: categoryCode,
    numOfRows: String(MAX_ROWS),
    pageNo: "1",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const xml = await response.text();
  const parsed = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true }).parse(xml);
  const payload = parsed?.response;
  const resultCode = asString(payload?.header?.resultCode);
  if (!response.ok || (resultCode !== "00" && resultCode !== "0")) {
    throw new Error(`UPSTREAM_${response.status}_${resultCode ?? "UNKNOWN"}`);
  }
  let items = payload?.body?.items?.item ?? [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  return {
    httpStatus: response.status,
    resultCode,
    totalCount: Number(payload?.body?.totalCount ?? 0),
    items,
  };
}

async function main() {
  const localEnv = loadLocalEnv();
  const configuredKey = process.env.KHOA_NAVIGATION_AIDS_API_KEY || localEnv.KHOA_NAVIGATION_AIDS_API_KEY;
  if (!configuredKey) throw new Error("NAVIGATION_AIDS_CREDENTIAL_MISSING");
  const serviceKey = normalizeServiceKey(configuredKey);
  const categoryResults = [];
  const records = [];

  for (const categoryCode of CATEGORY_CODES) {
    const result = await fetchCategory(serviceKey, categoryCode);
    categoryResults.push({
      categoryCode,
      httpStatus: result.httpStatus,
      resultCode: result.resultCode,
      totalCount: result.totalCount,
      fetchedCount: result.items.length,
    });
    records.push(...result.items.map((item) => ({ categoryCode, item })));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const seen = new Set();
  const duplicateIds = new Set();
  const aidTypeLabels = {};
  const detailedTypeLabels = {};
  const coordinateFormats = { decimal: 0, directionalDecimal: 0, dms: 0, invalid: 0 };
  const exactSignatures = new Set();
  const distinctRecordsById = new Map();
  let exactDuplicateCount = 0;
  const coordinateBounds = { minLatitude: 90, maxLatitude: -90, minLongitude: 180, maxLongitude: -180 };
  const anomalies = [];
  let validCoordinateCount = 0;
  let zeroCoordinateCount = 0;
  let outsideKoreaEnvelopeCount = 0;
  let missingKoreanNameCount = 0;
  let missingEnglishNameCount = 0;
  let missingTypeCount = 0;
  let missingLightCharacteristicCount = 0;
  let missingIdCount = 0;
  let duplicateOccurrenceCount = 0;

  for (const { categoryCode, item } of records) {
    const id = asString(item.blfrNo);
    if (id) {
      if (seen.has(id)) {
        duplicateIds.add(id);
        duplicateOccurrenceCount += 1;
      }
      seen.add(id);
    } else missingIdCount += 1;
    const koreanName = asString(item.buoyKr);
    const englishName = asString(item.buoyEn);
    const aidTypeLabel = asString(item.buoyNm);
    const detailedTypeLabel = asString(item.kindCd);
    const lightCharacteristic = asString(item.lgt_property);
    if (!koreanName) missingKoreanNameCount += 1;
    if (!englishName) missingEnglishNameCount += 1;
    if (!aidTypeLabel) missingTypeCount += 1;
    if (!lightCharacteristic) missingLightCharacteristicCount += 1;
    increment(aidTypeLabels, aidTypeLabel ?? "<missing>");
    increment(detailedTypeLabels, detailedTypeLabel ?? "<missing>");

    const latitudeRaw = asString(item.wgs84North);
    const longitudeRaw = asString(item.wgs84East);
    const latitude = parseCoordinate(latitudeRaw, -90, 90);
    const longitude = parseCoordinate(longitudeRaw, -180, 180);
    if (latitude === null || longitude === null) {
      coordinateFormats.invalid += 1;
      if (anomalies.length < 20) anomalies.push({ id, categoryCode, code: "INVALID_COORDINATE" });
      continue;
    }
    validCoordinateCount += 1;
    if (Number.isFinite(Number(latitudeRaw)) && Number.isFinite(Number(longitudeRaw))) coordinateFormats.decimal += 1;
    else if (/^[+-]?\d+(?:\.\d+)?\s*[NSEW]$/i.test(latitudeRaw) && /^[+-]?\d+(?:\.\d+)?\s*[NSEW]$/i.test(longitudeRaw)) coordinateFormats.directionalDecimal += 1;
    else coordinateFormats.dms += 1;
    coordinateBounds.minLatitude = Math.min(coordinateBounds.minLatitude, latitude);
    coordinateBounds.maxLatitude = Math.max(coordinateBounds.maxLatitude, latitude);
    coordinateBounds.minLongitude = Math.min(coordinateBounds.minLongitude, longitude);
    coordinateBounds.maxLongitude = Math.max(coordinateBounds.maxLongitude, longitude);
    const signature = [categoryCode, id, latitude, longitude, koreanName, aidTypeLabel, detailedTypeLabel].join("|");
    if (exactSignatures.has(signature)) exactDuplicateCount += 1;
    exactSignatures.add(signature);
    if (id) {
      const variants = distinctRecordsById.get(id) ?? new Map();
      variants.set(signature, {
        categoryCode,
        koreanName,
        officialTypeLabel: aidTypeLabel,
        detailedTypeLabel,
        latitude,
        longitude,
      });
      distinctRecordsById.set(id, variants);
    }
    if (latitude === 0 && longitude === 0) zeroCoordinateCount += 1;
    if (latitude < 30 || latitude > 40 || longitude < 122 || longitude > 133) {
      outsideKoreaEnvelopeCount += 1;
      if (anomalies.length < 20) anomalies.push({ id, categoryCode, code: "OUTSIDE_KOREA_ENVELOPE", latitude, longitude });
    }
  }

  const busanCrosscheck = await crosscheckBusan(records);
  const sourceIdentityConflicts = [...distinctRecordsById.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([sourceRecordId, variants]) => ({
      sourceRecordId,
      normalizedFeatureCount: variants.size,
      variants: [...variants.values()],
    }))
    .sort((left, right) => left.sourceRecordId.localeCompare(right.sourceRecordId));
  const report = {
    generatedAt: new Date().toISOString(),
    source: "KHOA",
    endpoint: ENDPOINT,
    requestCount: CATEGORY_CODES.length,
    categoryResults,
    totalCountSum: categoryResults.reduce((sum, result) => sum + result.totalCount, 0),
    fetchedCount: records.length,
    uniqueIdCount: seen.size,
    missingIdCount,
    duplicateIdCount: duplicateIds.size,
    duplicateOccurrenceCount,
    duplicateIdSample: [...duplicateIds].sort().slice(0, 20),
    exactDuplicateCount,
    normalizedFeatureCount: exactSignatures.size,
    sourceIdentityConflictCount: sourceIdentityConflicts.length,
    sourceIdentityConflicts,
    validCoordinateCount,
    invalidCoordinateCount: records.length - validCoordinateCount,
    coordinateFormats,
    coordinateBounds,
    zeroCoordinateCount,
    outsideKoreaEnvelopeCount,
    missingKoreanNameCount,
    missingEnglishNameCount,
    missingTypeCount,
    missingLightCharacteristicCount,
    aidTypeLabels,
    detailedTypeLabels,
    anomalySample: anomalies,
    busanCrosscheck,
    credentialLogged: false,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "FAILED", code: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exitCode = 1;
});
