import { collectPostLaunchSummary } from "./post-launch-summary";
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getNifsRealtimeFishingEnvironment, NifsRealtimeFishingSourceError } from "@/lib/fishing-condition/nifs-realtime-fishing-server";
import { FISHING_CONDITION_PROFILE_REGISTRY, FISHING_CONDITION_PROFILE_SPECIES_COUNT } from "@/lib/fishing-condition/profile-registry";
import releaseEvidence from "../../../reports/release/production-informational-release-v1.json";
import { partialPageHealth, type OperationsService, type OperationsSnapshot, type OperationsSource } from "./model";
import { probePublicRoute, productionProbeOrigin } from "./public-route-probe";

const SNAPSHOT_MS = 60_000;
const PAGE_TIMEOUT_MS = 4_000;
const SERVICE_PATHS = [
  ["Fish", "/fish"], ["Charter", "/charters"], ["Market", "/market"], ["Community", "/community"], ["Login", "/account/login"],
  ["Home", "/"], ["Sea", "/sea"], ["Navigation", "/sea/navigation"],
  ["Fishing Spots", "/fishing-spots"], ["Conditions", "/fishing-spots/conditions"], ["Today Sea", "/today-sea"],
] as const;
const FLAGS = {
  RISA: "NIFS_REALTIME_FISHING_ENABLED",
  FEMO: "NIFS_FISHERY_ENVIRONMENT_ENABLED",
  KMA_OBSERVATION: "KMA_MARINE_OBSERVATION_ENABLED",
  KMA_WARNING: "KMA_MARINE_WARNING_ENABLED",
  KHOA_NAV_WARNING: "KHOA_NAVIGATION_WARNING_ENABLED",
  CHARTER_BACKEND: "CHARTER_SUPPLY_INTAKE_ENABLED",
  MARKET_BACKEND: "MARKET_BACKEND_ENABLED",
  COMMUNITY_BACKEND: "COMMUNITY_BACKEND_ENABLED",
  ACCOUNT_BACKEND: "ACCOUNT_BACKEND_ENABLED",
  IMAGE_UPLOAD: "MARKET_IMAGE_UPLOAD_ENABLED",
} as const;

let snapshotCache: { origin: string; expiresAt: number; snapshot: OperationsSnapshot } | null = null;
let inFlight: Promise<OperationsSnapshot> | null = null;

export class OperationsAuthError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

export async function authorizeOperationsToken(token: string | null): Promise<void> {
  if (!token) throw new OperationsAuthError(401, "AUTH_REQUIRED");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new OperationsAuthError(503, "OPERATIONS_AUTH_UNAVAILABLE");
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new OperationsAuthError(401, "SESSION_INVALID");
  if (data.user.app_metadata?.operations_role !== "operations_admin") throw new OperationsAuthError(403, "FORBIDDEN");
}

export function trustedOperationsOrigin(): string | null {
  if (process.env.VERCEL_ENV === "production") return productionProbeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const deploymentHost = process.env.VERCEL_URL;
  if (deploymentHost && /^[a-z0-9-]+\.vercel\.app$/i.test(deploymentHost)) return `https://${deploymentHost}`;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:3000";
  return null;
}

function disabled(id: string, checkedAt: string, limitation: string): OperationsSource {
  return { id, status: "DISABLED", lastCheckedAt: checkedAt, sourceTimestamp: null, fetchedAt: null, latencyMs: null, recordCount: null, httpStatus: null, limitation };
}

function unknown(id: string, checkedAt: string, limitation: string): OperationsSource {
  return { id, status: "UNKNOWN", lastCheckedAt: checkedAt, sourceTimestamp: null, fetchedAt: null, latencyMs: null, recordCount: null, httpStatus: null, limitation };
}

async function checkRisa(checkedAt: string): Promise<OperationsSource> {
  if (process.env.NIFS_REALTIME_FISHING_ENABLED !== "true") return disabled("RISA", checkedAt, "Source flag is off; source-time timezone is undocumented.");
  const started = Date.now();
  try {
    const response = await getNifsRealtimeFishingEnvironment();
    const timestamps = response.stations.map((station) => station.observedAt).filter(Boolean).sort();
    return {
      id: "RISA", status: response.freshness === "fresh" ? "AVAILABLE" : response.freshness === "stale" ? "STALE" : "UNKNOWN",
      lastCheckedAt: new Date().toISOString(), sourceTimestamp: timestamps.at(-1) ?? null, fetchedAt: response.fetchedAt,
      latencyMs: Date.now() - started, recordCount: response.quality.observationRows, stationCount: response.stations.length, httpStatus: 200,
      limitation: "Source-time timezone is undocumented; quota and cross-instance cache are unknown.",
    };
  } catch (error) {
    const code = error instanceof NifsRealtimeFishingSourceError ? error.code : "UPSTREAM_ERROR";
    return { id: "RISA", status: code === "SOURCE_DISABLED" ? "DISABLED" : code === "UPSTREAM_TIMEOUT" ? "TIMEOUT" : "ERROR", lastCheckedAt: new Date().toISOString(), sourceTimestamp: null, fetchedAt: null,
      latencyMs: Date.now() - started, recordCount: null, httpStatus: code === "UPSTREAM_TIMEOUT" ? 504 : code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? 503 : 502,
      limitation: `${code}; other source cards remain independent.`,
    };
  }
}

