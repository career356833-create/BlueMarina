import { createFishMediaHandler } from "./fish-media-handler-factory";
import { uploadBody } from "./fish-media-request-schemas";

export const createUploadRequestHandler = createFishMediaHandler("upload_request", uploadBody, (g, i) =>
  g.createObservationUpload({
    ...i,
    expectedMimeType: String(i.mimeType),
    expectedByteSize: Number(i.byteSize),
    purpose: "user_original_upload",
  }),
);
