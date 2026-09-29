import { NextResponse } from "next/server";
import aidsData from "@/data/marine-navigation/v3/navigation-aids.json";
import warningListData from "@/data/marine-navigation/v3/navigation-warning-list.json";
import warningDetailData from "@/data/marine-navigation/v3/navigation-warning-details.json";
import { evaluateAids, evaluateWarnings, type AidStore, type WarningDetailStore, type WarningListStore } from "@/lib/marine-navigation/reliability-v3";

export async function GET() {
  const aids = evaluateAids(aidsData as unknown as AidStore);
  const warnings = evaluateWarnings(warningListData as unknown as WarningListStore, warningDetailData as unknown as WarningDetailStore);
  return NextResponse.json({
    ok: true,
    dataMode: "SNAPSHOT",
    source: "국립해양조사원(KHOA)",
    navigationAids: { state: aids.state, categoriesComplete: aids.complete, categoriesPresent: aids.present, lastSuccessAt: aids.lastSuccessAt, categories: aids.categories },
    navigationWarnings: { currentState: warnings.state, lastAttemptAt: (warningListData as { lastAttemptAt?: string | null }).lastAttemptAt ?? null, lastSuccessAt: warnings.lastSuccessAt, lastErrorClass: (warningListData as { lastErrorClass?: string | null }).lastErrorClass ?? null, documentCount: warnings.documentNumbers.length, failedDocumentNumbers: warnings.failedDocumentNumbers, historicalOnly: warnings.state === "CURRENT_STATUS_UNAVAILABLE" },
  }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
