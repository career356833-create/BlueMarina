import {
  getLatestKmaIssueTime,
  getNearestKmaValidTime,
  parseKmaMarineForecastCsv,
  resolveKmaMarineZoneFromQuery,
  utcDateHourToIso
} from "./kma-marine-forecast.ts";

export function runKmaMarineForecastAssertions() {
  const fixedNow = new Date(Date.UTC(2026, 6, 27, 5, 40, 0));
  const issued = getLatestKmaIssueTime(fixedNow);
  if (issued !== "2026072700") {
    throw new Error(`Expected issue 2026072700, got ${issued}`);
  }

  const valid = getNearestKmaValidTime(fixedNow, issued);
  if (valid !== "2026072706") {
    throw new Error(`Expected valid 2026072706, got ${valid}`);
  }

  if (utcDateHourToIso("2026072706") !== "2026-07-27T06:00:00.000Z") {
    throw new Error("UTC date-hour conversion failed");
  }

  const fixture = [
    "tma_fc,tma_ef,Lzone,Szone,lat_lb,lon_lb,lat_lt,lon_lt,lat_rt,lon_rt,lat_rb,lon_rb,wh_sig,wvprd_max,wvdr,ws,wd,vs,rain,tw,swell",
    "2026072700,2026072706,5174,1,35.5,126.5,36.0,126.5,36.0,127.0,35.5,127.0,0.8,5.2,210,6.4,250,12000,-999.0,23.1,0"
  ].join("\n");
  const parsed = parseKmaMarineForecastCsv(fixture, 5174, 1);
  if (!parsed.ok) {
    throw new Error(`Expected successful CSV parse: ${parsed.message}`);
  }

  if (parsed.data.status !== "ready" || !parsed.data.forecast) {
    throw new Error("Expected ready forecast fixture");
  }

  if (parsed.data.forecast.precipitationMm !== null) {
    throw new Error("-999.0 should become null");
  }

  if (parsed.data.forecast.significantWaveHeightM !== 0.8 || parsed.data.forecast.windSpeedMps !== 6.4) {
    throw new Error("Numeric forecast fields were not parsed");
  }

  const emptyParsed = parseKmaMarineForecastCsv(
    [
      "tma_fc,tma_ef,Lzone,Szone,wh_sig,wvprd_max,wvdr,ws,wd,vs,rain,tw,swell",
      "2026072700,2026072706,5174,1,-999.0,-999.0,-999.0,-999.0,-999.0,-999.0,-999.0,-999.0,-999.0"
    ].join("\n"),
    5174,
    1
  );
  if (!emptyParsed.ok || emptyParsed.data.status !== "unavailable") {
    throw new Error("All -999.0 row should become unavailable");
  }

  const plainTextUnavailable = parseKmaMarineForecastCsv("해구번호를 확인하여 주시기 바랍니다.", 5174, 1);
  if (!plainTextUnavailable.ok || plainTextUnavailable.data.status !== "unavailable") {
    throw new Error("Plain text KMA error should become unavailable");
  }

  const zone = resolveKmaMarineZoneFromQuery(new URLSearchParams({ lat: "35.967", lng: "126.563" }));
  if (!zone.ok || zone.lzone !== 5174 || zone.szone !== 1) {
    throw new Error("Lat/lng to Lzone/Szone flow failed");
  }
}
