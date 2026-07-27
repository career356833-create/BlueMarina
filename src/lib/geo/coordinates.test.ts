import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCoordinateInKoreaBounds, isValidCoordinate, normalizeCoordinates } from "./coordinates.ts";

describe("normalizeCoordinates", () => {
  it("accepts valid string coordinates", () => {
    const result = normalizeCoordinates({ lat: "35.1796", lng: "129.0756" });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.coordinates : null, { lat: 35.1796, lng: 129.0756 });
  });

  it("accepts valid number coordinates", () => {
    const result = normalizeCoordinates({ lat: 37.456, lng: 126.592 });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.coordinates : null, { lat: 37.456, lng: 126.592 });
  });

  it("rejects empty string latitude", () => {
    const result = normalizeCoordinates({ lat: "", lng: "129.0756" });

    assert.deepEqual(result, { ok: false, error: "MISSING_LAT" });
  });

  it("rejects undefined longitude", () => {
    const result = normalizeCoordinates({ lat: 35.1796, lng: undefined });

    assert.deepEqual(result, { ok: false, error: "MISSING_LNG" });
  });

  it("rejects NaN coordinates", () => {
    const result = normalizeCoordinates({ lat: Number.NaN, lng: 129.0756 });

    assert.deepEqual(result, { ok: false, error: "INVALID_LAT" });
  });

  it("rejects suspected swapped latitude and longitude", () => {
    const result = normalizeCoordinates({ lat: 129.0756, lng: 35.1796 });

    assert.deepEqual(result, { ok: false, error: "COORDINATE_ORDER_SUSPECTED" });
  });

  it("rejects coordinates far outside Korea bounds", () => {
    const result = normalizeCoordinates({ lat: 48.8566, lng: 2.3522 });

    assert.deepEqual(result, { ok: false, error: "OUTSIDE_KOREA_BOUNDS" });
  });
});

describe("coordinate helpers", () => {
  it("checks Korea coordinate bounds", () => {
    assert.equal(isCoordinateInKoreaBounds({ lat: 33.514, lng: 126.529 }), true);
    assert.equal(isCoordinateInKoreaBounds({ lat: 40.7128, lng: -74.006 }), false);
  });

  it("returns a boolean validity result", () => {
    assert.equal(isValidCoordinate({ lat: "35.1796", lng: "129.0756" }), true);
    assert.equal(isValidCoordinate({ lat: "35.1796", lng: "" }), false);
  });
});
