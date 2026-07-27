import fs from "node:fs";
import { runKmaMarineForecastAssertions } from "../src/lib/sea-info/kma-marine-forecast.test.ts";
import {
  getLatestKmaIssueTime,
  getNearestKmaValidTime,
  parseKmaMarineForecastCsv,
  resolveKmaMarineZoneFromQuery
} from "../src/lib/sea-info/kma-marine-forecast.ts";

const ENDPOINT = "https://apihub.kma.go.kr/api/typ06/url/marine_small_zone.php";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  const lines = fs.readFileSync(".env.local", "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function buildRequest({ authKey, tma_fc, tma_ef, lzone, szone }) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("tma_fc", tma_fc);
  url.searchParams.set("tma_ef", tma_ef);
  url.searchParams.set("Lzone", String(lzone));
  url.searchParams.set("Szone", String(szone));
  url.searchParams.set("disp", "0");
  url.searchParams.set("help", "0");
  url.searchParams.set("authKey", authKey);
  return url;
}

function resolveSample(name, lat, lng) {
  const resolved = resolveKmaMarineZoneFromQuery(new URLSearchParams({ lat: String(lat), lng: String(lng) }));
  if (!resolved.ok) {
    return {
      name,
      lat,
      lng,
      zoneResolved: false,
      code: resolved.code,
      message: resolved.message
    };
  }

  return {
    name,
    lat,
    lng,
    zoneResolved: true,
    lzone: resolved.lzone,
    szone: resolved.szone
  };
}

async function callSample(sample, authKey, tma_fc, tma_ef) {
  if (!sample.zoneResolved) return sample;

  const response = await fetch(
    buildRequest({
      authKey,
      tma_fc,
      tma_ef,
      lzone: sample.lzone,
      szone: sample.szone
    }),
    {
      signal: AbortSignal.timeout(8000)
    }
  );

  const contentType = response.headers.get("content-type") ?? "";
  const buffer = await response.arrayBuffer();
  const encoding = /euc-?kr/i.test(contentType) ? "euc-kr" : "utf-8";
  const text = new TextDecoder(encoding).decode(buffer);
  const parsed = response.ok ? parseKmaMarineForecastCsv(text, sample.lzone, sample.szone) : null;

  return {
    ...sample,
    httpStatus: response.status,
    contentType,
    parsedOk: parsed?.ok ?? false,
    forecastStatus: parsed?.ok ? parsed.data.status : undefined,
    header: parsed?.ok ? parsed.header : parsed?.header,
    rowCount: parsed?.ok ? parsed.rowCount : parsed?.rowCount,
    errorCode: parsed && !parsed.ok ? parsed.code : undefined
  };
}

async function run() {
  runKmaMarineForecastAssertions();
  loadLocalEnv();

  const key = process.env.KMA_APIHUB_KEY;
  const hasKey = Boolean(key);
  const tma_fc = getLatestKmaIssueTime();
  const tma_ef = getNearestKmaValidTime(new Date(), tma_fc);
  const samples = [
    resolveSample("gunsan", 35.967, 126.563),
    resolveSample("busan", 35.096, 129.035),
    resolveSample("yeosu", 34.74, 127.736),
    resolveSample("jeju", 33.527, 126.543),
    resolveSample("ulleungdo", 37.49, 130.913)
  ];

  if (!hasKey || !tma_ef) {
    console.log(
      JSON.stringify(
        {
          assertion: "KMA_MARINE_FORECAST_FIXTURE_TEST_OK",
          actualCall: "SKIPPED",
          hasKey,
          tma_fc,
          tma_ef,
          samples
        },
        null,
        2
      )
    );
    return;
  }

  const results = [];
  for (const sample of samples) {
    results.push(await callSample(sample, key, tma_fc, tma_ef));
  }

  console.log(
    JSON.stringify(
      {
        assertion: "KMA_MARINE_FORECAST_TEST_OK",
        actualCall: "ATTEMPTED",
        keyPrinted: false,
        tma_fc,
        tma_ef,
        results
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        assertion: "KMA_MARINE_FORECAST_TEST_FAILED",
        message: error instanceof Error ? error.message : "unknown error",
        keyPrinted: false
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
