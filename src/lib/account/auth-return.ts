const allowedReturnPaths = new Set([
  "/account",
  "/account/profile",
  "/account/saved",
  "/account/activity",
  "/charters/onboarding",
  "/market/new",
  "/community/new",
]);

export function safeAuthReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/account";
  try {
    const parsed = new URL(value, "https://blue-marina.invalid");
    if (value.split(/[?#]/, 1)[0] !== parsed.pathname) return "/account";
    if (parsed.origin !== "https://blue-marina.invalid" || !allowedReturnPaths.has(parsed.pathname)) return "/account";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/account";
  }
}
