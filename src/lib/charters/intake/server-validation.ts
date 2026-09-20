import canonicalInventory from "../../../../data/fish-canonical/bulk/v1/canonical-inventory-v1.json";
import approvedAliases from "../../../../data/mbris/mappings/fish-data-approved-aliases.json";
import batch001 from "../../../../data/charters/acquisition/v1/charter-batch-001.json";
import type { CharterSupplySubmission, SubmissionType, ValidationIssue } from "../onboarding/contracts";
import { crosswalkMofBatch001 } from "../onboarding/crosswalk";
import { hasSpreadsheetFormula, isSafeHttpUrl, normalizePhone, resolveSpeciesExact, sanitizePlainText, validateSubmission } from "../onboarding/validation";
import { SupplyIntakeError } from "./types";

const canonical = canonicalInventory.species.map((item) => ({ id: item.speciesId, name: item.koreanName }));
const aliases = approvedAliases.filter((item) => item.approvalStatus === "approved").map((item) => ({ alias: item.sourceName, canonicalId: item.internalId, safe: true as const }));
const ports = new Map(batch001.ports.map((port) => [port.id, port]));
const registrations = batch001.sourceRegistrations.map((item) => ({ id: item.id, portName: ports.get(item.departurePortId)?.name ?? item.businessPlace ?? "", capacity: item.maximumPassengers, registrationInfo: item.sourceSerialNumber }));
const string = (value: unknown, max = 300) => typeof value === "string" ? sanitizePlainText(value, max) : "";
const nullable = (value: unknown, max = 300) => string(value, max) || null;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown) => Array.isArray(value) ? value : [];

export function normalizeServerSubmission(input: unknown, submissionId: string, now: string): CharterSupplySubmission {
  const root = object(input); const submissionType = root.submissionType;
  if (submissionType !== "OPERATOR_ONBOARDING" && submissionType !== "BULK_IMPORT") throw new SupplyIntakeError("VALIDATION_ERROR", 400);
  const entityLimit=submissionType==="BULK_IMPORT"?1000:20;for(const field of ["boats","ports","charters","schedules","documents"] as const)if(array(root[field]).length>entityLimit)throw new SupplyIntakeError("VALIDATION_ERROR",400);
  const structuralIssues:ValidationIssue[]=[];const numeric=(value:unknown,field:string)=>{if(value===null||value===undefined||value==="")return null;if(typeof value!=="number"||!Number.isFinite(value)){structuralIssues.push({field,code:"INVALID_NUMBER",severity:"ERROR",message:"숫자 형식을 확인하세요."});return null;}return value;};
  const operator = object(root.operator); const source = object(root.sourceIdentity);
  const boats = array(root.boats).map((value,index) => { const item=object(value); return { name: nullable(item.name), capacity: numeric(item.capacity,`boats[${index}].capacity`), vesselType: nullable(item.vesselType), registrationInfo: nullable(item.registrationInfo) }; });
  const portsInput = array(root.ports).map((value,index) => { const item=object(value); const latitude=numeric(item.latitude,`ports[${index}].latitude`),longitude=numeric(item.longitude,`ports[${index}].longitude`); return { name: nullable(item.name), region: nullable(item.region), address: nullable(item.address), latitude, longitude, coordinateStatus: latitude !== null || longitude !== null ? "USER_SUBMITTED" as const : "UNKNOWN" as const }; });
  const charters = array(root.charters).map((value,index) => { const item=object(value); const targetSpecies=array(item.targetSpecies).map((entry) => string(object(entry).rawName || entry)).filter(Boolean).map((rawName) => resolveSpeciesExact(rawName, canonical, aliases)); return { title: string(item.title), targetSpecies, price: numeric(item.price,`charters[${index}].price`), priceUnit: nullable(item.priceUnit), departureTime: nullable(item.departureTime), returnTime: nullable(item.returnTime), bookingMethod: nullable(item.bookingMethod), bookingUrl: nullable(item.bookingUrl, 1000) }; });
  const schedules = array(root.schedules).map((value,index) => { const item=object(value); return { date: nullable(item.date), departureTime: nullable(item.departureTime), returnTime: nullable(item.returnTime), capacity: numeric(item.capacity,`schedules[${index}].capacity`), remainingSeats: numeric(item.remainingSeats,`schedules[${index}].remainingSeats`) }; });
  return { submissionId, submissionType: submissionType as SubmissionType, submittedAt: now, state: "DRAFT", verificationStatus: "UNVERIFIED", sourceIdentity: { sourceType: submissionType as SubmissionType, sourceName: string(source.sourceName), sourceUrl: string(source.sourceUrl, 1000), submittedAt: now }, operator: { name: string(operator.name), representativeName: nullable(operator.representativeName), phone: normalizePhone(string(operator.phone)), email: nullable(operator.email), websiteUrl: nullable(operator.websiteUrl, 1000), region: nullable(operator.region) }, boats, ports: portsInput, charters, schedules, documents: array(root.documents).map((value) => { const item=object(value); return { kind: string(item.kind), reference: string(item.reference), sourceUrl: nullable(item.sourceUrl, 1000) }; }), validationIssues: structuralIssues };
}

