import { headers } from "next/headers";
import type { ApiTransport } from "./api-client";

/**
 * How a server component reaches the backend.
 *
 * Two things a browser gets for free and a server does not:
 *
 *  1. `fetch` on the server needs an absolute URL — `/api/profile/me` has no
 *     meaning outside the browser. The origin is reconstructed from the request
 *     headers rather than read from an env var, so the same code works in dev
 *     behind the dev server and in production behind whatever proxy fronts it.
 *  2. The session cookie has to be forwarded by hand; the browser would have
 *     attached it on its own.
 *
 * The request still goes through this app's own `/api/*` proxy rather than
 * straight to the backend, so there is one place that knows the backend URL and
 * the security model does not change with the call site.
 *
 * Server-only: `next/headers` has no meaning in the browser, so importing this
 * from a client component fails at build time rather than at runtime. That is
 * the guard — no `server-only` package needed for a transport this small.
 */
export const serverTransport: ApiTransport = async (path, init) => {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:3001";

  return fetch(`${proto}://${host}/api${path}`, {
    // Member data must never be cached across requests: the response is scoped
    // to whoever holds the cookie being forwarded.
    cache: "no-store",
    ...init,
    headers: {
      ...init?.headers,
      cookie: requestHeaders.get("cookie") ?? "",
    },
  });
};
