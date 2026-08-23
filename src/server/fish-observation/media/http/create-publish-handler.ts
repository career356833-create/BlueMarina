import { createFishMediaHandler } from "./fish-media-handler-factory";
import { publishBody } from "./fish-media-request-schemas";

export const createPublishHandler = createFishMediaHandler("publish", publishBody, (g, i) =>
  g.publishObservationMedia({
    ...i,
    purpose: "public_review",
  }),
);
