import {
  MARKET_CATEGORIES,
  MARKET_CONDITIONS,
  MARKET_PRICE_TYPES,
  MARKET_TRANSACTION_METHODS,
  type MarketDraftValidation,
  type MarketListingDraftInput
} from "./types";

export const MAX_MARKET_IMAGES = 8;
export const MAX_MARKET_IMAGE_BYTES = 8 * 1024 * 1024;
export const MARKET_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const prohibitedRules: Array<[string, RegExp]> = [
  ["FIREARM_AMMUNITION", /총기|실탄|탄약|공포탄/i],
  ["EXPLOSIVE", /폭발물|다이너마이트|사제폭탄/i],
  ["REGULATED_WEAPON", /도검|규제\s*무기|전기충격기/i],
  ["ILLEGAL_ELECTRONICS", /불법\s*(전파|교란|도청)|전파\s*교란기/i],
  ["STOLEN_COUNTERFEIT", /도난품|장물|위조품/i],
  ["ILLEGAL_CATCH", /불법\s*어획물|보호종\s*(판매|거래)/i],
  ["REGULATED_DRUG", /규제\s*약물|마약/i],
  ["HAZARDOUS_CHEMICAL", /위험\s*화학물질|독극물/i]
];
const marineSafetyTerms = /구명조끼|EPIRB|VHF|GPS|어군탐지기|엔진|배터리|연료/i;

export function sanitizeMarketText(value: string, maxLength: number) {
  return value.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeMarketFilename(value: string) {
  const normalized = value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim();
  return (normalized || "image").slice(0, 120);
}

export function isSafeMarketUrl(value: string) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export function validateMarketImage(image: { name: string; type: string; size: number }) {
  const errors: string[] = [];
  if (!MARKET_IMAGE_MIME_TYPES.includes(image.type as typeof MARKET_IMAGE_MIME_TYPES[number])) errors.push("지원하지 않는 이미지 형식입니다.");
  if (image.size <= 0 || image.size > MAX_MARKET_IMAGE_BYTES) errors.push("이미지는 8 MiB 이하여야 합니다.");
  return errors;
}

export function validateMarketListingDraft(input: MarketListingDraftInput): MarketDraftValidation {
  const sanitized: MarketListingDraftInput = {
    ...input,
    title: sanitizeMarketText(input.title, 80),
    description: sanitizeMarketText(input.description, 3000),
    subcategory: input.subcategory ? sanitizeMarketText(input.subcategory, 60) : null,
    province: sanitizeMarketText(input.province, 30),
    district: input.district ? sanitizeMarketText(input.district, 40) : null,
    contactDestination: input.contactDestination ? sanitizeMarketText(input.contactDestination, 300) : null,
    transactionMethods: [...new Set(input.transactionMethods)],
    images: input.images.map((image, order) => ({ ...image, name: sanitizeMarketFilename(image.name), order }))
  };
  const errors: string[] = [];
  const warnings: string[] = [];
  if (sanitized.title.length < 4 || sanitized.title.length > 80) errors.push("제목은 4~80자로 입력해야 합니다.");
  if (sanitized.description.length < 20 || sanitized.description.length > 3000) errors.push("설명은 20~3000자로 입력해야 합니다.");
  if (!MARKET_CATEGORIES.includes(sanitized.category as typeof MARKET_CATEGORIES[number])) errors.push("유효한 카테고리를 선택해야 합니다.");
  if (!MARKET_CONDITIONS.includes(sanitized.condition as typeof MARKET_CONDITIONS[number])) errors.push("유효한 상품 상태를 선택해야 합니다.");
  if (!MARKET_PRICE_TYPES.includes(sanitized.priceType as typeof MARKET_PRICE_TYPES[number])) errors.push("유효한 가격 유형을 선택해야 합니다.");
  if (sanitized.priceType === "FIXED" && (!Number.isFinite(sanitized.price) || (sanitized.price ?? -1) <= 0)) errors.push("가격 고정 상품은 0원보다 큰 가격이 필요합니다.");
  if (sanitized.priceType === "NEGOTIABLE" && sanitized.price !== null && (!Number.isFinite(sanitized.price) || sanitized.price < 0)) errors.push("협의 가격은 비워 두거나 0원 이상이어야 합니다.");
  if (sanitized.priceType === "FREE" && sanitized.price !== 0) errors.push("무료 나눔 가격은 0원이어야 합니다.");
  if (sanitized.priceType === "INQUIRY" && sanitized.price !== null) errors.push("가격 문의 상품의 가격은 비워 두어야 합니다.");
  if (!sanitized.province) errors.push("시·도를 입력해야 합니다.");
  if (!sanitized.transactionMethods.length || sanitized.transactionMethods.some((method) => !MARKET_TRANSACTION_METHODS.includes(method as typeof MARKET_TRANSACTION_METHODS[number]))) errors.push("유효한 거래 방식을 하나 이상 선택해야 합니다.");
  if (sanitized.images.length > MAX_MARKET_IMAGES) errors.push(`이미지는 최대 ${MAX_MARKET_IMAGES}장입니다.`);
  sanitized.images.forEach((image) => errors.push(...validateMarketImage(image)));
  if (!(["PHONE", "EMAIL", "EXTERNAL_LINK", "INQUIRY_PREPARED"] as const).includes(sanitized.contactType as "PHONE" | "EMAIL" | "EXTERNAL_LINK" | "INQUIRY_PREPARED")) errors.push("유효한 문의 방식을 선택해야 합니다.");
  if (sanitized.contactType === "EXTERNAL_LINK" && (!sanitized.contactDestination || !isSafeMarketUrl(sanitized.contactDestination))) errors.push("외부 문의 링크는 http 또는 https 주소여야 합니다.");
  const searchable = `${sanitized.title} ${sanitized.description}`;
  const prohibitedFlags = prohibitedRules.filter(([, pattern]) => pattern.test(searchable)).map(([flag]) => flag);
  if (prohibitedFlags.length) errors.push("거래 금지 또는 별도 심사가 필요한 품목 표현이 포함되어 있습니다.");
  if (marineSafetyTerms.test(searchable)) warnings.push("해양 안전·전자·엔진 품목은 작동 상태와 설치 적합성을 별도로 확인해야 합니다.");
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings, prohibitedFlags, sanitized };
}
