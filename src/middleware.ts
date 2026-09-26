import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function unavailable() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return unavailable();

  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.app_metadata?.operations_role !== "operations_admin") return unavailable();
  } catch { return unavailable(); }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/admin/operations/:path*"] };
