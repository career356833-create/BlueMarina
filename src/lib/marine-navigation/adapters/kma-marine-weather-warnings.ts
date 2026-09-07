export const KMA_MARINE_WEATHER_WARNINGS_LAYER_ID = "kma-marine-weather-warnings";
export const KMA_MARINE_WEATHER_WARNING_SAFETY_NOTICE =
  "해상특보는 기상청 공식 특보의 참고 표시이며 실제 출항·운항 가능 여부를 자동 판정하지 않습니다. 최신 기상청 특보와 관계기관 안내를 반드시 확인하세요.";

export type KmaWarningLifecycle = "UPCOMING" | "ACTIVE" | "ENDED" | "CANCELLED" | "UNKNOWN";
export type KmaWarningFreshness = "fresh" | "stale" | "unavailable";

export type KmaWarningZone = {
  regionId: string;
  validFrom: string | null;
  validUntil: string | null;
  characteristicCode: string | null;
  parentRegionId: string | null;
  shortName: string | null;
  fullName: string | null;
  isMarine: boolean;
};

export type KmaWarningHistoryRow = {
  issuedAt: string | null;
  effectiveAt: string | null;
  inputAt: string | null;
  stationCode: string | null;
  regionId: string;
  warningCode: string;
  warningLevelCode: string;
  commandCode: string;
};

export type KmaMarineWeatherWarning = {
  id: string;
  regionId: string;
  parentRegionId: string | null;
  warningCode: string;
  warningType: string;
  warningLevelCode: string;
  warningLevel: string;
  commandCode: string;
  command: string;
  issuedAt: string | null;
  effectiveAt: string | null;
  expectedEndText: string | null;
  areaName: string | null;
  status: KmaWarningLifecycle;
  historyMatched: boolean;
  geometry: null;
  source: "기상청(KMA)";
  fetchedAt: string;
};

export type KmaMarineWeatherWarningsResponse = {
  ok: true;
  warnings: KmaMarineWeatherWarning[];
  fetchedAt: string;
  lastSuccessfulFetchAt: string;
  freshness: KmaWarningFreshness;
  source: "기상청(KMA)";
  logicalLayerId: typeof KMA_MARINE_WEATHER_WARNINGS_LAYER_ID;
  geometryCount: 0;
  quality: {
    currentRows: number;
    marineRelevantRows: number;
    excludedLandRows: number;
    uniqueRegionIds: number;
    historyRows: number;
    zoneRows: number;
    seaZoneRows: number;
    metadataJoinCount: number;
    metadataJoinRate: number;
    panelOnlyCount: number;
    missingIssuedTime: number;
    missingEffectiveTime: number;
    typeDistribution: Record<string, number>;
    levelDistribution: Record<string, number>;
    commandDistribution: Record<string, number>;
    lifecycleDistribution: Record<KmaWarningLifecycle, number>;
    anomalies: string[];
  };
};

type UnknownRecord = Record<string, unknown>;

