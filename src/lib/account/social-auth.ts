import { safeAuthReturnTo } from "./auth-return";

export const SOCIAL_AUTH_RETURN_KEY = "blue-marina:social-auth-return-to";
export const SOCIAL_AUTH_CALLBACK_PATH = "/account/auth/callback";

export function socialAuthReturnTo(value: string | null): string {
  return safeAuthReturnTo(value);
}

export function socialProviderLabel(provider: unknown): string {
  if (provider === "kakao") return "Kakao";
  if (provider === "google") return "Google";
  if (provider === "email" || provider == null) return "Email";
  return "기타";
}
