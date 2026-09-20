import { type NextRequest } from "next/server";
import { intakeErrorResponse, intakeSuccess } from "@/lib/charters/intake/http";
import { authorizeIntakeRequest, enforceIntakeRateLimit, readLimitedJson } from "@/lib/charters/intake/server";

export const dynamic="force-dynamic";
export async function POST(request:NextRequest){try{const context=await authorizeIntakeRequest(request);enforceIntakeRateLimit(context.userId);const body=await readLimitedJson(request);const key=request.headers.get("idempotency-key")??"";const result=await context.service.create(body,context.userId,key);return intakeSuccess({submissionId:result.submission.id,status:result.submission.status,idempotent:result.idempotent},result.idempotent?200:201);}catch(error){return intakeErrorResponse(error);}}
export async function GET(request:NextRequest){try{const context=await authorizeIntakeRequest(request,true);const limit=Number(request.nextUrl.searchParams.get("limit")??50);return intakeSuccess({submissions:await context.service.list(limit)});}catch(error){return intakeErrorResponse(error);}}
