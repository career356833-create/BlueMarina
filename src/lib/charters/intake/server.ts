import "server-only";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CharterSupplyIntakeService } from "./service";
import { SupabaseSupplyIntakeRepository } from "./supabase-repository";
import { SupplyIntakeError } from "./types";

export const MAX_REQUEST_BYTES = 262_144;
const hits = new Map<string,{count:number;resetAt:number}>();

export async function authorizeIntakeRequest(request:NextRequest,admin=false){
  if(process.env.CHARTER_SUPPLY_INTAKE_ENABLED!=="true")throw new SupplyIntakeError("AUTH_REQUIRED",401);
  const token=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];const client=createServiceClient();if(!token||!client)throw new SupplyIntakeError("AUTH_REQUIRED",401);
  const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new SupplyIntakeError("AUTH_REQUIRED",401);
  const isAdmin=data.user.app_metadata?.charter_role==="charter_admin";if(admin&&!isAdmin)throw new SupplyIntakeError("AUTH_REQUIRED",403);
  return {userId:data.user.id,isAdmin,service:new CharterSupplyIntakeService(new SupabaseSupplyIntakeRepository(client))};
}

export function enforceIntakeRateLimit(actorId:string){const now=Date.now(),entry=hits.get(actorId);if(!entry||entry.resetAt<=now){hits.set(actorId,{count:1,resetAt:now+600_000});return;}if(entry.count>=10)throw new SupplyIntakeError("AUTH_REQUIRED",429);entry.count+=1;}
export async function readLimitedJson(request:NextRequest){const declared=Number(request.headers.get("content-length")??0);if(declared>MAX_REQUEST_BYTES)throw new SupplyIntakeError("VALIDATION_ERROR",413);const text=await request.text();if(new TextEncoder().encode(text).byteLength>MAX_REQUEST_BYTES)throw new SupplyIntakeError("VALIDATION_ERROR",413);try{return JSON.parse(text) as unknown;}catch{throw new SupplyIntakeError("VALIDATION_ERROR",400);}}