export function runServerValidation(submission: CharterSupplySubmission) {
  const issues: ValidationIssue[] = [...submission.validationIssues, ...validateSubmission(submission)];
  if (!submission.boats.length) issues.push({ field: "boats", code: "REQUIRED", severity: "ERROR", message: "선박 배열이 필요합니다." });
  if (!submission.ports.length) issues.push({ field: "ports", code: "REQUIRED", severity: "ERROR", message: "출항항 배열이 필요합니다." });
  for (const [index,item] of submission.boats.entries()) if (item.capacity !== null && (!Number.isInteger(item.capacity) || item.capacity < 1 || item.capacity > 1000)) issues.push({ field: `boats[${index}].capacity`, code: "INVALID_CAPACITY", severity: "ERROR", message: "정원 범위를 확인하세요." });
  for (const [index,item] of submission.charters.entries()) if (item.price !== null && (item.price < 0 || item.price > 100_000_000)) issues.push({ field: `charters[${index}].price`, code: "INVALID_PRICE", severity: "ERROR", message: "가격 범위를 확인하세요." });
  for (const [index,item] of submission.schedules.entries()) { if (item.capacity !== null && (!Number.isInteger(item.capacity) || item.capacity < 1 || item.capacity > 1000)) issues.push({ field: `schedules[${index}].capacity`, code: "INVALID_CAPACITY", severity: "ERROR", message: "일정 정원 범위를 확인하세요." }); if (item.remainingSeats !== null && (item.remainingSeats < 0 || (item.capacity !== null && item.remainingSeats > item.capacity))) issues.push({ field: `schedules[${index}].remainingSeats`, code: "INVALID_REMAINING_SEATS", severity: "ERROR", message: "잔여석 범위를 확인하세요." }); }
  for (const document of submission.documents) if (document.sourceUrl && !isSafeHttpUrl(document.sourceUrl)) issues.push({ field: "documents.sourceUrl", code: "UNSAFE_URL", severity: "ERROR", message: "문서 URL은 http 또는 https만 허용합니다." });
  if (submission.submissionType === "BULK_IMPORT" && JSON.stringify(submission).split('"').some(hasSpreadsheetFormula)) issues.push({ field: "payload", code: "CSV_FORMULA_INJECTION", severity: "ERROR", message: "CSV 수식 값은 허용하지 않습니다." });
  submission.validationIssues = issues;
  const crosswalk = crosswalkMofBatch001(submission, registrations);
  return { submission, issues, summary: { errors: issues.filter((item) => item.severity === "ERROR").length, warnings: issues.filter((item) => item.severity === "WARNING").length }, crosswalk };
}
