import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDistanceKm } from "../sea-info/distance.ts";
import { convertEpsg5179ToWgs84, convertFishingSpotPointToWgs84, parseProjectedPoint } from "./projection.ts";

const comparisonSamples = [
  { id: "boat-1", point: "POINT (1045426.59078444 1658004.10693042)", lat: 34.915806, lng: 127.997306 },
  { id: "boat-162", point: "POINT (876012.960228493 1700826.60213964)", lat: 35.295278, lng: 126.136389 },
  { id: "boat-2", point: "POINT (1102964.80288829 1664870.29635754)", lat: 34.9735, lng: 128.627972 },
  { id: "boat-109", point: "POINT (872991.4174679071 1801472.77081184)", lat: 36.202083, lng: 126.087222 },
  { id: "boat-216", point: "POINT (1026802.60090189 1632545.05823725)", lat: 34.686889, lng: 127.792611 },
  { id: "boat-3", point: "POINT (1296009.74497658 1944985.66208473)", lat: 37.456722, lng: 130.846472 },
  { id: "boat-164", point: "POINT (973721.4473232891 1580115.29253781)", lat: 34.214083, lng: 127.214722 },
  { id: "boat-4", point: "POINT (947356.113301875 1503742.78332737)", lat: 33.524306, lng: 126.933083 },
  { id: "boat-111", point: "POINT (904263.807282175 1760298.89509272)", lat: 35.834528, lng: 126.44 },
  { id: "boat-219", point: "POINT (990581.0645656991 1589580.44135381)", lat: 34.299734, lng: 127.397645 },
  { id: "rock-1003", point: "POINT (1175855.53370821 1722882.20494695)", lat: 35.48625, lng: 129.438556 },
  { id: "rock-1009", point: "POINT (1158211.08456459 1693140.39530967)", lat: 35.221194, lng: 129.238417 },
  { id: "rock-1042", point: "POINT (1099302.16086619 2014380.49868119)", lat: 38.124139, lng: 128.632944 },
  { id: "rock-1004", point: "POINT (1175208.0370275 1721959.09278971)", lat: 35.478056, lng: 129.431222 },
  { id: "rock-1010", point: "POINT (1157320.0890468 1691413.30989182)", lat: 35.20575, lng: 129.228361 },
  { id: "rock-1043", point: "POINT (1113009.26513483 1994890.08984793)", lat: 37.946917, lng: 128.786222 },
  { id: "rock-1005", point: "POINT (1167624.26600432 1710676.04138036)", lat: 35.37775, lng: 129.345417 },
  { id: "rock-1027", point: "POINT (1172575.31705324 1852858.42119452)", lat: 36.658, lng: 129.430944 },
  { id: "rock-976", point: "POINT (1173765.16058471 1838523.88967121)", lat: 36.528694, lng: 129.441 },
  { id: "rock-1028", point: "POINT (1172532.71339007 1852471.46210687)", lat: 36.654528, lng: 129.43025 }
];

describe("parseProjectedPoint", () => {
  it("parses POINT (X Y) strings", () => {
    assert.deepEqual(parseProjectedPoint("POINT (1045426.59078444 1658004.10693042)"), {
      ok: true,
      point: {
        x: 1045426.59078444,
        y: 1658004.10693042
      }
    });
  });

  it("rejects invalid point strings", () => {
    assert.deepEqual(parseProjectedPoint(""), { ok: false, error: "MISSING_POINT" });
    assert.deepEqual(parseProjectedPoint("1045426.59078444 1658004.10693042"), { ok: false, error: "INVALID_POINT" });
  });
});

describe("convertEpsg5179ToWgs84", () => {
  it("converts comparison samples within 12 meters", () => {
    for (const sample of comparisonSamples) {
      const result = convertFishingSpotPointToWgs84(sample.point);

      assert.equal(result.ok, true, sample.id);

      if (result.ok) {
        const errorMeters = calculateDistanceKm(result.coordinates, {
          lat: sample.lat,
          lng: sample.lng
        }) * 1000;

        assert.ok(errorMeters < 12, `${sample.id} error ${errorMeters.toFixed(2)}m`);
      }
    }
  });

  it("returns normalized WGS84 coordinates", () => {
    const coordinates = convertEpsg5179ToWgs84({
      x: 1045426.59078444,
      y: 1658004.10693042
    });

    assert.equal(Math.abs(coordinates.lat - 34.915806) < 0.0001, true);
    assert.equal(Math.abs(coordinates.lng - 127.997306) < 0.0001, true);
  });
});
