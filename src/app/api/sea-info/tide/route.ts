import { NextResponse } from "next/server";
import { normalizeTideRequestDate, parseKhoaTidePayload } from "@/lib/sea-info/tide-normalize";
import type { TideForecastResponse } from "@/lib/sea-info/types";

type TideApiErrorCode =
  | "MISSING_STATION"
  | "INVALID_DATE"
  | "API_KEY_MISSING"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_UPSTREAM_RESPONSE"
  | "UNSUPPORTED_UPSTREAM_SCHEMA";

type TideApiErrorBody = {
  ok: false;
  code: TideApiErrorCode;
  message: string;
  stationId?: string;
  obsCode?: string;
  date?: string;
  meta?: {
    topLevelKeys?: string[];
    responseKeys?: string[];
    itemKeys?: string[];
  };
};

type TideApiSuccessBody = {
  ok: true;
  stationId: string;
  obsCode: string;
  date: string;
  data: TideForecastResponse;
};

const KHOA_TIDE_ENDPOINT = "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService";
const UPSTREAM_TIMEOUT_MS = 8000;
const UPSTREAM_SOURCE = "국립해양조사원 조석예보(고·저조)";

function errorResponse(body: TideApiErrorBody, status: number) {
  return NextResponse.json(body, { status });
}

function isAbortLikeError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function buildUpstreamUrl(obsCode: string, reqDate: string, serviceKey: string) {
  const url = new URL(KHOA_TIDE_ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("obsCode", obsCode);
  url.searchParams.set("reqDate", reqDate);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "20");
  url.searchParams.set("type", "json");
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId") ?? searchParams.get("obsCode") ?? "";
  const obsCode = searchParams.get("obsCode") ?? stationId;
  const rawDate = searchParams.get("date") ?? "";

  if (!obsCode) {
    return errorResponse(
      {
        ok: false,
        code: "MISSING_STATION",
        message: "obsCode 또는 stationId가 필요합니다."
      },
      400
    );
  }

  const reqDate = normalizeTideRequestDate(rawDate);
  if (!reqDate) {
    return errorResponse(
      {
        ok: false,
        code: "INVALID_DATE",
        message: "date는 yyyyMMdd 또는 yyyy-MM-dd 형식이어야 합니다.",
        stationId,
        obsCode,
        date: rawDate
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
        message: "해양정보 API 키 설정이 필요합니다.",
        stationId,
        obsCode,
        date: reqDate
      },
      503
    );
  }

  try {
    const response = await fetch(buildUpstreamUrl(obsCode, reqDate, apiKey), {
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

    if (!response.ok) {
      return errorResponse(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          message: `${UPSTREAM_SOURCE} 응답 상태가 비정상입니다.`,
          stationId,
          obsCode,
          date: reqDate
        },
        502
      );
    }

    const payload = await response.json().catch(() => null);
    if (payload === null) {
      return errorResponse(
        {
          ok: false,
          code: "INVALID_UPSTREAM_RESPONSE",
          message: `${UPSTREAM_SOURCE} JSON 파싱에 실패했습니다.`,
          stationId,
          obsCode,
          date: reqDate
        },
        502
      );
    }

    const parsed = parseKhoaTidePayload(payload, obsCode, reqDate);
    if (!parsed.ok) {
      return errorResponse(
        {
          ok: false,
          code: parsed.code,
          message: parsed.message,
          stationId,
          obsCode,
          date: reqDate,
          meta: parsed.schemaHints
        },
        502
      );
    }

    return NextResponse.json({
      ok: true,
      stationId,
      obsCode,
      date: reqDate,
      data: parsed.data
    } satisfies TideApiSuccessBody);
  } catch (error) {
    if (isAbortLikeError(error)) {
      return errorResponse(
        {
          ok: false,
          code: "UPSTREAM_TIMEOUT",
          message: `${UPSTREAM_SOURCE} 응답 시간이 초과되었습니다.`,
          stationId,
          obsCode,
          date: reqDate
        },
        504
      );
    }

    return errorResponse(
      {
        ok: false,
        code: "UPSTREAM_ERROR",
        message: `${UPSTREAM_SOURCE} 호출 중 오류가 발생했습니다.`,
        stationId,
        obsCode,
        date: reqDate
      },
      502
    );
  }
}
