import { type NextRequest } from "next/server";
import { intakeErrorResponse, intakeSuccess } from "@/lib/charters/intake/http";
import { authorizeIntakeRequest, readLimitedJson } from "@/lib/charters/intake/server";
import type { ReviewAction } from "@/lib/charters/intake/types";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const context=await authorizeIntakeRequest(request,true);const body=await readLimitedJson(request) as {action?:unknown;reason?:unknown};if(!["APPROVE","REJECT","REQUEST_CHANGES"].includes(String(body.action)))throw new (await import("@/lib/charters/intake/types")).SupplyIntakeError("VALIDATION_ERROR",400);return intakeSuccess({submission:await context.service.review((await params).id,context.userId,body.action as ReviewAction,String(body.reason??""))});}catch(error){return intakeErrorResponse(error);}}
