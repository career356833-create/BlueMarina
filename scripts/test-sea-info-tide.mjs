import assert from "node:assert/strict";
import { normalizeTideRequestDate, parseKhoaTidePayload, toSeaSummaryTide } from "../src/lib/sea-info/tide-normalize.ts";

function run() {
  assert.equal(normalizeTideRequestDate("20260726"), "20260726");
  assert.equal(normalizeTideRequestDate("2026-07-26"), "20260726");
  assert.equal(normalizeTideRequestDate("2026-13-26"), null);
  assert.equal(normalizeTideRequestDate("bad"), null);

  const actualShapeFixture = {
    header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
    body: {
      items: {
        item: [
          { obsvtrNm: "군산", extrSe: "1", predcDt: "2026-07-26 01:13", predcTdlvVl: 561, lot: 126.56305, lat: 35.97555 },
          { obsvtrNm: "군산", extrSe: "2", predcDt: "2026-07-26 07:51", predcTdlvVl: 283, lot: 126.56305, lat: 35.97555 },
          { obsvtrNm: "군산", extrSe: "3", predcDt: "2026-07-26 13:08", predcTdlvVl: 487, lot: 126.56305, lat: 35.97555 },
          { obsvtrNm: "군산", extrSe: "4", predcDt: "2026-07-26 19:26", predcTdlvVl: 195, lot: 126.56305, lat: 35.97555 }
        ]
      }
    }
  };

  {
    const parsed = parseKhoaTidePayload(actualShapeFixture, "DT_0018", "20260726");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      throw new Error("expected success fixture");
    }
    assert.equal(parsed.data.status, "ready");
    assert.equal(parsed.data.station.obsCode, "DT_0018");
    assert.equal(parsed.data.station.name, "군산");
    assert.equal(parsed.data.events.length, 4);
    assert.equal(parsed.data.events[0].type, "high");
    assert.equal(parsed.data.events[1].type, "low");
    assert.equal(parsed.data.events[0].predictedLevel, 561);
    assert.equal(parsed.data.events[1].predictedLevel, 283);
    assert.equal(parsed.data.nextHighTideAt, "2026-07-26T01:13:00+09:00");
    assert.equal(parsed.data.nextLowTideAt, "2026-07-26T07:51:00+09:00");
    assert.deepEqual(toSeaSummaryTide(parsed.data.events), {
      nextHighTideAt: "2026-07-26T01:13:00+09:00",
      nextLowTideAt: "2026-07-26T07:51:00+09:00",
      tidePhase: "unknown"
    });
  }

  {
    const parsed = parseKhoaTidePayload(
      {
        header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
        body: { items: { item: [] } }
      },
      "DT_0018",
      "20260726"
    );

    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      throw new Error("expected unavailable fixture");
    }
    assert.equal(parsed.data.status, "unavailable");
    assert.equal(parsed.data.events.length, 0);
  }

  {
    const parsed = parseKhoaTidePayload(
      {
        header: { resultCode: "00" },
        body: { items: { item: [{ foo: "bar" }] } }
      },
      "DT_0018",
      "20260726"
    );

    assert.equal(parsed.ok, false);
    if (parsed.ok) {
      throw new Error("expected unsupported schema fixture");
    }
    assert.equal(parsed.code, "UNSUPPORTED_UPSTREAM_SCHEMA");
  }

  {
    const parsed = parseKhoaTidePayload(
      {
        header: { resultCode: "99", resultMsg: "SERVICE ERROR" },
        body: {}
      },
      "DT_0018",
      "20260726"
    );

    assert.equal(parsed.ok, false);
    if (parsed.ok) {
      throw new Error("expected upstream error fixture");
    }
    assert.equal(parsed.code, "UPSTREAM_ERROR");
  }

  {
    const parsed = parseKhoaTidePayload(null, "DT_0018", "20260726");
    assert.equal(parsed.ok, false);
    if (parsed.ok) {
      throw new Error("expected invalid response fixture");
    }
    assert.equal(parsed.code, "INVALID_UPSTREAM_RESPONSE");
  }

  console.log("SEA_INFO_TIDE_TEST_OK");
}

run();
