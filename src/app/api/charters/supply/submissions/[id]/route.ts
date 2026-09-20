import { type NextRequest } from "next/server";
import { intakeErrorResponse, intakeSuccess } from "@/lib/charters/intake/http";
import { authorizeIntakeRequest } from "@/lib/charters/intake/server";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const context=await authorizeIntakeRequest(request);const submission=await context.service.get((await params).id);if(!context.isAdmin&&submission.submittedBy!==context.userId)return intakeErrorResponse(new (await import("@/lib/charters/intake/types")).SupplyIntakeError("AUTH_REQUIRED",403));return intakeSuccess({submission});}catch(error){return intakeErrorResponse(error);}}