const WARNING_CODE_BY_LABEL: Record<string, string> = { "풍랑": "V", "강풍": "W", "태풍": "T" };
const WARNING_LABEL_BY_CODE: Record<string, string> = { V: "풍랑", W: "강풍", T: "태풍" };
const LEVEL_CODE_BY_LABEL: Record<string, string> = { "예비": "1", "예비특보": "1", "주의": "2", "주의보": "2", "경보": "3" };
const LEVEL_LABEL_BY_CODE: Record<string, string> = { "1": "예비특보", "2": "주의보", "3": "경보" };
const COMMAND_CODE_BY_LABEL: Record<string, string> = { "발표": "1", "대치": "2", "해제": "3", "대치해제": "4", "연장": "5", "변경": "6", "변경해제": "7" };
const COMMAND_LABEL_BY_CODE: Record<string, string> = { "1": "발표", "2": "대치", "3": "해제", "4": "대치해제", "5": "연장", "6": "변경", "7": "변경해제" };

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function parseKmaWarningTimestamp(value: unknown): string | null {
  const raw = text(value);
  if (!raw || !/^\d{12}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:00+09:00`;
}

function normalizeWarningCode(value: unknown) {
  const raw = text(value)?.toUpperCase() ?? "";
  return WARNING_CODE_BY_LABEL[raw] ?? raw;
}

function normalizeLevelCode(value: unknown) {
  const raw = text(value) ?? "";
  return LEVEL_CODE_BY_LABEL[raw] ?? raw;
}

function normalizeCommandCode(value: unknown) {
  const raw = (text(value) ?? "").replace(/[·/\s]/g, "");
  return COMMAND_CODE_BY_LABEL[raw] ?? raw;
}

export function isOfficialMarineWarningRegion(regionId: string) {
  return /^S\d{7}$/.test(regionId);
}

export function deriveKmaWarningLifecycle(commandCode: string, effectiveAt: string | null, now = Date.now()): KmaWarningLifecycle {
  if (["3", "4", "7"].includes(commandCode)) return "ENDED";
  if (!["1", "2", "5", "6"].includes(commandCode) || !effectiveAt) return "UNKNOWN";
  return Date.parse(effectiveAt) > now ? "UPCOMING" : "ACTIVE";
}

function currentRows(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(record).filter((row): row is UnknownRecord => row !== null);
  const root = record(value);
  if (!root) return [];
  for (const key of ["data", "items", "item", "result"]) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate.map(record).filter((row): row is UnknownRecord => row !== null);
    const nested = record(candidate);
    if (nested) {
      const nestedRows = currentRows(nested);
      if (nestedRows.length) return nestedRows;
    }
  }
  return text(root.REG_ID) ? [root] : [];
}

export function parseKmaCurrentWarnings(value: unknown, fetchedAt: string, now = Date.now()): KmaMarineWeatherWarning[] {
  return currentRows(value).flatMap((row) => {
    const regionId = text(row.REG_ID);
    const warningCode = normalizeWarningCode(row.WRN);
    if (!regionId || !warningCode) return [];
    const warningLevelCode = normalizeLevelCode(row.LVL);
    const commandCode = normalizeCommandCode(row.CMD);
    const issuedAt = parseKmaWarningTimestamp(row.TM_FC);
    const effectiveAt = parseKmaWarningTimestamp(row.TM_EF);
    return [{
      id: `${regionId}:${warningCode}:${text(row.TM_FC) ?? "unknown"}:${text(row.TM_EF) ?? "unknown"}:${commandCode || "unknown"}`,
      regionId,
      parentRegionId: text(row.REG_UP),
      warningCode,
      warningType: WARNING_LABEL_BY_CODE[warningCode] ?? text(row.WRN) ?? warningCode,
      warningLevelCode,
      warningLevel: LEVEL_LABEL_BY_CODE[warningLevelCode] ?? text(row.LVL) ?? warningLevelCode,
      commandCode,
      command: COMMAND_LABEL_BY_CODE[commandCode] ?? text(row.CMD) ?? commandCode,
      issuedAt,
      effectiveAt,
      expectedEndText: text(row.ED_TM),
      areaName: text(row.REG_KO),
      status: deriveKmaWarningLifecycle(commandCode, effectiveAt, now),
      historyMatched: false,
      geometry: null,
      source: "기상청(KMA)" as const,
      fetchedAt,
    }];
  });
}

export function parseKmaWarningHistory(input: string): KmaWarningHistoryRow[] {
  return input.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const fields = trimmed.split(",").map((field) => field.trim());
    if (fields.length < 8 || !/^\d{12}$/.test(fields[0]) || !/^[LS]\d{7}$/.test(fields[4])) return [];
    return [{ issuedAt: parseKmaWarningTimestamp(fields[0]), effectiveAt: parseKmaWarningTimestamp(fields[1]), inputAt: parseKmaWarningTimestamp(fields[2]), stationCode: fields[3] || null, regionId: fields[4], warningCode: normalizeWarningCode(fields[5]), warningLevelCode: normalizeLevelCode(fields[6]), commandCode: normalizeCommandCode(fields[7]) }];
  });
}

export function parseKmaWarningZones(input: string): KmaWarningZone[] {
  return input.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([LS]\d{7})\s+(\d{12})\s+(\d{12})\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) return [];
    const names = match[6].trim().split(/\s{2,}/).filter(Boolean);
    return [{
      regionId: match[1],
      validFrom: parseKmaWarningTimestamp(match[2]),
      validUntil: parseKmaWarningTimestamp(match[3]),
      characteristicCode: match[4] || null,
      parentRegionId: match[5] === "00000000" ? null : match[5],
      shortName: names[0] ?? null,
      fullName: names[1] ?? names[0] ?? null,
      isMarine: isOfficialMarineWarningRegion(match[1]),
    }];
  });
}

export function normalizeKmaMarineWeatherWarnings(current: KmaMarineWeatherWarning[], history: KmaWarningHistoryRow[], zones: KmaWarningZone[]) {
  const zoneById = new Map(zones.map((zone) => [zone.regionId, zone]));
  const historyKeys = new Set(history.map((row) => `${row.regionId}:${row.warningCode}`));
  return current
    .filter((warning) => warning.warningCode === "V" || (["W", "T"].includes(warning.warningCode) && isOfficialMarineWarningRegion(warning.regionId)))
    .map((warning) => {
      const zone = zoneById.get(warning.regionId);
      return { ...warning, parentRegionId: zone?.parentRegionId ?? warning.parentRegionId, areaName: zone?.fullName ?? zone?.shortName ?? warning.areaName, historyMatched: historyKeys.has(`${warning.regionId}:${warning.warningCode}`) };
    });
}

function distribution(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => { result[value || "UNKNOWN"] = (result[value || "UNKNOWN"] ?? 0) + 1; return result; }, {});
}

export function summarizeKmaMarineWeatherWarnings(current: KmaMarineWeatherWarning[], warnings: KmaMarineWeatherWarning[], history: KmaWarningHistoryRow[], zones: KmaWarningZone[]) {
  const joined = warnings.filter((warning) => zones.some((zone) => zone.regionId === warning.regionId)).length;
  const lifecycleDistribution = { UPCOMING: 0, ACTIVE: 0, ENDED: 0, CANCELLED: 0, UNKNOWN: 0 } satisfies Record<KmaWarningLifecycle, number>;
  for (const warning of warnings) lifecycleDistribution[warning.status] += 1;
  return {
    currentRows: current.length,
    marineRelevantRows: warnings.length,
    excludedLandRows: current.length - warnings.length,
    uniqueRegionIds: new Set(warnings.map((warning) => warning.regionId)).size,
    historyRows: history.length,
    zoneRows: zones.length,
    seaZoneRows: zones.filter((zone) => zone.isMarine).length,
    metadataJoinCount: joined,
    metadataJoinRate: warnings.length ? Number((joined / warnings.length).toFixed(4)) : 1,
    panelOnlyCount: warnings.length,
    missingIssuedTime: warnings.filter((warning) => !warning.issuedAt).length,
    missingEffectiveTime: warnings.filter((warning) => !warning.effectiveAt).length,
    typeDistribution: distribution(warnings.map((warning) => warning.warningCode)),
    levelDistribution: distribution(warnings.map((warning) => warning.warningLevelCode)),
    commandDistribution: distribution(warnings.map((warning) => warning.commandCode)),
    lifecycleDistribution,
    anomalies: warnings.filter((warning) => !warning.historyMatched).map((warning) => `HISTORY_NOT_MATCHED:${warning.regionId}:${warning.warningCode}`),
  };
}

export function parseKmaMarineWeatherWarningsResponse(value: unknown): KmaMarineWeatherWarningsResponse {
  const input = record(value);
  if (!input || input.ok !== true || !Array.isArray(input.warnings) || input.logicalLayerId !== KMA_MARINE_WEATHER_WARNINGS_LAYER_ID) throw new Error("Invalid KMA marine-weather-warning response");
  return value as KmaMarineWeatherWarningsResponse;
}
