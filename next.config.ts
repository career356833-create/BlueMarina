import type { NextConfig } from "next";

// Production resource inventory: see docs/BLUE_MARINA_CSP_HARDENING_V1.md.
// Keep static generation; nonce-based dynamic rendering is outside this baseline.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://dapi.kakao.com https://t1.daumcdn.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://t1.daumcdn.net https://mts.daumcdn.net",
  "font-src 'self'",
  "connect-src 'self' https://tile.openstreetmap.org",
  "media-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

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
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
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
