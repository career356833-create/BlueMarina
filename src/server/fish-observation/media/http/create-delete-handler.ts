import { createFishMediaHandler } from "./fish-media-handler-factory";
import { deleteBody } from "./fish-media-request-schemas";

export const createDeleteHandler = createFishMediaHandler("delete", deleteBody, (g, i) =>
  g.requestMediaDeletion({
    ...i,
    purpose: "delete_media",
  }),
  202,
);
