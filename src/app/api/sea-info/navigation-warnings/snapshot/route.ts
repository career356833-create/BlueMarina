import { NextResponse } from "next/server";
import listData from "@/data/marine-navigation/v3/navigation-warning-list.json";
import detailData from "@/data/marine-navigation/v3/navigation-warning-details.json";
import { normalizeKhoaNavigationWarnings, summarizeKhoaNavigationWarningQuality, toKhoaNavigationWarningsGeoJson } from "@/lib/marine-navigation/adapters/khoa-navigation-warnings";
import { evaluateWarnings, type WarningDetailStore, type WarningListStore } from "@/lib/marine-navigation/reliability-v3";

// Snapshot history is never silently promoted to a current warning state.
export async function GET() {
  const snapshot = evaluateWarnings(listData as unknown as WarningListStore, detailData as unknown as WarningDetailStore);
  const fetchedAt = new Date().toISOString();
  const warnings = snapshot.state === "CURRENT_STATUS_UNAVAILABLE" ? [] : normalizeKhoaNavigationWarnings(snapshot.listItems, snapshot.detailItems, snapshot.lastSuccessAt ?? fetchedAt);
  return NextResponse.json({
    ok: true,
    state: snapshot.state,
    dataMode: snapshot.dataMode,
    freshness: snapshot.state === "CURRENT_STATUS_UNAVAILABLE" ? "unavailable" : "fresh",
    fetchedAt,
    lastSuccessfulFetchAt: snapshot.lastSuccessAt ?? "",
    successfulDetailCount: snapshot.documentNumbers.length - snapshot.failedDocumentNumbers.length,
    failedDetailCount: snapshot.failedDocumentNumbers.length,
    failedDocumentNumbers: snapshot.failedDocumentNumbers,
    warnings,
    geoJson: toKhoaNavigationWarningsGeoJson(warnings),
    historical: snapshot.state === "CURRENT_STATUS_UNAVAILABLE" ? { lastSuccessAt: snapshot.lastSuccessAt, documentCount: snapshot.documentNumbers.length, label: "HISTORICAL / LAST SUCCESSFUL FETCH" } : null,
    cacheSeconds: 0,
    quality: summarizeKhoaNavigationWarningQuality(snapshot.listItems.length, warnings),
    source: "국립해양조사원(KHOA)",
  }, { headers: { "Cache-Control": "no-store" } });
}
