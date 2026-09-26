export type FishingConditionSourceId = "nifs-risa" | "nifs-femo-sea";
export type FishingConditionDepth = "SURFACE" | "MIDDLE" | "BOTTOM";

export type FishingConditionQuery = {
  speciesId: string;
  month: number;
  sourceId: FishingConditionSourceId;
  stationOrSiteId: string;
  depthContext: FishingConditionDepth;
};

export type FishingConditionReadModelResponse = {
  ok: true;
  readModel: {
    availability?: "AVAILABLE" | "PARTIAL";
    sourceStatus?: Array<{ sourceId: string; status: string; reason: string }>;
    observationContext?: {
      sourceId: string; stationOrSiteId: string; stationName?: string;
      depthContext: string; sourceTimestamp: string | null; sourceTimezone?: string;
      fetchedAt?: string; lastSuccessfulFetchAt?: string;
      cacheStatus?: "fresh_fetch" | "cache_hit" | "stale_fallback";
      freshness: string;
    };
    species: { speciesId: string; koreanName: string; scientificName: string };
    profileContext: null | {
      readiness: "PROFILE_READY" | "PROFILE_PARTIAL" | "PROFILE_LIMITED";
      availableDomains: Record<string, unknown>;
      temperature: Record<string, unknown>;
      depth: Record<string, unknown>;
      salinity: Record<string, unknown>;
      dissolvedOxygen: Record<string, unknown>;
      spawning: Record<string, unknown>;
      migration: Record<string, unknown>;
      habitat: Record<string, unknown>;
      evidenceRefs: Array<{ id: string; sourceType: string; title: string; url?: string | null; evidenceClass: string }>;
      limitations: string[];
    };
    requestContext: { month: number | null; environmentSource: string | null; stationOrSiteId: string | null; depthContext: string | null };
    environment: Record<string, {
      key: string;
      label: string;
      status: string;
      displayValue: string | null;
      displayStatus: string | null;
      explanation: string | null;
      profileReference: { rangeType: string | null; min: number | null; max: number | null; unit: string | null } | null;
      source: { sourceId: string; lineage: string[] };
      freshness: string;
      limitations: string[];
    }>;
    seasonality: {
      requestedMonth: number | null;
      spawning: { status: string; description: string | null; cards: Array<{ title: string; description: string | null; relation: string | null; limitations: string[] }> };
      migration: { status: string; description: string | null; cards: Array<{ title: string; description: string | null; relation: string | null; limitations: string[] }> };
      fisheryOccurrence: { status: string; description: string | null; cards: Array<{
        title: string;
        description: string | null;
        sourceType: string;
        source: { provider?: string; sourceName?: string; tableId?: string };
        yearlyRecords: Array<{ year: number; status: string; displayStatus: string; value: number | null; displayValue: string | null; unit: string | null }>;
      }> };
    };
    sources: Array<{
      domain: string;
      provider: string | null;
      sourceType: string | null;
      sourceName: string | null;
      sourceId: string;
      qualityClass: string;
      observedAt: string | null;
      urlOrReference: string | null;
      lineage: string[] | Record<string, unknown>;
    }>;
    limitations: string[];
    freshness: { status: string; label: string; observedAt: string | null };
  };
};

export type FishingConditionSourceError = { code?: string; message?: string };

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null) as FishingConditionSourceError & Partial<FishingConditionReadModelResponse> | null;
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.message ?? "조건 자료를 불러오지 못했습니다.") as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }
  return payload as FishingConditionReadModelResponse;
}

export async function fetchFishingConditionReadModel(query: FishingConditionQuery, signal?: AbortSignal) {
  const environment = query.sourceId === "nifs-risa"
    ? { sourceId: query.sourceId, stationId: query.stationOrSiteId, depthContext: query.depthContext }
    : { sourceId: query.sourceId, siteId: query.stationOrSiteId, depthContext: query.depthContext };

  const response = await fetch("/api/fishing-condition/read-model", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ speciesId: query.speciesId, environment, contexts: { month: query.month, timeOfDay: null } }),
    signal,
  });
  return parseResponse(response);
}

export async function fetchFishingConditionProfile(speciesId: string, month: number, signal?: AbortSignal) {
  return parseResponse(await fetch("/api/fishing-condition/read-model", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ speciesId, contexts: { month } }), signal,
  }));
}

export async function fetchFishingConditionLocations(sourceId: FishingConditionSourceId, signal?: AbortSignal) {
  const path = sourceId === "nifs-risa"
    ? "/api/fishing-condition/environment/realtime"
    : "/api/fishing-condition/environment/fishery";
  const response = await fetch(path, { signal, cache: "no-store" });
  const payload = await parseResponse(response) as FishingConditionReadModelResponse & {
    stations?: Array<{ stationId: string; stationName: string; region: string | null; freshness: string }>;
    samples?: Array<{ siteId: string; fisheryName: string; stationName: string; sampledAt: string; freshness: string }>;
  };
  if (sourceId === "nifs-risa") {
    return (payload.stations ?? []).map((station) => ({
      id: station.stationId,
      label: station.region ? `${station.stationName} · ${station.region}` : station.stationName,
      freshness: station.freshness,
    }));
  }
  const sites = new Map<string, { id: string; label: string; freshness: string }>();
  for (const sample of payload.samples ?? []) {
    if (!sites.has(sample.siteId)) sites.set(sample.siteId, {
      id: sample.siteId,
      label: `${sample.fisheryName} · ${sample.stationName}`,
      freshness: sample.freshness,
    });
  }
  return [...sites.values()].sort((a, b) => a.label.localeCompare(b.label, "ko"));
}
