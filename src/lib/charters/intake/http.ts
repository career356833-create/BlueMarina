import { NextResponse } from "next/server";
import { SupplyIntakeError } from "./types";
export function intakeErrorResponse(error:unknown){const known=error instanceof SupplyIntakeError;return NextResponse.json({ok:false,code:known?error.code:"INTERNAL_ERROR"},{status:known?error.status:500,headers:{"Cache-Control":"no-store"}});}
export const intakeSuccess = (body:Record<string,unknown>,status=200) => NextResponse.json({ok:true,...body},{status,headers:{"Cache-Control":"no-store"}});
