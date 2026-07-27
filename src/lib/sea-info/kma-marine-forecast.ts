import { findKmaMarineZoneByCoordinate } from "./kma-marine-zone.ts";

export type KmaMarineForecastStatus = "ready" | "unavailable";

export type KmaMarineForecast = {
  status: KmaMarineForecastStatus;
  zone: {
    lzone: number;
    szone: number;
  };
  forecast?: {
    issuedAt: string;
    validAt: string;
    significantWaveHeightM: number | null;
    maxWavePeriodSec: number | null;
    waveDirectionDeg: number | null;
    windSpeedMps: number | null;
    windDirectionDeg: number | null;
    visibilityM: number | null;
    precipitationMm: number | null;
    waterTemperatureC: number | null;
    swellRisk: string | number | null;
  };
  metadata: {
    sourceOrganization: "기상청";
    sourceName: "소해구별 예측데이터";
    updatedAt: string;
    isMock: false;
  };
};

export type KmaMarineForecastParseResult =
  | {
      ok: true;
      data: KmaMarineForecast;
      header: string[];
      rowCount: number;
    }
  | {
      ok: false;
      code: "EMPTY_RESPONSE" | "CSV_HEADER_NOT_FOUND" | "CSV_ROW_NOT_FOUND" | "MISSING_REQUIRED_FIELD";
      message: string;
      header?: string[];
      rowCount?: number;
    };

