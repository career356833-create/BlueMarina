import { type NextRequest } from "next/server";
import { intakeErrorResponse, intakeSuccess } from "@/lib/charters/intake/http";
import { authorizeIntakeRequest } from "@/lib/charters/intake/server";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const context=await authorizeIntakeRequest(request,true);return intakeSuccess({submission:await context.service.validate((await params).id,context.userId)});}catch(error){return intakeErrorResponse(error);}}
