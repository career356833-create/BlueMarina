import type { TideObservationResponse } from "@/lib/sea-info/types";

type RecordLike = Record<string, unknown>;

export type TideObservationParseResult =
  | { ok: true; data: TideObservationResponse }
  | { ok: false; code: "INVALID_UPSTREAM_RESPONSE" | "UNSUPPORTED_UPSTREAM_SCHEMA" | "UPSTREAM_ERROR"; message: string };

const SUCCESS_CODES = new Set(["00", "0", "SUCCESS", "INFO-000"]);

function record(value: unknown): RecordLike | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === "string" ? value.replaceAll(",", "").trim() : value;
  if (normalized === "") return null;
  const parsed = typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function items(value: unknown): RecordLike[] {
  if (Array.isArray(value)) return value.filter((item): item is RecordLike => record(item) !== null);
  const node = record(value);
  if (!node) return [];
  if (Array.isArray(node.item)) return node.item.filter((item): item is RecordLike => record(item) !== null);
  const item = record(node.item);
  return item ? [item] : [];
}

function toKstIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}+09:00` : null;
}

function metadata() {
  return {
    sourceOrganization: "국립해양조사원" as const,
    sourceName: "조위관측소 실측·예측 조위" as const,
    levelUnit: "cm" as const,
    datumStatus: "DATUM_NOT_DOCUMENTED" as const,
    updatedAt: new Date().toISOString(),
    isMock: false as const,
  };
}

export function parseKhoaTideObservationPayload(payload: unknown, obsCode: string, reqDate: string): TideObservationParseResult {
  const root = record(payload);
  if (!root) return { ok: false, code: "INVALID_UPSTREAM_RESPONSE", message: "국립해양조사원 실측 조위 응답을 해석하지 못했습니다." };

  const response = record(root.response) ?? root;
  const header = record(response.header) ?? {};
  const body = record(response.body);
  const resultCode = text(header.resultCode);
  if (resultCode && !SUCCESS_CODES.has(resultCode)) {
    return { ok: false, code: "UPSTREAM_ERROR", message: text(header.resultMsg) || "국립해양조사원 실측 조위 API가 오류 응답을 반환했습니다." };
  }
  if (!body) return { ok: false, code: "UNSUPPORTED_UPSTREAM_SCHEMA", message: "국립해양조사원 실측 조위 응답 구조를 지원하지 않습니다." };

  const observations = items(body.items ?? body.item)
    .map((item) => {
      const observedAt = toKstIso(text(item.obsrvnDt));
      const levelCm = number(item.bscTdlvHgt);
      return observedAt && levelCm !== null ? { observedAt, levelCm, stationName: text(item.obsvtrNm) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));

  const latest = observations[0];
  return {
    ok: true,
    data: latest ? {
      status: "ready",
      station: { obsCode, ...(latest.stationName ? { name: latest.stationName } : {}) },
      date: reqDate,
      observation: { observedAt: latest.observedAt, levelCm: latest.levelCm },
      metadata: metadata(),
    } : {
      status: "unavailable",
      station: { obsCode },
      date: reqDate,
      metadata: metadata(),
    },
  };
}
