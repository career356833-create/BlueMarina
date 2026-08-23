import { z } from "zod";
export const uuid = z.string().uuid(); export const idempotencyKey = z.string().regex(/^[A-Za-z0-9_.:-]{8,128}$/);
export const uploadBody = z.object({ mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), byteSize: z.number().int().positive().max(15 * 1024 * 1024), purpose: z.literal("user_original_upload") }).strict();
export const finalizeBody = z.object({ uploadedObjectMetadata: z.object({ byteSize: z.number().int().positive().max(15 * 1024 * 1024), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), checksum: z.string().regex(/^[a-f0-9]{64}$/i).optional() }).strict() }).strict();
export const deleteBody = z.object({ reasonCode: z.string().max(80).optional() }).strict(); export const publishBody = z.object({ approvalReference: z.string().min(1).max(120), moderationNote: z.string().max(500).optional() }).strict();
