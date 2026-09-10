import { type NextRequest, NextResponse } from "next/server";
import { findSpeciesEnvironmentProfile, SPECIES_ENVIRONMENT_SOURCE_ID } from "@/lib/fishing-condition/species-environment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const speciesId = request.nextUrl.searchParams.get("speciesId")?.trim() || undefined;
  const slug = request.nextUrl.searchParams.get("slug")?.trim() || undefined;
  if ((speciesId ? 1 : 0) + (slug ? 1 : 0) !== 1) {
    return NextResponse.json({ ok: false, sourceId: SPECIES_ENVIRONMENT_SOURCE_ID, code: "EXACTLY_ONE_FILTER_REQUIRED" }, { status: 400 });
  }
  if ((speciesId && !/^BM-SPECIES-\d{6}$/.test(speciesId)) || (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    return NextResponse.json({ ok: false, sourceId: SPECIES_ENVIRONMENT_SOURCE_ID, code: "INVALID_FILTER" }, { status: 400 });
  }
  const profile = findSpeciesEnvironmentProfile({ speciesId, slug });
  if (!profile) return NextResponse.json({ ok: false, sourceId: SPECIES_ENVIRONMENT_SOURCE_ID, code: "PROFILE_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, sourceId: SPECIES_ENVIRONMENT_SOURCE_ID, profile }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
