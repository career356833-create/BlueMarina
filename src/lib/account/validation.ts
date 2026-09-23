import { ACCOUNT_SAVED_ENTITY_TYPES, type AccountSavedEntityType } from "./types";

const TAG_PATTERN = /<[^>]*>/g;

function cleanText(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_TEXT");
  const cleaned = value.replace(TAG_PATTERN, "").trim();
  if (!cleaned || cleaned.length > max) throw new Error("INVALID_TEXT");
  return cleaned;
}

export function validateProfilePatch(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_PROFILE");
  const value = input as Record<string, unknown>;
  const avatarUrl = cleanText(value.avatarUrl, 500);
  if (avatarUrl) {
    const parsed = new URL(avatarUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("INVALID_AVATAR_URL");
  }
  return {
    displayName: cleanText(value.displayName, 50),
    avatarUrl,
    region: cleanText(value.region, 80),
    bio: cleanText(value.bio, 300),
  };
}

export function validateSavedItem(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_SAVED_ITEM");
  const value = input as Record<string, unknown>;
  if (!ACCOUNT_SAVED_ENTITY_TYPES.includes(value.entityType as AccountSavedEntityType)) throw new Error("INVALID_ENTITY_TYPE");
  const entityId = cleanText(value.entityId, 160);
  if (!entityId) throw new Error("INVALID_ENTITY_ID");
  const href = cleanText(value.href, 400);
  if (href && (!href.startsWith("/") || href.startsWith("//"))) throw new Error("INVALID_HREF");
  return {
    entityType: value.entityType as AccountSavedEntityType,
    entityId,
    label: cleanText(value.label, 160),
    href,
  };
}
