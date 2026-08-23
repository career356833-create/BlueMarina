import { idempotencyKey } from "./fish-media-request-schemas";

export function parseFishMediaIdempotencyKey(input: string | undefined) {
  const parsed = idempotencyKey.safeParse(input);
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const };
}
