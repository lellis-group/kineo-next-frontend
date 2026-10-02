import { headers } from "next/headers";
import type { ApiTransport } from "./api-client";

/**
 * The two things a browser attaches to a same-origin request for free and a
 * server component has to reproduce by hand.
 *
 * Shared rather than re-derived per call site: `fetch` on the server needs an
 * absolute URL — `/api/profile/me` means nothing outside the browser — so the
 * origin comes from the request headers instead of an env var, which is what
 * makes the same code work in dev behind the dev server and in production
 * behind whatever proxy fronts it. And the session cookie has to be forwarded
 * explicitly; the browser would have attached it on its own.
 *
 * Server-only: `next/headers` has no meaning in the browser, so importing this
 * from a client component fails at build time rather than at runtime. That is
 * the guard — no `server-only` package needed for a transport this small.
 */
export async function serverRequestTarget(): Promise<{
  /** Absolute origin of this app, from the request headers. */
  origin: string;
  /** The raw cookie header to forward, or "" when the reader sent none. */
  cookie: string;
  /**
   * The same headers, for the one case that needs more than the origin and the
   * cookie string — `getSessionCookie` reads a named cookie off them. Handed
   * back so a caller needing all three does not read `headers()` twice.
   */
  headers: Awaited<ReturnType<typeof headers>>;
}> {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:3001";

  return {
    origin: `${proto}://${host}`,
    cookie: requestHeaders.get("cookie") ?? "",
    headers: requestHeaders,
  };
}

/**
 * How a server component reaches the backend.
 *
 * The request goes through this app's own `/api/*` proxy rather than straight
 * to the backend, so there is one place that knows the backend URL and the
 * security model does not change with the call site.
 *
 * Server-only, by way of `serverRequestTarget` above.
 */
export const serverTransport: ApiTransport = async (path, init) => {
  const { origin, cookie } = await serverRequestTarget();

  return fetch(`${origin}/api${path}`, {
    // Member data must never be cached across requests: the response is scoped
    // to whoever holds the cookie being forwarded.
    cache: "no-store",
    ...init,
    headers: {
      ...init?.headers,
      cookie,
    },
  });
};