async function checkService(origin: string | null, id: string, routePath: string): Promise<OperationsService> {
  if (!origin) return { id, path: routePath, status: "UNKNOWN", lastCheckedAt: null, latencyMs: null, httpStatus: null, limitation: "Trusted deployment origin is unavailable." };
  const started = Date.now();
  const result = await probePublicRoute(origin, routePath, fetch, AbortSignal.timeout(PAGE_TIMEOUT_MS));
  return { id, path: routePath, status: result.status, lastCheckedAt: new Date().toISOString(), latencyMs: Date.now() - started,
    httpStatus: result.httpStatus, finalUrl: result.finalUrl, redirectCount: result.redirectCount,
    limitation: `${result.reason} Canvas, GPS, hydration and service worker are not measured.` };
}

async function checkStaticConditionApi(origin: string | null): Promise<{ status: number | null; latencyMs: number | null }> {
  if (!origin) return { status: null, latencyMs: null };
  const started = Date.now();
  try {
    const response = await fetch(new URL("/api/fishing-condition/read-model", origin), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speciesId: FISHING_CONDITION_PROFILE_REGISTRY[0].speciesId, contexts: { month: 1 } }),
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    return { status: response.status, latencyMs: Date.now() - started };
  } catch { return { status: null, latencyMs: Date.now() - started }; }
}

async function serviceWorkerVersion(): Promise<string | null> {
  try {
    const text = await readFile(path.join(process.cwd(), "public", "sw.js"), "utf8");
    return text.match(/const CACHE_NAME = "([a-z0-9-]+)"/)?.[1] ?? null;
  } catch { return null; }
}

