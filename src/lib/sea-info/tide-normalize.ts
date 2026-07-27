import type { TideEventType, TideForecastEvent, TideForecastResponse, TideSummary } from "@/lib/sea-info/types";

type RecordLike = Record<string, unknown>;

export type TidePayloadParseSuccess = {
  ok: true;
  data: TideForecastResponse;
  schemaHints?: {
    topLevelKeys: string[];
    responseKeys: string[];
    itemKeys: string[];
  };
};

export type TidePayloadParseFailure = {
  ok: false;
  code: "INVALID_UPSTREAM_RESPONSE" | "UNSUPPORTED_UPSTREAM_SCHEMA" | "UPSTREAM_ERROR";
  message: string;
  schemaHints?: {
    topLevelKeys: string[];
    responseKeys: string[];
    itemKeys: string[];
  };
};

const SUCCESS_CODES = new Set(["00", "0", "SUCCESS", "INFO-000"]);

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function getRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getHeaderCode(header: RecordLike) {
  for (const key of ["resultCode", "resultCd", "code", "status"]) {
    const value = getString(header[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function getHeaderMessage(header: RecordLike) {
  for (const key of ["resultMsg", "resultMessage", "message", "msg"]) {
    const value = getString(header[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

export function normalizeTideRequestDate(input: string) {
  const trimmed = input.trim();
  const compact = /^\d{8}$/.test(trimmed) ? trimmed : /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed.replaceAll("-", "") : "";

  if (!compact) {
    return null;
  }

  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6));
  const day = Number(compact.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return compact;
}

function toKstIso(dateString: string, timeString: string) {
  const compactDate = dateString.replace(/\D/g, "");
  const compactTime = timeString.replace(/\D/g, "");

  if (!/^\d{8}$/.test(compactDate) || !/^\d{4,6}$/.test(compactTime)) {
    return null;
  }

  const hh = compactTime.slice(0, 2);
  const mm = compactTime.slice(2, 4);
  const ss = compactTime.length >= 6 ? compactTime.slice(4, 6) : "00";

  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}T${hh}:${mm}:${ss}+09:00`;
}

function normalizeOccurredAt(raw: string, reqDate: string) {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/^\d{8}\s\d{4,6}$/.test(value)) {
    const [date, time] = value.split(/\s+/);
    return toKstIso(date, time);
  }

  if (/^\d{8}\d{4,6}$/.test(value)) {
    return toKstIso(value.slice(0, 8), value.slice(8));
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.replace(" ", "T").split("T");
    return toKstIso(datePart.replaceAll("-", ""), timePart.replaceAll(":", ""));
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return toKstIso(reqDate, value.replaceAll(":", ""));
  }

  if (/^\d{4,6}$/.test(value)) {
    return toKstIso(reqDate, value);
  }

  return null;
}

function detectTideTypeFromValue(value: string): TideEventType | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["1", "3", "h", "high", "고조"].includes(normalized)) {
    return "high";
  }

  if (["2", "4", "l", "low", "저조"].includes(normalized)) {
    return "low";
  }

  return null;
}

function detectTideType(item: RecordLike): TideEventType {
  const candidates = ["extrSe", "hlCode", "hlSe", "tideType", "type", "state", "extremeType"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    const direct = detectTideTypeFromValue(String(value));
    if (direct) {
      return direct;
    }
  }

  for (const [key, value] of Object.entries(item)) {
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    if (/hl|type|extreme|state/i.test(key)) {
      const hinted = detectTideTypeFromValue(String(value));
      if (hinted) {
        return hinted;
      }
    }
  }

  return "unknown";
}

function detectOccurredAt(item: RecordLike, reqDate: string) {
  const candidates = ["predcDt", "fcstDateTime", "fcstDt", "predcTm", "occurredAt", "dateTime", "datetime", "time"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value !== "string") {
      continue;
    }

    const normalized = normalizeOccurredAt(value, reqDate);
    if (normalized) {
      return normalized;
    }
  }

  const keys = Object.keys(item).sort((left, right) => {
    const leftScore = /date|time|datetime|dt/i.test(left) ? 0 : 1;
    const rightScore = /date|time|datetime|dt/i.test(right) ? 0 : 1;
    return leftScore - rightScore;
  });

  for (const key of keys) {
    const value = item[key];
    if (typeof value !== "string") {
      continue;
    }

    const normalized = normalizeOccurredAt(value, reqDate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function detectPredictedLevel(item: RecordLike) {
  const candidates = ["predcTdlvVl", "predictedLevel", "tideLevel", "predLevel", "level", "height", "waterLevel"];
  for (const key of candidates) {
    const value = getNumber(item[key]);
    if (value !== null) {
      return value;
    }
  }

  const entries = Object.entries(item).filter(([key]) => !/(^|)(lat|lng|lot|lnt|x|y|lon|long)/i.test(key));
  for (const [, value] of entries.sort((left, right) => {
    const leftScore = /level|height|tide|조위/i.test(left[0]) ? 0 : 1;
    const rightScore = /level|height|tide|조위/i.test(right[0]) ? 0 : 1;
    return leftScore - rightScore;
  })) {
    const parsed = getNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return undefined;
}

function detectStationName(item: RecordLike) {
  for (const key of ["obsvtrNm", "obsName", "obsNm", "stationName", "stnName", "portName", "obsPostName"]) {
    const value = getString(item[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractItemsArray(itemsNode: unknown): RecordLike[] {
  if (Array.isArray(itemsNode)) {
    return itemsNode.filter(isRecord);
  }

  if (!isRecord(itemsNode)) {
    return [];
  }

  if (Array.isArray(itemsNode.item)) {
    return itemsNode.item.filter(isRecord);
  }

  if (isRecord(itemsNode.item)) {
    return [itemsNode.item];
  }

  for (const value of Object.values(itemsNode)) {
    if (Array.isArray(value)) {
      const records = value.filter(isRecord);
      if (records.length > 0) {
        return records;
      }
    }
  }

  return [];
}

function compareOccurredAt(left: TideForecastEvent, right: TideForecastEvent) {
  return left.occurredAt.localeCompare(right.occurredAt);
}

export function toSeaSummaryTide(events: TideForecastEvent[]): TideSummary {
  const nextHigh = events.find((event) => event.type === "high");
  const nextLow = events.find((event) => event.type === "low");

  return {
    nextHighTideAt: nextHigh?.occurredAt ?? null,
    nextLowTideAt: nextLow?.occurredAt ?? null,
    tidePhase: "unknown"
  };
}

export function parseKhoaTidePayload(payload: unknown, obsCode: string, reqDate: string): TidePayloadParseSuccess | TidePayloadParseFailure {
  const root = getRecord(payload);
  if (!root) {
    return {
      ok: false,
      code: "INVALID_UPSTREAM_RESPONSE",
      message: "국립해양조사원 응답을 해석하지 못했습니다."
    };
  }

  const responseNode = getRecord(root.response) ?? root;
  const headerNode = getRecord(responseNode.header) ?? {};
  const bodyNode = getRecord(responseNode.body);
  const topLevelKeys = Object.keys(root);
  const responseKeys = Object.keys(responseNode);

  const headerCode = getHeaderCode(headerNode);
  const headerMessage = getHeaderMessage(headerNode);
  if (headerCode && !SUCCESS_CODES.has(headerCode)) {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: headerMessage || "국립해양조사원 API가 오류 응답을 반환했습니다.",
      schemaHints: {
        topLevelKeys,
        responseKeys,
        itemKeys: []
      }
    };
  }

  if (!bodyNode) {
    return {
      ok: false,
      code: "UNSUPPORTED_UPSTREAM_SCHEMA",
      message: "국립해양조사원 응답 구조를 아직 지원하지 않습니다.",
      schemaHints: {
        topLevelKeys,
        responseKeys,
        itemKeys: []
      }
    };
  }

  const itemsNode = bodyNode.items ?? bodyNode.item ?? [];
  const rawItems = extractItemsArray(itemsNode);

  if (rawItems.length === 0) {
    return {
      ok: true,
      data: {
        status: "unavailable",
        station: { obsCode },
        date: reqDate,
        events: [],
        tideSummary: {
          nextHighTideAt: null,
          nextLowTideAt: null,
          tidePhase: "unknown"
        },
        metadata: {
          sourceOrganization: "국립해양조사원",
          sourceName: "조석예보(고·저조)",
          updatedAt: new Date().toISOString(),
          isMock: false
        }
      },
      schemaHints: {
        topLevelKeys,
        responseKeys,
        itemKeys: []
      }
    };
  }

  const itemKeys = Array.from(new Set(rawItems.flatMap((item) => Object.keys(item)))).sort();
  const events = rawItems
    .map((item) => {
      const occurredAt = detectOccurredAt(item, reqDate);
      if (!occurredAt) {
        return null;
      }

      const eventType = detectTideType(item);
      const predictedLevel = detectPredictedLevel(item);
      return predictedLevel === undefined
        ? ({ occurredAt, type: eventType } satisfies TideForecastEvent)
        : ({ occurredAt, type: eventType, predictedLevel } satisfies TideForecastEvent);
    })
    .filter((event): event is TideForecastEvent => event !== null)
    .sort(compareOccurredAt);

  if (events.length === 0) {
    return {
      ok: false,
      code: "UNSUPPORTED_UPSTREAM_SCHEMA",
      message: "국립해양조사원 응답에서 조석 이벤트를 추출하지 못했습니다.",
      schemaHints: {
        topLevelKeys,
        responseKeys,
        itemKeys
      }
    };
  }

  const stationName = detectStationName(rawItems[0]);
  const tideSummary = toSeaSummaryTide(events);
  const nextHigh = events.find((event) => event.type === "high");
  const nextLow = events.find((event) => event.type === "low");
  const unknownTypeCount = events.filter((event) => event.type === "unknown").length;

  return {
    ok: true,
    data: {
      status: unknownTypeCount > 0 ? "partial" : "ready",
      station: {
        obsCode,
        name: stationName
      },
      date: reqDate,
      events,
      nextHighTideAt: nextHigh?.occurredAt,
      nextLowTideAt: nextLow?.occurredAt,
      tideSummary,
      metadata: {
        sourceOrganization: "국립해양조사원",
        sourceName: "조석예보(고·저조)",
        updatedAt: new Date().toISOString(),
        isMock: false
      }
    },
    schemaHints: {
      topLevelKeys,
      responseKeys,
      itemKeys
    }
  };
}
