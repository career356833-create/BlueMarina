import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_IMPORT_BYTES = 1_048_576;
export const MAX_IMPORT_ROWS = 1_000;
export const EXPECTED_COLUMNS = ["operator_name","representative_name","phone","email","website_url","region","boat_name","capacity","vessel_type","registration_info","port_name","port_region","port_address","latitude","longitude","charter_title","target_species","price","price_unit","departure_time","return_time","booking_method","booking_url","schedule_date","schedule_capacity","remaining_seats","source_url"];
export const hasFormula = (value) => /^[\s]*[=+\-@]/.test(value);
export const safeUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };

export function parseCsv(text) {
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i+=1){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i+=1;}else quoted=!quoted;}else if(c===","&&!quoted){row.push(field);field="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i+=1;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=c;} row.push(field);if(row.some(Boolean))rows.push(row);if(quoted)throw new Error("UNCLOSED_QUOTE");return rows;
}

export function inspectTemplate(text) {
  if(Buffer.byteLength(text,"utf8")>MAX_IMPORT_BYTES)throw new Error("FILE_TOO_LARGE");
  const rows=parseCsv(text);const headers=rows.shift()??[];if(rows.length>MAX_IMPORT_ROWS)throw new Error("TOO_MANY_ROWS");
  const missing=EXPECTED_COLUMNS.filter((name)=>!headers.includes(name));if(missing.length)throw new Error(`MISSING_COLUMNS:${missing.join(",")}`);
  return { rows:rows.length, demoPlaceholders:rows.filter((row)=>row.join(",").includes("DEMO_PLACEHOLDER")).length, formulaCells:rows.flat().filter(hasFormula).length, unsafeSourceUrls:rows.filter((row)=>!safeUrl(row[headers.indexOf("source_url")])).length };
}

const numberOrNull = (value) => value.trim() === "" ? null : Number(value.replaceAll(",", ""));
export function dryRunCsv(text) {
  const parsed=parseCsv(text);const headers=parsed.shift()??[];const missing=EXPECTED_COLUMNS.filter((name)=>!headers.includes(name));if(missing.length)throw new Error(`MISSING_COLUMNS:${missing.join(",")}`);
  const get=(row,name)=>row[headers.indexOf(name)]??"";const seen=new Set();let validRows=0,warningRows=0,invalidRows=0,boats=0,ports=0,schedules=0,speciesMapped=0,speciesUnmapped=0,duplicates=0,issueCount=0;
  for(const row of parsed){const errors=[],warnings=[];if(row.some(hasFormula))errors.push("CSV_FORMULA_INJECTION");if(!get(row,"operator_name").trim())errors.push("OPERATOR_REQUIRED");if(!get(row,"charter_title").trim())errors.push("CHARTER_REQUIRED");for(const name of ["source_url","website_url","booking_url"]){const value=get(row,name).trim();if((name==="source_url"&&!value)||(value&&!safeUrl(value)))errors.push(`UNSAFE_${name.toUpperCase()}`);}for(const name of ["capacity","price","schedule_capacity","remaining_seats"]){const value=get(row,name);const parsedNumber=numberOrNull(value);if(value.trim()&&(Number.isNaN(parsedNumber)||parsedNumber<0))errors.push(`INVALID_${name.toUpperCase()}`);}if(!get(row,"boat_name").trim())warnings.push("BOAT_MISSING");else boats+=1;if(!get(row,"port_name").trim())warnings.push("PORT_MISSING");else ports+=1;if(get(row,"schedule_date").trim())schedules+=1;const species=get(row,"target_species").split("|").map((item)=>item.trim()).filter(Boolean);speciesUnmapped+=species.length;const identity=[get(row,"operator_name"),get(row,"charter_title"),get(row,"source_url")].join("\u0000");if(seen.has(identity)){warnings.push("DUPLICATE_ROW");duplicates+=1;}else seen.add(identity);issueCount+=errors.length+warnings.length;if(errors.length)invalidRows+=1;else if(warnings.length||species.length){warningRows+=1;if(species.length)issueCount+=1;}else validRows+=1;}
  return {totalRows:parsed.length,validRows,warningRows,invalidRows,operators:parsed.filter((row)=>get(row,"operator_name").trim()).length,boats,ports,charters:parsed.filter((row)=>get(row,"charter_title").trim()).length,schedules,speciesMapped,speciesUnmapped,duplicates,issueCount};
}

export function buildReport(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..")) {
  const template=fs.readFileSync(path.join(root,"data/charters/templates/charter-import-template.csv"),"utf8");const inspection=inspectTemplate(template);
  const report={schemaVersion:1,program:"CHARTER_SUPPLY_ONBOARDING_V1",decision:"SUPPLY_ONBOARDING_READY_WITH_BACKEND_LIMITATIONS",generatedAt:"2026-09-20T00:00:00.000Z",channels:{operatorOnboarding:true,bulkImport:true,officialConnector:{contractOnly:true,implemented:0}},states:["DRAFT","SUBMITTED","VALIDATION_FAILED","REVIEW_REQUIRED","APPROVED","REJECTED","PROMOTED"],bulkImport:{maxBytes:MAX_IMPORT_BYTES,maxRows:MAX_IMPORT_ROWS,templateRows:inspection.rows,demoPlaceholders:inspection.demoPlaceholders,formulaCells:inspection.formulaCells,unsafeSourceUrls:inspection.unsafeSourceUrls,rowStatuses:["VALID","VALID_WITH_WARNINGS","INVALID"],dryRun:dryRunCsv(template)},crosswalk:{source:"MOF_BATCH_001",statuses:["EXACT_MATCH","HIGH_CONFIDENCE","CANDIDATE","NO_MATCH"],candidateAutoApproved:false},promotion:{requiresApproved:true,readiness:["READY","READY_WITH_LIMITATIONS","REVIEW_REQUIRED","REJECT"],output:"PROMOTION_CANDIDATE",productionActivation:0},security:{plainTextSanitization:true,httpHttpsOnly:true,formulaInjectionRejected:true,userCoordinates:"USER_SUBMITTED"},invariants:{authAssumptions:0,databaseWrites:0,supabaseWrites:0,productionRegistryMutations:0,reservationFlowMutations:0,officialApiCredentials:0}};
  fs.mkdirSync(path.join(root,"reports/charters"),{recursive:true});fs.writeFileSync(path.join(root,"reports/charters/supply-onboarding-v1.json"),`${JSON.stringify(report,null,2)}\n`);return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildReport();
