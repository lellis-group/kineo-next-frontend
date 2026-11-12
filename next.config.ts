import type { NextConfig } from "next";

/**
 * Browser-side hardening, applied to every route. HSTS is production-only: on
 * plain-HTTP local runs it would pin `localhost` for a year.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

/**
 * Report-only, production-only: Next injects inline scripts (no nonce yet) and
 * MapLibre needs `blob:` workers and OSM tiles. Switch the key to
 * `Content-Security-Policy` once the reports are clean.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://tile.openstreetmap.org",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  cacheComponents: true,
  // Dev-only extra hosts allowed to open the dev server (e.g. a phone on the LAN).
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // /goodbye's URL carries a single-use deletion token: never cache it, never
  // leak it via Referer or search engines.
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        ...securityHeaders,
        ...(process.env.NODE_ENV === "production"
          ? [
              {
                key: "Content-Security-Policy-Report-Only",
                value: contentSecurityPolicy,
              },
            ]
          : []),
      ],
    },
    {
      source: "/goodbye",
      headers: [
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    },
  ],
};

export default nextConfig;