const REQUIRED_FIELDS = ["tma_fc", "tma_ef", "Lzone", "Szone"] as const;
const NUMERIC_FIELDS = new Set(["wh_sig", "wvprd_max", "wvdr", "ws", "wd", "vs", "rain", "tw"]);

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatUtcDateHour(date: Date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}${pad2(date.getUTCHours())}`;
}

export function parseUtcDateHour(value: string) {
  if (!/^\d{10}$/.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour
  ) {
    return null;
  }

  return date;
}

export function getLatestKmaIssueTime(now = new Date()) {
  const issueHour = now.getUTCHours() >= 12 ? 12 : 0;
  return formatUtcDateHour(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), issueHour)));
}

export function getNearestKmaValidTime(now = new Date(), issueTime = getLatestKmaIssueTime(now)) {
  const issueDate = parseUtcDateHour(issueTime);
  if (!issueDate) {
    return null;
  }

  const roundedHour = Math.round(now.getUTCHours() / 3) * 3;
  const rounded = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  rounded.setUTCHours(roundedHour);

  const minTime = issueDate.getTime();
  const maxTime = minTime + 75 * 60 * 60 * 1000;
  const clamped = new Date(Math.min(Math.max(rounded.getTime(), minTime), maxTime));

  return formatUtcDateHour(clamped);
}

export function utcDateHourToIso(value: string) {
  const date = parseUtcDateHour(value);
  return date ? date.toISOString() : value;
}

export function normalizeKmaMissingValue(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-999" || trimmed === "-999.0") {
    return null;
  }

  return trimmed;
}

function parseMaybeNumber(value: string | undefined) {
  const normalized = normalizeKmaMissingValue(value);
  if (normalized === null) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseSwellRisk(value: string | undefined) {
  const normalized = normalizeKmaMissingValue(value);
  if (normalized === null) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : normalized;
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseKmaMarineForecastCsv(csvText: string, lzone: number, szone: number): KmaMarineForecastParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      ok: false,
      code: "EMPTY_RESPONSE",
      message: "기상청 소해구별 예측데이터 응답이 비어 있습니다."
    };
  }

  if (lines.length === 1 && /해구번호/.test(lines[0])) {
    return {
      ok: true,
      data: {
        status: "unavailable",
        zone: {
          lzone,
          szone
        },
        metadata: {
          sourceOrganization: "기상청",
          sourceName: "소해구별 예측데이터",
          updatedAt: new Date().toISOString(),
          isMock: false
        }
      },
      header: [],
      rowCount: 0
    };
  }

  const headerIndex = lines.findIndex((line) => {
    const fields = splitCsvLine(line);
    return fields.includes("tma_fc") && fields.includes("tma_ef") && fields.includes("Lzone") && fields.includes("Szone");
  });

  if (headerIndex < 0) {
    return {
      ok: false,
      code: "CSV_HEADER_NOT_FOUND",
      message: "기상청 CSV 헤더를 찾지 못했습니다."
    };
  }

  const header = splitCsvLine(lines[headerIndex]);
  for (const field of REQUIRED_FIELDS) {
    if (!header.includes(field)) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_FIELD",
        message: `기상청 CSV 필수 필드가 없습니다: ${field}`,
        header
      };
    }
  }

  const rows = lines.slice(headerIndex + 1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });

  const selectedRow =
    rows.find((row) => Number(row.Lzone) === lzone && Number(row.Szone) === szone) ??
    rows.find((row) => Number(row.Lzone) === lzone);

  if (!selectedRow) {
    return {
      ok: true,
      data: {
        status: "unavailable",
        zone: {
          lzone,
          szone
        },
        metadata: {
          sourceOrganization: "기상청",
          sourceName: "소해구별 예측데이터",
          updatedAt: new Date().toISOString(),
          isMock: false
        }
      },
      header,
      rowCount: rows.length
    };
  }

  const hasAnyForecastField = Array.from(NUMERIC_FIELDS).some((field) => normalizeKmaMissingValue(selectedRow[field]) !== null);
  if (!hasAnyForecastField) {
    return {
      ok: true,
      data: {
        status: "unavailable",
        zone: {
          lzone,
          szone
        },
        metadata: {
          sourceOrganization: "기상청",
          sourceName: "소해구별 예측데이터",
          updatedAt: new Date().toISOString(),
          isMock: false
        }
      },
      header,
      rowCount: rows.length
    };
  }

  return {
    ok: true,
    data: {
      status: "ready",
      zone: {
        lzone: Number(selectedRow.Lzone) || lzone,
        szone: Number(selectedRow.Szone) || szone
      },
      forecast: {
        issuedAt: utcDateHourToIso(selectedRow.tma_fc),
        validAt: utcDateHourToIso(selectedRow.tma_ef),
        significantWaveHeightM: parseMaybeNumber(selectedRow.wh_sig),
        maxWavePeriodSec: parseMaybeNumber(selectedRow.wvprd_max),
        waveDirectionDeg: parseMaybeNumber(selectedRow.wvdr),
        windSpeedMps: parseMaybeNumber(selectedRow.ws),
        windDirectionDeg: parseMaybeNumber(selectedRow.wd),
        visibilityM: parseMaybeNumber(selectedRow.vs),
        precipitationMm: parseMaybeNumber(selectedRow.rain),
        waterTemperatureC: parseMaybeNumber(selectedRow.tw),
        swellRisk: parseSwellRisk(selectedRow.swell)
      },
      metadata: {
        sourceOrganization: "기상청",
        sourceName: "소해구별 예측데이터",
        updatedAt: new Date().toISOString(),
        isMock: false
      }
    },
    header,
    rowCount: rows.length
  };
}

export function resolveKmaMarineZoneFromQuery(searchParams: URLSearchParams) {
  const rawLzone = searchParams.get("Lzone") ?? searchParams.get("lzone");
  const rawSzone = searchParams.get("Szone") ?? searchParams.get("szone");
  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");

  if (rawLzone && rawSzone) {
    const lzone = Number(rawLzone);
    const szone = Number(rawSzone);
    if (Number.isInteger(lzone) && Number.isInteger(szone) && szone >= 1 && szone <= 9) {
      return {
        ok: true as const,
        lzone,
        szone,
        source: "explicit" as const
      };
    }

    return {
      ok: false as const,
      code: "INVALID_ZONE",
      message: "Lzone/Szone 값이 올바르지 않습니다."
    };
  }

  if (!rawLat || !rawLng) {
    return {
      ok: false as const,
      code: "MISSING_LOCATION",
      message: "lat/lng 또는 Lzone/Szone이 필요합니다."
    };
  }

  const lat = Number(rawLat);
  const lng = Number(rawLng);
  const mapped = findKmaMarineZoneByCoordinate(lat, lng);
  if ((mapped.status === "matched" || mapped.status === "boundary") && mapped.lzone && mapped.szone) {
    return {
      ok: true as const,
      lzone: mapped.lzone,
      szone: mapped.szone,
      source: mapped.status,
      zoneMatch: mapped
    };
  }

  return {
    ok: false as const,
    code: mapped.status === "ambiguous" ? "AMBIGUOUS_ZONE" : "ZONE_NOT_FOUND",
    message: mapped.reason ?? "입력 좌표에 해당하는 기상청 해구를 찾지 못했습니다.",
    zoneMatch: mapped
  };
}
