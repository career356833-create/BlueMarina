import type { Metadata } from "next";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function getPublicSiteUrl(): URL | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value || process.env.VERCEL_ENV === "preview") return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || LOCAL_HOSTS.has(url.hostname) || url.hostname.endsWith(".localhost")) return null;
    if (url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) return null;
    // Only the verified production alias is a canonical origin on Vercel.
    if (url.hostname.endsWith(".vercel.app") && url.hostname !== "blue-marina.vercel.app") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

export function publicUrl(pathname: string): URL | null {
  const base = getPublicSiteUrl();
  return base ? new URL(pathname, base) : null;
}

export function canonicalMetadata(pathname: string): Pick<Metadata, "alternates"> {
  const base = getPublicSiteUrl();
  if (!base || !pathname.startsWith("/") || pathname.startsWith("//") || /[\\?#]/.test(pathname)) return {};
  const canonical = new URL(pathname, base);
  return canonical.origin === base.origin ? { alternates: { canonical: canonical.toString() } } : {};
}
