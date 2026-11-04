import type { NextConfig } from "next";

/**
 * Browser-side hardening, applied to every route.
 *
 * `X-Frame-Options` and `frame-ancestors` both deny framing: the first for
 * older browsers, the second for the ones that follow CSP. HSTS is only sent in
 * production — on a plain-HTTP local run it would pin `localhost` for a year.
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
 * Report-only for now, and production-only.
 *
 * Next injects inline scripts at runtime, so `'unsafe-inline'`/`'unsafe-eval'`
 * stay until a nonce is wired; MapLibre needs `blob:` workers and reads tiles
 * from OpenStreetMap. Enforcing this before the report is clean would break the
 * map, so the header reports and nothing blocks. Flip the key to
 * `Content-Security-Policy` once the console shows no legitimate violation.
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
  // Dev-only list of extra hosts allowed to open the dev server (e.g. your
  // phone on the LAN). Keep it out of source control via ALLOWED_DEV_ORIGINS.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // /goodbye is a static page (○) whose URL carries a single-use deletion
  // token from the email link. Production would otherwise serve it with
  // `Cache-Control: s-maxage=31536000` (1-year CDN/shared cache): pin it to
  // no-store and never leak the token through the Referer or search engines.
  // `headers()` CAN override Cache-Control for pages (only SHA-hashed
  // immutable assets are locked, see next docs) — verified against `next start`.
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
