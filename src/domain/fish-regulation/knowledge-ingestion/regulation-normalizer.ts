import type { NormalizedClosedSeason, NormalizedMeasurement } from "./regulation-fact-candidate";

export function normalizeClosedSeason(value?: string): NormalizedClosedSeason | undefined {
  if (!value) return undefined;
  const text = normalizeKoreanDateText(value);
  const match = text.match(/(\d{1,2})월\s*(\d{1,2})일\s*(?:부터|~|-)\s*(\d{1,2})월\s*(\d{1,2})일(?:까지)?/);
  if (!match) return undefined;
  return {
    type: "closed_season",
    start: `${pad(match[1])}-${pad(match[2])}`,
    end: `${pad(match[3])}-${pad(match[4])}`,
    raw: value
  };
}

export function normalizeMeasurement(value?: string): NormalizedMeasurement | undefined {
  if (!value) return undefined;
  const text = value
    .replace(/\s+/g, " ")
    .replace(/센티미터/g, "cm")
    .replace(/킬로그램/g, "kg")
    .replace(/그램/g, "g")
    .trim();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(cm|kg|g|mm|m)\s*(이하|미만|이상|초과)?|(\d+(?:\.\d+)?)\s*(이하|미만|이상|초과)?\s*(cm|kg|g|mm|m)/i);
  if (!match) return undefined;
  const valueText = match[1] ?? match[4];
  const unit = match[2] ?? match[6];
  const operatorText = match[3] ?? match[5] ?? "미만";
  const numericValue = Number(valueText);
  if (!Number.isFinite(numericValue) || !unit) return undefined;
  return {
    operator: normalizeOperator(operatorText),
    value: numericValue,
    unit,
    raw: value
  };
}

export function normalizeWaterArea(region?: string) {
  if (!region) return undefined;
  if (/전해역|전국/.test(region)) return "전국/전해역";
  if (/서해/.test(region)) return "서해";
  if (/동해/.test(region)) return "동해";
  if (/남해/.test(region)) return "남해";
  if (/연안/.test(region)) return "연안";
  return region;
}

function normalizeKoreanDateText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/(\d{1,2})\s*월/g, "$1월")
    .replace(/(\d{1,2})\s*일/g, "$1일")
    .replace(/[~〜∼－–—]/g, "~")
    .trim();
}

function normalizeOperator(value: string): NormalizedMeasurement["operator"] {
  if (value === "이하") return "LESS_EQUAL";
  if (value === "미만") return "LESS_THAN";
  if (value === "이상") return "GREATER_EQUAL";
  if (value === "초과") return "GREATER_THAN";
  return "EQUAL";
}

function pad(value?: string) {
  return String(value ?? "").padStart(2, "0");
}
