import type { CommunityPost } from "./types";

export const productionCommunityDataset: Readonly<{ datasetKind: "PRODUCTION"; posts: readonly CommunityPost[] }> = {
  datasetKind: "PRODUCTION",
  posts: [],
};

export function findCommunityPost(posts: readonly CommunityPost[], id: string) {
  return posts.find((post) => post.id === id) ?? null;
}

export function getCommunityPost(id: string) {
  const post = findCommunityPost(productionCommunityDataset.posts, id);
  return post?.status === "ACTIVE" ? post : null;
}
