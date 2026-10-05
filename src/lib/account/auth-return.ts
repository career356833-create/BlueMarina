const allowedReturnPaths = new Set([
  "/account",
  "/account/profile",
  "/account/saved",
  "/account/activity",
  "/charters/onboarding",
  "/market/new",
  "/community/new",
  "/fishing-spots/conditions",
]);

export function safeAuthReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/account";
  try {
    const parsed = new URL(value, "https://blue-marina.invalid");
    if (value.split(/[?#]/, 1)[0] !== parsed.pathname) return "/account";
    const detail = /^\/fishing-spots\/(?:boat|rock)-\d+$/.test(parsed.pathname) || /^\/(?:charters|market)\/(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}|charter-[a-zA-Z0-9-]{1,120})$/.test(parsed.pathname);
    if (parsed.origin !== "https://blue-marina.invalid" || (!allowedReturnPaths.has(parsed.pathname) && !detail)) return "/account";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/account";
  }
}
