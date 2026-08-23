import { randomUUID } from "node:crypto";
import { ZodError, type ZodTypeAny } from "zod";
import type { FishMediaHandlerContext, FishMediaHttpRequest, FishMediaHttpResponse } from "./fish-media-handler-context";
import { fail, ok } from "./fish-media-http-response";
import { parseFishMediaIdempotencyKey } from "./fish-media-idempotency";
import { mapFishMediaHttpError } from "./fish-media-http-error-mapper";
import { originAllowed } from "./fish-media-origin-policy";
import { uuid } from "./fish-media-request-schemas";

function expectedMethodForAction(action: "upload_request" | "finalize" | "delete" | "publish") {
  return action === "delete" ? "DELETE" : "POST";
}

export function createFishMediaHandler(
  action: "upload_request" | "finalize" | "delete" | "publish",
  schema: ZodTypeAny,
  invoke: (gateway: FishMediaHandlerContext["gateway"], input: Record<string, unknown>) => Promise<Record<string, unknown>>,
  accepted = 200,
) {
  return async (ctx: FishMediaHandlerContext, req: FishMediaHttpRequest): Promise<FishMediaHttpResponse> => {
    const requestId = randomUUID();

    if (!ctx.enabled) return fail(requestId, 503, "FISH_MEDIA_GATEWAY_DISABLED");
    if (req.method.toUpperCase() !== expectedMethodForAction(action)) {
      return fail(requestId, 405, "METHOD_NOT_ALLOWED", undefined, false, { Allow: expectedMethodForAction(action) });
    }
    if (!originAllowed(req.origin, ctx.allowedOrigins)) return fail(requestId, 403, "ORIGIN_NOT_ALLOWED");

    const auth = await ctx.auth.authenticate(req);
    if (!auth) return fail(requestId, 401, "UNAUTHENTICATED");

    const observationId = req.pathParams.observationId;
    if (!uuid.safeParse(observationId).success) return fail(requestId, 400, "VALIDATION_ERROR", "observationId");

    const idempotency = parseFishMediaIdempotencyKey(req.headers["idempotency-key"]);
    if (!idempotency.ok) return fail(requestId, 400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key");

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const field = parsed.error instanceof ZodError ? parsed.error.issues[0]?.path.join(".") : undefined;
      return fail(requestId, 400, "VALIDATION_ERROR", field);
    }

    if (action === "publish" && auth.fishRole !== "fish_admin" && auth.fishRole !== "fish_reviewer") {
      return fail(requestId, 403, "ROLE_NOT_ALLOWED");
    }

    const limit = await ctx.limiter.consume({ actorUserId: auth.actorUserId, action, observationId });
    if (!limit.allowed) {
      return { ...fail(requestId, 429, "RATE_LIMITED", undefined, true), headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } };
    }

    try {
      const data = await invoke(ctx.gateway, {
        ...parsed.data,
        actorUserId: auth.actorUserId,
        actorRole: auth.fishRole ?? auth.authRole,
        observationId,
        mediaId: req.pathParams.mediaId,
        idempotencyKey: idempotency.value,
      });
      return ok(requestId, data, accepted);
    } catch (error) {
      return mapFishMediaHttpError(requestId, error);
    }
  };
}
