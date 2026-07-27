import fs from "node:fs";
import path from "node:path";
import { marineObservatories } from "../src/data/marine-observatories.ts";
import {
  ambiguousKmaMarineLzones,
  findKmaMarineZoneByCoordinate,
  kmaMarineLargeZones
} from "../src/lib/sea-info/kma-marine-zone.ts";
import { runKmaMarineZoneAssertions } from "../src/lib/sea-info/kma-marine-zone.test.ts";

type MappingStats = Record<"matched" | "not_found" | "ambiguous" | "boundary", number>;

type FishingSpot = {
  id: string;
  name: string;
  region: string;
  city: string;
  lat: string;
  lng: string;
};

function createStats(): MappingStats {
  return {
    matched: 0,
    not_found: 0,
    ambiguous: 0,
    boundary: 0
  };
}

function increment(stats: MappingStats, status: keyof MappingStats) {
  stats[status] += 1;
}

function readFishingSpots() {
  const filePath = path.join(process.cwd(), "src", "data", "fishing-spots.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as FishingSpot[];
}

function toNumber(value: string | number) {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : null;
}

function summarizeObservatories() {
  const stats = createStats();
  const failures: Array<{ id: string; name: string; lat: number; lng: number; status: string; reason?: string }> = [];

  for (const observatory of marineObservatories) {
    const result = findKmaMarineZoneByCoordinate(observatory.lat, observatory.lng);
    increment(stats, result.status);
    if (result.status !== "matched") {
      failures.push({
        id: observatory.id,
        name: observatory.name,
        lat: observatory.lat,
        lng: observatory.lng,
        status: result.status,
        reason: result.reason
      });
    }
  }

  return {
    total: marineObservatories.length,
    stats,
    failures
  };
}

function summarizeFishingSpots() {
  const spots = readFishingSpots();
  const stats = createStats();
  const failures: Array<{ id: string; name: string; region: string; city: string; lat: string; lng: string; status: string; reason?: string }> = [];

  for (const spot of spots) {
    const lat = toNumber(spot.lat);
    const lng = toNumber(spot.lng);
    const result = lat === null || lng === null ? { status: "not_found" as const, reason: "INVALID_COORDINATE" } : findKmaMarineZoneByCoordinate(lat, lng);
    increment(stats, result.status);
    if (result.status !== "matched") {
      failures.push({
        id: spot.id,
        name: spot.name,
        region: spot.region,
        city: spot.city,
        lat: spot.lat,
        lng: spot.lng,
        status: result.status,
        reason: result.reason
      });
    }
  }

  return {
    total: spots.length,
    stats,
    failures
  };
}

function countUniqueLargeZones() {
  return new Set(kmaMarineLargeZones.map((zone) => zone.lzone)).size;
}

function runSample(name: string, lat: number, lng: number) {
  const result = findKmaMarineZoneByCoordinate(lat, lng);
  return {
    name,
    lat,
    lng,
    status: result.status,
    lzone: result.lzone,
    szone: result.szone,
    reason: result.reason
  };
}

function run() {
  runKmaMarineZoneAssertions();

  const observatories = summarizeObservatories();
  const fishingSpots = summarizeFishingSpots();
  const samples = [
    runSample("gunsan", 35.967, 126.563),
    runSample("busan", 35.096, 129.035),
    runSample("yeosu", 34.74, 127.736),
    runSample("jeju", 33.527, 126.543),
    runSample("ulleungdo", 37.49, 130.913)
  ];

  const summary = {
    officialLargeZoneRows: kmaMarineLargeZones.length,
    uniqueLargeZones: countUniqueLargeZones(),
    duplicatedLzones: ambiguousKmaMarineLzones,
    samples,
    observatories: {
      total: observatories.total,
      stats: observatories.stats,
      nonMatchedPreview: observatories.failures.slice(0, 20)
    },
    fishingSpots: {
      total: fishingSpots.total,
      stats: fishingSpots.stats,
      nonMatchedPreview: fishingSpots.failures.slice(0, 20)
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

run();
