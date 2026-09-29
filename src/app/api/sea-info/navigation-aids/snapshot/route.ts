import { NextResponse } from "next/server";
import snapshotData from "@/data/marine-navigation/v3/navigation-aids.json";
import { toKhoaNavigationAidsGeoJson } from "@/lib/marine-navigation/adapters/khoa-navigation-aids";
import { evaluateAids, type AidStore } from "@/lib/marine-navigation/reliability-v3";

// Versioned build artifact only. The page request never calls KHOA.
export async function GET() {
  const snapshot = evaluateAids(snapshotData as unknown as AidStore);
  return NextResponse.json({
    ok: true,
    state: snapshot.state,
    dataMode: snapshot.dataMode,
    freshness: snapshot.freshness,
    lastSuccessAt: snapshot.lastSuccessAt,
    completeCategories: snapshot.complete,
    presentCategories: snapshot.present,
    categories: snapshot.categories,
    successfulCategories: snapshot.categories.filter((category) => category.state === "VALID").map((category) => category.categoryId),
    failedCategories: snapshot.categories.filter((category) => category.state === "FAILED" || category.state === "NEVER_FETCHED"),
    geoJson: toKhoaNavigationAidsGeoJson({ items: snapshot.items } as Parameters<typeof toKhoaNavigationAidsGeoJson>[0]),
    source: "국립해양조사원(KHOA)",
  }, { headers: { "Cache-Control": "no-store" } });
}
