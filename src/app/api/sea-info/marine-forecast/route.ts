import { NextResponse } from "next/server";
import {
  getLatestKmaIssueTime,
  getNearestKmaValidTime,
  parseKmaMarineForecastCsv,
  resolveKmaMarineZoneFromQuery,
  type KmaMarineForecast
} from "@/lib/sea-info/kma-marine-forecast";

type KmaMarineForecastApiErrorCode =
  | "MISSING_LOCATION"
  | "INVALID_ZONE"
  | "ZONE_NOT_FOUND"
  | "AMBIGUOUS_ZONE"
  | "INVALID_TIME"
  | "API_KEY_MISSING"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "EMPTY_RESPONSE"
  | "CSV_HEADER_NOT_FOUND"
  | "CSV_ROW_NOT_FOUND"
  | "MISSING_REQUIRED_FIELD";

type KmaMarineForecastApiErrorBody = {
  ok: false;
  code: KmaMarineForecastApiErrorCode;
  message: string;
  meta?: {
    header?: string[];
    rowCount?: number;
    zoneMatchStatus?: string;
    reason?: string;
  };
};

type KmaMarineForecastApiSuccessBody = {
  ok: true;
  data: KmaMarineForecast;
  request: {
    tma_fc: string;
    tma_ef: string;
    Lzone: number;
    Szone: number;
  };
  meta: {
    header: string[];
    rowCount: number;
  };
};

const KMA_MARINE_FORECAST_ENDPOINT = "https://apihub.kma.go.kr/api/typ06/url/marine_small_zone.php";
const UPSTREAM_TIMEOUT_MS = 8000;

function errorResponse(body: KmaMarineForecastApiErrorBody, status: number) {
  return NextResponse.json(body, { status });
}

function isAbortLikeError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function isUtcHour(value: string) {
  return /^\d{10}$/.test(value);
}

function buildUpstreamUrl(params: {
  authKey: string;
  tma_fc: string;
  tma_ef: string;
  Lzone: number;
  Szone: number;
}) {
  const url = new URL(KMA_MARINE_FORECAST_ENDPOINT);
  url.searchParams.set("tma_fc", params.tma_fc);
  url.searchParams.set("tma_ef", params.tma_ef);
  url.searchParams.set("Lzone", String(params.Lzone));
  url.searchParams.set("Szone", String(params.Szone));
  url.searchParams.set("disp", "0");
  url.searchParams.set("help", "0");
  url.searchParams.set("authKey", params.authKey);
  return url;
}

function decodeUpstreamText(response: Response) {
  return response.arrayBuffer().then((buffer) => {
    const contentType = response.headers.get("content-type") ?? "";
    const encoding = /euc-?kr/i.test(contentType) ? "euc-kr" : "utf-8";
    return new TextDecoder(encoding).decode(buffer);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zone = resolveKmaMarineZoneFromQuery(searchParams);

  if (!zone.ok) {
    const errorCode = zone.code as KmaMarineForecastApiErrorCode;
    const zoneMatch = "zoneMatch" in zone ? zone.zoneMatch : undefined;

    return errorResponse(
      {
        ok: false,
        code: errorCode,
        message: zone.message,
        meta: {
          zoneMatchStatus: zoneMatch?.status,
          reason: zoneMatch?.reason
        }
      },
      errorCode === "AMBIGUOUS_ZONE" ? 409 : 400
    );
  }

  const tma_fc = searchParams.get("tma_fc") ?? getLatestKmaIssueTime();
  const tma_ef = searchParams.get("tma_ef") ?? getNearestKmaValidTime(new Date(), tma_fc);
  if (!tma_ef || !isUtcHour(tma_fc) || !isUtcHour(tma_ef)) {
    return errorResponse(
      {
        ok: false,
        code: "INVALID_TIME",
        message: "tma_fc/tma_ef는 yyyyMMddHH UTC 형식이어야 합니다."
      },
      400
    );
  }

  const apiKey = process.env.KMA_APIHUB_KEY;
  if (!apiKey) {
    return errorResponse(
      {
        ok: false,
        code: "API_KEY_MISSING",
        message: "기상청 APIHUB 키 설정이 필요합니다."
      },
      503
    );
  }

  try {
    const response = await fetch(
      buildUpstreamUrl({
        authKey: apiKey,
        tma_fc,
        tma_ef,
        Lzone: zone.lzone,
        Szone: zone.szone
      }),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      }
    );

    if (!response.ok) {
      return errorResponse(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          message: "기상청 소해구별 예측데이터 응답 상태가 비정상입니다."
        },
        502
      );
    }

    const csvText = await decodeUpstreamText(response);
    const parsed = parseKmaMarineForecastCsv(csvText, zone.lzone, zone.szone);
    if (!parsed.ok) {
      return errorResponse(
        {
          ok: false,
          code: parsed.code,
          message: parsed.message,
          meta: {
            header: parsed.header,
            rowCount: parsed.rowCount
          }
        },
        502
      );
    }

    return NextResponse.json({
      ok: true,
      data: parsed.data,
      request: {
        tma_fc,
        tma_ef,
        Lzone: zone.lzone,
        Szone: zone.szone
      },
      meta: {
        header: parsed.header,
        rowCount: parsed.rowCount
      }
    } satisfies KmaMarineForecastApiSuccessBody);
  } catch (error) {
    if (isAbortLikeError(error)) {
      return errorResponse(
        {
          ok: false,
          code: "UPSTREAM_TIMEOUT",
          message: "기상청 소해구별 예측데이터 응답 시간이 초과되었습니다."
        },
        504
      );
    }

    return errorResponse(
      {
        ok: false,
        code: "UPSTREAM_ERROR",
        message: "기상청 소해구별 예측데이터 호출 중 오류가 발생했습니다."
      },
      502
    );
  }
}
