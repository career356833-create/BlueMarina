import {
  KMA_MARINE_SMALL_ZONE_MATRIX,
  ambiguousKmaMarineLzones,
  findKmaMarineZoneByCoordinate,
  getLargeZoneBounds,
  getSmallZoneForCoordinate,
  kmaMarineLargeZones
} from "./kma-marine-zone.ts";

export const kmaMarineZoneTestCases = {
  uniqueLargeZoneCount: new Set(kmaMarineLargeZones.map((zone) => zone.lzone)).size,
  duplicatedLzones: ambiguousKmaMarineLzones,
  smallZoneMatrix: KMA_MARINE_SMALL_ZONE_MATRIX,
  representativeCases: [
    {
      name: "center of lzone 98",
      lat: 34.25,
      lng: 128.25,
      expectedStatus: "matched",
      expectedLzone: 98,
      expectedSzone: 5
    },
    {
      name: "northwest small zone",
      lat: 34.49,
      lng: 128.01,
      expectedStatus: "matched",
      expectedLzone: 98,
      expectedSzone: 1
    },
    {
      name: "southeast small zone",
      lat: 34.01,
      lng: 128.49,
      expectedStatus: "matched",
      expectedLzone: 98,
      expectedSzone: 9
    },
    {
      name: "large zone boundary",
      lat: 34.5,
      lng: 128.25,
      expectedStatus: "boundary"
    },
    {
      name: "ambiguous 7432 west cell",
      lat: 32.25,
      lng: 131.75,
      expectedStatus: "ambiguous"
    },
    {
      name: "ambiguous 7432 east cell",
      lat: 34.25,
      lng: 138.25,
      expectedStatus: "ambiguous"
    },
    {
      name: "outside official table",
      lat: 20,
      lng: 100,
      expectedStatus: "not_found"
    }
  ]
};

export function runKmaMarineZoneAssertions() {
  if (kmaMarineZoneTestCases.uniqueLargeZoneCount !== 1330) {
    throw new Error(`Expected 1330 unique large zones, got ${kmaMarineZoneTestCases.uniqueLargeZoneCount}`);
  }

  if (ambiguousKmaMarineLzones.length !== 1 || ambiguousKmaMarineLzones[0] !== 7432) {
    throw new Error(`Expected only duplicated lzone 7432, got ${ambiguousKmaMarineLzones.join(",")}`);
  }

  const zone98 = kmaMarineLargeZones.find((zone) => zone.lzone === 98);
  if (!zone98) {
    throw new Error("Expected lzone 98 fixture");
  }

  const bounds98 = getLargeZoneBounds(zone98);
  const szoneChecks = [
    { lat: 34.49, lng: 128.01, szone: 1 },
    { lat: 34.49, lng: 128.25, szone: 2 },
    { lat: 34.49, lng: 128.49, szone: 3 },
    { lat: 34.25, lng: 128.01, szone: 4 },
    { lat: 34.25, lng: 128.25, szone: 5 },
    { lat: 34.25, lng: 128.49, szone: 6 },
    { lat: 34.01, lng: 128.01, szone: 7 },
    { lat: 34.01, lng: 128.25, szone: 8 },
    { lat: 34.01, lng: 128.49, szone: 9 }
  ];

  for (const check of szoneChecks) {
    const result = getSmallZoneForCoordinate(bounds98, check.lat, check.lng);
    if (result.szone !== check.szone) {
      throw new Error(`Expected szone ${check.szone}, got ${result.szone}`);
    }
  }

  for (const testCase of kmaMarineZoneTestCases.representativeCases) {
    const result = findKmaMarineZoneByCoordinate(testCase.lat, testCase.lng);
    if (result.status !== testCase.expectedStatus) {
      throw new Error(`${testCase.name}: expected ${testCase.expectedStatus}, got ${result.status}`);
    }

    if ("expectedLzone" in testCase && result.lzone !== testCase.expectedLzone) {
      throw new Error(`${testCase.name}: expected lzone ${testCase.expectedLzone}, got ${result.lzone}`);
    }

    if ("expectedSzone" in testCase && result.szone !== testCase.expectedSzone) {
      throw new Error(`${testCase.name}: expected szone ${testCase.expectedSzone}, got ${result.szone}`);
    }
  }
}
