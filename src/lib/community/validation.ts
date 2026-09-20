import { COMMUNITY_POST_TYPES, COMMUNITY_REPORT_REASONS, type CommunityImageInput, type CommunityLinkCatalog, type CommunityPostDraft, type CommunityReportReason } from "./types";
import { detectCommunitySafetyFlags } from "./moderation";

export const MAX_COMMUNITY_IMAGES = 10;
export const MAX_COMMUNITY_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_COMMUNITY_COMMENT_LENGTH = 1000;
export const COMMUNITY_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const markup = /<\/?[a-z][^>]*>|javascript:|on(?:error|load|click)\s*=/i;
const urlPattern = /https?:\/\/[^\s]+/gi;

export function sanitizeCommunityText(value: string, max: number) {
  return value.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
export function sanitizeCommunityFilename(value: string) {
  return (value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim() || "image").slice(0, 120);
}
export function validateCommunityImage(image: Pick<CommunityImageInput, "name" | "type" | "size">) {
  const errors: string[] = [];
  if (!COMMUNITY_IMAGE_MIME_TYPES.includes(image.type as never)) errors.push("JPEG, PNG, WebP 이미지만 사용할 수 있습니다.");
  if (image.size < 1 || image.size > MAX_COMMUNITY_IMAGE_BYTES) errors.push("이미지는 장당 8 MiB 이하여야 합니다.");
  if (image.name.includes("..") || /[\\/]/.test(image.name) || image.type === "image/svg+xml") errors.push("안전하지 않은 이미지 이름 또는 형식입니다.");
  return errors;
}
const unknownLinks = (values: string[], allowed: ReadonlySet<string>) => values.filter((id) => !allowed.has(id));

export function validateCommunityPostDraft(input: CommunityPostDraft, catalog: CommunityLinkCatalog) {
  const title = sanitizeCommunityText(input.title ?? "", 100), body = sanitizeCommunityText(input.body ?? "", 5000);
  const errors: string[] = [], warnings: string[] = [];
  if (!COMMUNITY_POST_TYPES.includes(input.type as never)) errors.push("유효한 글 유형을 선택해야 합니다.");
  if (title.length < 4 || (input.title ?? "").length > 100) errors.push("제목은 4~100자로 입력해야 합니다.");
  if (body.length < 20 || (input.body ?? "").length > 5000) errors.push("본문은 20~5000자로 입력해야 합니다.");
  if (markup.test(`${input.title ?? ""} ${input.body ?? ""}`)) errors.push("HTML, script 또는 event handler는 사용할 수 없습니다.");
  if ((`${input.title ?? ""} ${input.body ?? ""}`.match(urlPattern) ?? []).length > 3) errors.push("URL은 최대 3개까지 포함할 수 있습니다.");
  if (input.images.length > MAX_COMMUNITY_IMAGES) errors.push("이미지는 최대 10장입니다.");
  input.images.forEach((image) => errors.push(...validateCommunityImage(image)));
  const linkGroups: Array<[string[], ReadonlySet<string>, string]> = [[input.linkedSpeciesIds,catalog.speciesIds,"어종"],[input.linkedFishingSpotIds,catalog.fishingSpotIds,"낚시 포인트"],[input.linkedCharterIds,catalog.charterIds,"출조"],[input.linkedMarketListingIds,catalog.marketListingIds,"마켓"]];
  for (const [values, allowed, label] of linkGroups) if (unknownLinks(values, allowed).length) errors.push(`등록되지 않은 ${label} ID가 포함되어 있습니다.`);
  const safetyFlags = detectCommunitySafetyFlags(`${title} ${body}`);
  if (safetyFlags.length) warnings.push("커뮤니티 안전 검토가 필요한 표현이 포함되어 있습니다.");
  const sanitized: CommunityPostDraft = {...input,title,body,province:sanitizeCommunityText(input.province ?? "",30),district:input.district?sanitizeCommunityText(input.district,40):null,images:input.images.map((image,order)=>({...image,name:sanitizeCommunityFilename(image.name),order})),linkedSpeciesIds:[...new Set(input.linkedSpeciesIds)],linkedFishingSpotIds:[...new Set(input.linkedFishingSpotIds)],linkedCharterIds:[...new Set(input.linkedCharterIds)],linkedMarketListingIds:[...new Set(input.linkedMarketListingIds)]};
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings, safetyFlags, sanitized };
}
export function validateCommunityComment(value: string) {
  const body = sanitizeCommunityText(value ?? "", MAX_COMMUNITY_COMMENT_LENGTH), errors: string[] = [];
  if (!body) errors.push("댓글 내용을 입력해야 합니다.");
  if ((value ?? "").length > MAX_COMMUNITY_COMMENT_LENGTH) errors.push("댓글은 1000자 이하여야 합니다.");
  if (markup.test(value ?? "")) errors.push("댓글에 HTML 또는 script를 사용할 수 없습니다.");
  return { valid: errors.length === 0, body, errors };
}
export function prepareCommunityReport(targetType: "POST" | "COMMENT", targetId: string, reason: string, detail: string) {
  if (!COMMUNITY_REPORT_REASONS.includes(reason as CommunityReportReason) || !targetId.trim()) return null;
  return { id: `community-report-local-${crypto.randomUUID()}`, targetType, targetId, reason: reason as CommunityReportReason, detail: sanitizeCommunityText(detail, 1000) || null, status: "PREPARED" as const, createdAt: new Date().toISOString() };
}
