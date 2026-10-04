export type PublicRouteProbe = {
  status: "HEALTHY" | "DEGRADED" | "ERROR";
  httpStatus: number | null;
  finalUrl: string | null;
  redirectCount: number;
  reason: string;
};

const MAX_REDIRECTS = 3;

export function productionProbeOrigin(siteUrl: string | undefined): string | null {
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

function canonicalPath(pathname: string): string {
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

function displayUrl(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

export async function probePublicRoute(
  origin: string,
  routePath: string,
  fetchRoute: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<PublicRouteProbe> {
  const requested = new URL(routePath, origin);
  let current = requested;
  const seen = new Set<string>();
  let redirectCount = 0;
  let canonicalOnly = true;

  try {
    while (true) {
      if (seen.has(current.href)) return { status: "ERROR", httpStatus: null, finalUrl: displayUrl(current), redirectCount, reason: "Redirect loop." };
      seen.add(current.href);
      const response = await fetchRoute(current, { cache: "no-store", redirect: "manual", signal });
      if (response.status < 300 || response.status >= 400) {
        return {
          status: response.status >= 200 && response.status < 300 ? canonicalOnly ? "HEALTHY" : "DEGRADED" : "ERROR",
          httpStatus: response.status,
          finalUrl: displayUrl(current),
          redirectCount,
          reason: redirectCount === 0 ? "Direct HTTP route check; browser rendering is not measured."
            : canonicalOnly ? "Same-origin canonical redirect resolved; browser rendering is not measured."
              : "Unexpected same-origin redirect resolved; inspect final route.",
        };
      }
      if (redirectCount >= MAX_REDIRECTS) return { status: "ERROR", httpStatus: response.status, finalUrl: displayUrl(current), redirectCount, reason: "Redirect limit exceeded." };
      const location = response.headers.get("location");
      if (!location) return { status: "ERROR", httpStatus: response.status, finalUrl: displayUrl(current), redirectCount, reason: "Redirect has no Location header." };
      const next = new URL(location, current);
      redirectCount += 1;
      if (next.origin !== requested.origin) return { status: "ERROR", httpStatus: response.status, finalUrl: displayUrl(next), redirectCount, reason: "Redirect leaves the trusted origin." };
      if (/^\/(?:account\/login|login|auth)(?:\/|$)/.test(next.pathname)) return { status: "ERROR", httpStatus: response.status, finalUrl: displayUrl(next), redirectCount, reason: "Public route redirected to authentication." };
      if (canonicalPath(next.pathname) !== canonicalPath(requested.pathname) || next.search !== requested.search) canonicalOnly = false;
      current = next;
    }
  } catch {
    return { status: "ERROR", httpStatus: null, finalUrl: displayUrl(current), redirectCount, reason: "Bounded route check failed or timed out." };
  }
}