async function collectSnapshot(origin: string | null): Promise<OperationsSnapshot> {
  const checkedAt = new Date().toISOString();
  const featureFlags = Object.fromEntries(Object.entries(FLAGS).map(([label, name]) => [label, process.env[name] === "true"]));
  const [serviceResults, risaResult, swResult, conditionApi, postLaunch] = await Promise.all([
    (async () => {
      const results: PromiseSettledResult<OperationsService>[] = [];
      for (let index = 0; index < SERVICE_PATHS.length; index += 4) {
        results.push(...await Promise.allSettled(SERVICE_PATHS.slice(index, index + 4).map(([id, routePath]) => checkService(origin, id, routePath))));
      }
      return results;
    })(),
    checkRisa(checkedAt),
    serviceWorkerVersion(),
    checkStaticConditionApi(origin),
    collectPostLaunchSummary(),
  ]);
  const services = serviceResults.map((result, index): OperationsService => result.status === "fulfilled" ? result.value : {
    id: SERVICE_PATHS[index][0], path: SERVICE_PATHS[index][1], status: "ERROR", lastCheckedAt: checkedAt, latencyMs: null, httpStatus: null, limitation: "Route check failed independently.",
  });
  const sources: OperationsSource[] = [
    unknown("Kakao Maps", checkedAt, "Browser SDK/domain authorization is checked only after an authorized operator opens the page."),
    unknown("MapLibre/base map", checkedAt, "Navigation HTTP route does not prove canvas rendering."),
    risaResult,
    featureFlags.FEMO ? unknown("FEMO", checkedAt, "Enabled but not probed; historical periodic sample is reference-only, salinity unit undocumented, DO unit documented.")
      : { ...disabled("FEMO", checkedAt, "Last audited sample 2025-11-05 10:10 (source clock, timezone undocumented); reference-only. Salinity unit undocumented; DO unit documented."), sourceTimestamp: "2025-11-05 10:10" },
    featureFlags.KMA_OBSERVATION ? unknown("KMA observation", checkedAt, "Enabled but no station selected; source time requires an exact station.") : disabled("KMA observation", checkedAt, "Production observation flag is off."),
    featureFlags.KMA_WARNING ? unknown("KMA warning", checkedAt, "Enabled but not separately probed; zero warnings never means safe.") : disabled("KMA warning", checkedAt, "Production warning flag is off."),
    process.env.KMA_APIHUB_KEY ? unknown("KMA forecast", checkedAt, "No explicit forecast zone; an API key alone does not establish source health.") : disabled("KMA forecast", checkedAt, "Forecast key is absent; source remains off."),
    process.env.KHOA_API_KEY ? unknown("KHOA tide", checkedAt, "No explicit station/date; prediction datum and source timezone remain undocumented.") : disabled("KHOA tide", checkedAt, "Tide key is absent; source remains off."),
    featureFlags.KHOA_NAV_WARNING ? unknown("KHOA navigation warning", checkedAt, "Lifecycle is UNKNOWN; automatic current/expired inference prohibited.") : disabled("KHOA navigation warning", checkedAt, "Navigation-warning flag is off; lifecycle remains UNKNOWN."),
  ];
  sources.push({ ...unknown("Navigation aids snapshot", checkedAt, postLaunch.navigation.limitation),
    status: postLaunch.navigation.aidsState === "AVAILABLE" ? "AVAILABLE" : postLaunch.navigation.aidsState === "PARTIAL" ? "PARTIAL" : postLaunch.navigation.aidsState === "STALE" ? "STALE" : "UNKNOWN",
    recordCount: postLaunch.navigation.records, fetchedAt: postLaunch.navigation.lastSuccessAt });
  sources.push(unknown("ROMS", checkedAt, "No selected grid/time; no live provider fan-out. API key or prior 5/5 audit cannot prove current model availability."));
  const warningIndex = sources.findIndex(item => item.id === "KHOA navigation warning");
  if (featureFlags.KHOA_NAV_WARNING) sources[warningIndex] = { ...sources[warningIndex],
    status: postLaunch.navigation.warningState === "CURRENT_STATUS_UNAVAILABLE" ? "STALE" : postLaunch.navigation.warningState === "PARTIAL" ? "PARTIAL" : "AVAILABLE",
    recordCount: postLaunch.navigation.currentWarnings, fetchedAt: postLaunch.navigation.warningLastSuccessAt,
    limitation: postLaunch.navigation.limitation };
  const source = (id: string) => sources.find((item) => item.id === id)!;
  const conditionsPage = services.find((item) => item.id === "Conditions")!;
  const todaySeaPage = services.find((item) => item.id === "Today Sea")!;
  return {
    checkedAt, postLaunch,
    deployment: { sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null, deployedAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
      url: process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_SITE_URL ?? origin : origin,
      environment: process.env.VERCEL_ENV ?? "local", appVersion: process.env.npm_package_version ?? "0.1.0", serviceWorkerVersion: swResult },
    featureFlags, services, sources,
    conditions: { status: conditionsPage.status === "HEALTHY" && conditionApi.status !== 200 ? "DEGRADED" : conditionsPage.status,
      selectorCount: FISHING_CONDITION_PROFILE_SPECIES_COUNT, profileContext: "STATIC_PROFILE_AVAILABLE",
      seasonality: "STATIC_ARTIFACT_AVAILABLE; explicit species and month required", risaStatus: source("RISA").status, femoStatus: source("FEMO").status, lastApiLatencyMs: conditionApi.latencyMs },
    todaySea: { status: partialPageHealth(todaySeaPage.status, [source("RISA").status, source("KMA observation").status, source("KMA warning").status]),
      partialRendering: true, disabledSources: sources.filter((item) => item.status === "DISABLED").map((item) => item.id) },
    currentSample5xx: services.filter((item) => item.httpStatus !== null && item.httpStatus >= 500).length
      + (risaResult.httpStatus !== null && risaResult.httpStatus >= 500 ? 1 : 0)
      + (conditionApi.status !== null && conditionApi.status >= 500 ? 1 : 0),
    releaseEvidence: { decision: releaseEvidence.decision, checkedAt: releaseEvidence.checkedAt, kind: "HISTORICAL_AUDIT" },
    limitations: ["Current 5xx is a bounded sample, not historical rate or SLA.", "Per-instance 60-second snapshot cache; no cross-instance deduplication or long-term history.",
      "Real-device GPS/PWA QA remains blocked.", "RISA source timestamp timezone and provider quotas are undocumented.", "FEMO is held as reference-only; unprobed sources remain UNKNOWN when enabled.",
      "Kakao SDK and MapLibre canvas need authenticated browser checks; route HTTP 200 alone does not prove rendering."],
  };
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const origin = trustedOperationsOrigin();
  if (snapshotCache && snapshotCache.origin === (origin ?? "") && Date.now() < snapshotCache.expiresAt) return snapshotCache.snapshot;
  if (inFlight) return inFlight;
  inFlight = collectSnapshot(origin).then((snapshot) => {
    snapshotCache = { origin: origin ?? "", expiresAt: Date.now() + SNAPSHOT_MS, snapshot };
    return snapshot;
  }).finally(() => { inFlight = null; });
  return inFlight;
}
