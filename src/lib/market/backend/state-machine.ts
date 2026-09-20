import type { MarketListingStatus } from "../types";import { MarketBackendError } from "./types";
const transitions:Record<MarketListingStatus,readonly MarketListingStatus[]>={DRAFT:["SUBMITTED"],SUBMITTED:["ACTIVE","REJECTED"],ACTIVE:["RESERVED","SOLD","HIDDEN"],RESERVED:["ACTIVE","SOLD","HIDDEN"],SOLD:[],HIDDEN:[],REJECTED:[]};
export function assertMarketTransition(from:MarketListingStatus,to:MarketListingStatus){if(!transitions[from].includes(to))throw new MarketBackendError("INVALID_STATE_TRANSITION",409)}
