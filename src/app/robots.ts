import type { MetadataRoute } from "next";
import { publicUrl } from "@/lib/release/site-url";

export default function robots(): MetadataRoute.Robots {
  const sitemap = publicUrl("/sitemap.xml")?.toString();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/today-sea", "/sea", "/fishing-spots", "/fish", "/license-guide", "/study", "/theory", "/practice"],
        disallow: ["/api/", "/account/", "/charters/admin/", "/market/admin/", "/charters/onboarding", "/market/new", "/community/new", "/reservations", "/dev-audit/"]
      }
    ],
    ...(sitemap ? { sitemap } : {})
  };
}
