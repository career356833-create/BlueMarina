import { NextResponse } from "next/server";

type TideApiErrorCode = "MISSING_STATION" | "MISSING_DATE" | "INVALID_DATE" | "API_KEY_MISSING" | "ENDPOINT_NOT_READY" | "UPSTREAM_ERROR";

type TideApiErrorBody = {
  ok: false;
  code: TideApiErrorCode;
  message: string;
  stationId?: string;
  date?: string;
};

type TideApiSuccessBody = {
  ok: true;
  stationId: string;
  date: string;
  data: unknown;
};

const KHOA_TIDE_ENDPOINT = "";

function errorResponse(body: TideApiErrorBody, status: number) {
  return NextResponse.json(body, { status });
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId") ?? searchParams.get("obsCode") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!stationId) {
    return errorResponse(
      {
        ok: false,
        code: "MISSING_STATION",
        message: "stationId 또는 obsCode가 필요합니다."
      },
      400
    );
  }

  if (!date) {
    return errorResponse(
      {
        ok: false,
        code: "MISSING_DATE",
        message: "date query가 필요합니다.",
        stationId
      },
      400
    );
  }

  if (!isValidDate(date)) {
    return errorResponse(
      {
        ok: false,
        code: "INVALID_DATE",
        message: "date는 YYYY-MM-DD 형식이어야 합니다.",
        stationId,
        date
      },
      400
    );
  }

  const apiKey = process.env.KHOA_API_KEY;

  if (!apiKey) {
    return errorResponse(
      {
        ok: false,
        code: "API_KEY_MISSING",
        message: "KHOA_API_KEY 설정 후 이용 가능합니다.",
        stationId,
        date
      },
      503
    );
  }

  if (!KHOA_TIDE_ENDPOINT) {
    return errorResponse(
      {
        ok: false,
        code: "ENDPOINT_NOT_READY",
        message: "국립해양조사원 조석 API endpoint 검증 후 연결 예정입니다.",
        stationId,
        date
      },
      501
    );
  }

  try {
    const url = new URL(KHOA_TIDE_ENDPOINT);
    url.searchParams.set("ServiceKey", apiKey);
    url.searchParams.set("obsCode", stationId);
    url.searchParams.set("date", date);

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return errorResponse(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          message: "국립해양조사원 API 응답을 가져오지 못했습니다.",
          stationId,
          date
        },
        502
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    return NextResponse.json({
      ok: true,
      stationId,
      date,
      data
    } satisfies TideApiSuccessBody);
  } catch {
    return errorResponse(
      {
        ok: false,
        code: "UPSTREAM_ERROR",
        message: "국립해양조사원 API 호출 중 오류가 발생했습니다.",
        stationId,
        date
      },
      502
    );
  }
}
