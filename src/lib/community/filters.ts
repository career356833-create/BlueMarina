import { COMMUNITY_POST_TYPES, COMMUNITY_SORTS, type CommunityFilters, type CommunityPost } from "./types";

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function parseCommunityFilters(query: Record<string, string | string[] | undefined>): CommunityFilters {
  const type = first(query.type);
  const sort = first(query.sort);
  return {
    type: COMMUNITY_POST_TYPES.includes(type as never) ? type as CommunityFilters["type"] : null,
    region: first(query.region)?.trim().slice(0, 40) || null,
    q: first(query.q)?.trim().slice(0, 80) || "",
    sort: COMMUNITY_SORTS.includes(sort as never) ? sort as CommunityFilters["sort"] : "NEWEST",
  };
}

export function filterCommunityPosts(posts: readonly CommunityPost[], filters: CommunityFilters) {
  const q = filters.q.toLocaleLowerCase("ko-KR");
  return posts
    .filter((post) => post.status === "ACTIVE")
    .filter((post) => !filters.type || post.type === filters.type)
    .filter((post) => !filters.region || [post.region?.province, post.region?.district].filter(Boolean).join(" ").includes(filters.region))
    .filter((post) => !q || [post.title, post.body, post.region?.province, post.region?.district].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR").includes(q))
    .toSorted((a, b) => filters.sort === "OLDEST" ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id) : b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
