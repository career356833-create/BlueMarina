export type TideInfoResult =
  | {
      ok: true;
      status: number;
      stationId: string;
      date: string;
      data: unknown;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      stationId?: string;
      date?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function fetchTideInfo(stationId: string, date: string): Promise<TideInfoResult> {
  if (!stationId || !date) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_REQUEST",
      message: "관측소와 날짜가 필요합니다.",
      stationId,
      date
    };
  }

  const params = new URLSearchParams({ stationId, date });

  try {
    const response = await fetch(`/api/sea-info/tide?${params.toString()}`, {
      cache: "no-store"
    });
    const payload: unknown = await response.json().catch(() => null);

    if (response.ok && isRecord(payload) && payload.ok === true) {
      return {
        ok: true,
        status: response.status,
        stationId: getString(payload.stationId) || stationId,
        date: getString(payload.date) || date,
        data: payload.data
      };
    }

    if (isRecord(payload)) {
      return {
        ok: false,
        status: response.status,
        code: getString(payload.code) || "API_ERROR",
        message: getString(payload.message) || "해양정보 API 응답을 가져오지 못했습니다.",
        stationId: getString(payload.stationId) || stationId,
        date: getString(payload.date) || date
      };
    }

    return {
      ok: false,
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "해양정보 API 응답 형식이 올바르지 않습니다.",
      stationId,
      date
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
      message: "해양정보 API 요청 중 네트워크 오류가 발생했습니다.",
      stationId,
      date
    };
  }
}
