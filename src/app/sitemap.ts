import type { MetadataRoute } from "next";
import { fishingSpots } from "@/data/fishing-spots";
import { getPublicSiteUrl } from "@/lib/release/site-url";

const publicStaticPaths = [
  "/",
  "/today-sea",
  "/sea",
  "/sea/navigation",
  "/fishing-spots",
  "/fishing-spots/conditions",
  "/fish",
  "/license-guide",
  "/exam-guide",
  "/safety-guide",
  "/license-issue",
  "/official-links",
  "/centers",
  "/study",
  "/theory",
  "/practice",
  "/charters",
  "/market",
  "/community"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  if (!base) return [];

  const toEntry = (path: string, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({
    url: new URL(path, base).toString(),
    changeFrequency,
    priority: path === "/" ? 1 : 0.7
  });

  return [
    ...publicStaticPaths.map((path) => toEntry(path)),
    ...fishingSpots.map((spot) => toEntry(`/fishing-spots/${encodeURIComponent(spot.id)}`, "monthly"))
  ];
}
