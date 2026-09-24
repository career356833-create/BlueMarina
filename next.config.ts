import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/fishing-condition/climatology/ocean-section": ["./data/nifs/fishing-condition/ocean-section/climatology/v1/**/*"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" }
        ]
      },
      {
        source: "/account/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      },
      {
        source: "/charters/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      },
      {
        source: "/market/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      },
      {
        source: "/charters/onboarding",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      },
      {
        source: "/market/new",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      },
      {
        source: "/community/new",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      }
    ];
  }
};

export default nextConfig;
