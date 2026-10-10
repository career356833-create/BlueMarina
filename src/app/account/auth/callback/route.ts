import { actorClass, eventDomain, isKakaoSession } from "@/lib/acquisition/events";
import { bestEffort, checkedCookie, cookieValue, LOGIN_COOKIE, sessionFor, writeEvent } from "@/lib/acquisition/event-server";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

function redirect(request: NextRequest, path: string) {
  const target = request.nextUrl.clone();
  target.pathname = path;
  target.search = "";
  const response = NextResponse.redirect(target);
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || request.nextUrl.searchParams.has("error") || !url || !key) {
    return redirect(request, "/account/login");
  }

  const response = redirect(request, "/account/auth/complete");
  const client = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) return redirect(request, "/account/login");
    try {
    const attempt = checkedCookie(cookieValue(request, LOGIN_COOKIE));
    const sessionId = sessionFor(request)?.id;
    if (data?.session && data.user && isKakaoSession(data.user) && attempt && sessionId) {
      const user = data.user;
      bestEffort(() => writeEvent({ name: "kakao_login_complete", route: "LOGIN", returnRoute: attempt.route ?? "UNKNOWN", domain: eventDomain("kakao_login_complete", attempt.route ?? "UNKNOWN"), actor: actorClass(user), userId: user.id, sessionId, dedupe: `login:${attempt.id}` }));
    }
    response.cookies.delete(LOGIN_COOKIE);
    } catch { /* Telemetry cannot turn a successful OAuth exchange into a login failure. */ }
    return response;
  } catch {
    return redirect(request, "/account/login");
  }
}
