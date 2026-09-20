import type { CharterSupplySubmission, RowStatus, SpeciesReference, ValidationIssue } from "./contracts";

export interface SpeciesCatalogEntry { id: string; name: string }
export interface SpeciesAliasEntry { alias: string; canonicalId: string; safe: true }

export function sanitizePlainText(value: string, maxLength = 300): string {
  return value.replace(/[<>]/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function isSafeHttpUrl(value: string): boolean {
  if (!value) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

export function hasSpreadsheetFormula(value: string): boolean {
  return /^[\s]*[=+\-@]/.test(value);
}

export function normalizePhone(value: string): string | null {
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.length >= 8 && cleaned.length <= 16 ? cleaned : null;
}

export function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

const key = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");

export function resolveSpeciesExact(rawName: string, canonical: SpeciesCatalogEntry[], aliases: SpeciesAliasEntry[]): SpeciesReference {
  const normalized = key(rawName);
  const direct = canonical.find((entry) => key(entry.name) === normalized);
  if (direct) return { rawName, canonicalId: direct.id, matchType: "EXACT_CANONICAL" };
  const alias = aliases.find((entry) => entry.safe && key(entry.alias) === normalized);
  return alias ? { rawName, canonicalId: alias.canonicalId, matchType: "SAFE_ALIAS" } : { rawName, canonicalId: null, matchType: "UNRESOLVED" };
}

export function deriveRowStatus(issues: ValidationIssue[]): RowStatus {
  if (issues.some((issue) => issue.severity === "ERROR")) return "INVALID";
  return issues.length ? "VALID_WITH_WARNINGS" : "VALID";
}

export function validateSubmission(submission: CharterSupplySubmission): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!submission.operator.name) issues.push({ field: "operator.name", code: "REQUIRED", severity: "ERROR", message: "업체명은 필수입니다." });
  if (!submission.charters[0]?.title) issues.push({ field: "charters[0].title", code: "REQUIRED", severity: "ERROR", message: "출조상품명은 필수입니다." });
  if (!isSafeHttpUrl(submission.sourceIdentity.sourceUrl)) issues.push({ field: "sourceIdentity.sourceUrl", code: "UNSAFE_URL", severity: "ERROR", message: "출처 URL은 http 또는 https만 허용합니다." });
  if (submission.operator.websiteUrl && !isSafeHttpUrl(submission.operator.websiteUrl)) issues.push({ field: "operator.websiteUrl", code: "UNSAFE_URL", severity: "ERROR", message: "웹사이트 URL은 http 또는 https만 허용합니다." });
  const charter = submission.charters[0]; const boat = submission.boats[0]; const port = submission.ports[0];
  if (charter?.bookingUrl && !isSafeHttpUrl(charter.bookingUrl)) issues.push({ field: "charters[0].bookingUrl", code: "UNSAFE_URL", severity: "ERROR", message: "예약 URL은 http 또는 https만 허용합니다." });
  if (port?.latitude !== null && port?.latitude !== undefined && (port.latitude < -90 || port.latitude > 90)) issues.push({ field: "ports[0].latitude", code: "OUT_OF_RANGE", severity: "ERROR", message: "위도 범위를 확인하세요." });
  if (port?.longitude !== null && port?.longitude !== undefined && (port.longitude < -180 || port.longitude > 180)) issues.push({ field: "ports[0].longitude", code: "OUT_OF_RANGE", severity: "ERROR", message: "경도 범위를 확인하세요." });
  if (charter?.targetSpecies.some((species) => species.matchType === "UNRESOLVED")) issues.push({ field: "charters[0].targetSpecies", code: "SPECIES_REVIEW_REQUIRED", severity: "WARNING", message: "정확한 canonical 또는 승인 alias로 확인되지 않은 어종은 검토가 필요합니다." });
  if (!boat?.name) issues.push({ field: "boats[0].name", code: "MISSING_OPTIONAL", severity: "WARNING", message: "선박명이 없습니다." });
  if (!port?.name) issues.push({ field: "ports[0].name", code: "MISSING_OPTIONAL", severity: "WARNING", message: "출항항명이 없습니다." });
  return issues;
}
