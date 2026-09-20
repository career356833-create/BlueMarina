import type { CharterSupplySubmission, RowStatus, ValidationIssue } from "./contracts";
import { deriveRowStatus, hasSpreadsheetFormula, isSafeHttpUrl, normalizePhone, parseOptionalNumber, resolveSpeciesExact, sanitizePlainText, validateSubmission, type SpeciesAliasEntry, type SpeciesCatalogEntry } from "./validation";

export const MAX_IMPORT_BYTES = 1_048_576;
export const MAX_IMPORT_ROWS = 1_000;

export const CHARTER_IMPORT_COLUMNS = ["operator_name", "representative_name", "phone", "email", "website_url", "region", "boat_name", "capacity", "vessel_type", "registration_info", "port_name", "port_region", "port_address", "latitude", "longitude", "charter_title", "target_species", "price", "price_unit", "departure_time", "return_time", "booking_method", "booking_url", "schedule_date", "schedule_capacity", "remaining_seats", "source_url"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("UNCLOSED_QUOTE");
  return rows;
}

export interface ImportRow { rowNumber: number; status: RowStatus; submission: CharterSupplySubmission | null; issues: ValidationIssue[] }
export interface ImportDryRun { totalRows: number; valid: number; warnings: number; invalid: number; operators: number; boats: number; ports: number; charters: number; schedules: number; speciesMapped: number; speciesUnmapped: number; duplicates: number; issueCount: number; rows: ImportRow[] }

export function dryRunCharterCsv(text: string, canonical: SpeciesCatalogEntry[] = [], aliases: SpeciesAliasEntry[] = []): ImportDryRun {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error("FILE_TOO_LARGE");
  const parsed = parseCsv(text);
  const headers = parsed.shift()?.map((value) => value.trim()) ?? [];
  if (parsed.length > MAX_IMPORT_ROWS) throw new Error("TOO_MANY_ROWS");
  const missing = CHARTER_IMPORT_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`MISSING_COLUMNS:${missing.join(",")}`);
  const rows = parsed.map((values, offset): ImportRow => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const formulaField = Object.entries(raw).find(([, value]) => hasSpreadsheetFormula(value));
    if (formulaField) return { rowNumber: offset + 2, status: "INVALID", submission: null, issues: [{ field: formulaField[0], code: "CSV_FORMULA_INJECTION", severity: "ERROR", message: "수식으로 실행될 수 있는 셀 값은 허용하지 않습니다." }] };
    const textValue = (name: string, max = 300) => sanitizePlainText(raw[name] ?? "", max);
    const latitude = parseOptionalNumber(raw.latitude); const longitude = parseOptionalNumber(raw.longitude);
    const species = textValue("target_species").split("|").map((name) => name.trim()).filter(Boolean).map((name) => resolveSpeciesExact(name, canonical, aliases));
    const submission: CharterSupplySubmission = {
      submissionId: `BULK-ROW-${String(offset + 2).padStart(4, "0")}`, submissionType: "BULK_IMPORT", submittedAt: null, state: "DRAFT", verificationStatus: "UNVERIFIED",
      sourceIdentity: { sourceType: "BULK_IMPORT", sourceName: "CSV import", sourceUrl: textValue("source_url", 1000), submittedAt: null },
      operator: { name: textValue("operator_name"), representativeName: textValue("representative_name") || null, phone: normalizePhone(textValue("phone")), email: textValue("email") || null, websiteUrl: textValue("website_url", 1000) || null, region: textValue("region") || null },
      boats: [{ name: textValue("boat_name") || null, capacity: parseOptionalNumber(raw.capacity), vesselType: textValue("vessel_type") || null, registrationInfo: textValue("registration_info") || null }],
      ports: [{ name: textValue("port_name") || null, region: textValue("port_region") || null, address: textValue("port_address") || null, latitude, longitude, coordinateStatus: latitude !== null || longitude !== null ? "USER_SUBMITTED" : "UNKNOWN" }],
      charters: [{ title: textValue("charter_title"), targetSpecies: species, price: parseOptionalNumber(raw.price), priceUnit: textValue("price_unit") || null, departureTime: textValue("departure_time") || null, returnTime: textValue("return_time") || null, bookingMethod: textValue("booking_method") || null, bookingUrl: textValue("booking_url", 1000) || null }],
      schedules: [{ date: textValue("schedule_date") || null, departureTime: textValue("departure_time") || null, returnTime: textValue("return_time") || null, capacity: parseOptionalNumber(raw.schedule_capacity), remainingSeats: parseOptionalNumber(raw.remaining_seats) }], documents: [], validationIssues: []
    };
    const issues = validateSubmission(submission);
    for (const [field, value] of [["capacity", raw.capacity], ["price", raw.price], ["schedule_capacity", raw.schedule_capacity], ["remaining_seats", raw.remaining_seats]] as const) if (value.trim() && (parseOptionalNumber(value) === null || Number(value.replaceAll(",", "")) < 0)) issues.push({ field, code: "INVALID_NUMBER", severity: "ERROR", message: `${field} 값은 0 이상의 숫자여야 합니다.` });
    if (raw.phone.trim() && !submission.operator.phone) issues.push({ field: "phone", code: "INVALID_PHONE", severity: "WARNING", message: "전화번호 형식을 확인하세요." });
    if (!isSafeHttpUrl(submission.sourceIdentity.sourceUrl)) submission.state = "VALIDATION_FAILED";
    submission.validationIssues = issues;
    return { rowNumber: offset + 2, status: deriveRowStatus(issues), submission, issues };
  });
  const seen = new Set<string>();
  for (const row of rows) { if (!row.submission) continue; const identity = `${row.submission.operator.name}\u0000${row.submission.charters[0]?.title ?? ""}\u0000${row.submission.sourceIdentity.sourceUrl}`; if (seen.has(identity)) { const issue = { field: "row", code: "DUPLICATE_ROW", severity: "WARNING" as const, message: "동일한 업체·상품·출처 행이 중복되었습니다." }; row.issues.push(issue); row.submission.validationIssues.push(issue); row.status = deriveRowStatus(row.issues); } else seen.add(identity); }
  const accepted = rows.flatMap((row) => row.submission ? [row.submission] : []);
  const species = accepted.flatMap((submission) => submission.charters.flatMap((charter) => charter.targetSpecies));
  const identities = accepted.map((submission) => `${submission.operator.name}\u0000${submission.charters[0]?.title ?? ""}\u0000${submission.sourceIdentity.sourceUrl}`);
  return { totalRows: rows.length, valid: rows.filter((row) => row.status === "VALID").length, warnings: rows.filter((row) => row.status === "VALID_WITH_WARNINGS").length, invalid: rows.filter((row) => row.status === "INVALID").length, operators: accepted.filter((row) => row.operator.name).length, boats: accepted.filter((row) => row.boats[0]?.name).length, ports: accepted.filter((row) => row.ports[0]?.name).length, charters: accepted.filter((row) => row.charters[0]?.title).length, schedules: accepted.filter((row) => row.schedules[0]?.date).length, speciesMapped: species.filter((item) => item.canonicalId).length, speciesUnmapped: species.filter((item) => !item.canonicalId).length, duplicates: identities.length - new Set(identities).size, issueCount: rows.reduce((sum, row) => sum + row.issues.length, 0), rows };
}
