import { createFishMediaHandler } from "./fish-media-handler-factory";
import { finalizeBody } from "./fish-media-request-schemas";

export const createFinalizeHandler = createFishMediaHandler("finalize", finalizeBody, (g, i) => g.finalizeObservationUpload(i));
