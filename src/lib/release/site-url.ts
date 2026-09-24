const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getPublicSiteUrl(): URL | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || LOCAL_HOSTS.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function publicUrl(pathname: string): URL | null {
  const base = getPublicSiteUrl();
  return base ? new URL(pathname, base) : null;
}
