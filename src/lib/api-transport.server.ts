import { headers } from "next/headers";
import type { ApiTransport } from "./api-client";

/**
 * The two things a browser attaches to a same-origin request for free and a
 * server component has to reproduce by hand.
 *
 * Shared rather than re-derived per call site: `fetch` on the server needs an
 * absolute URL — `/api/profile/me` means nothing outside the browser. The
 * origin is this app's own loopback address, from `INTERNAL_ORIGIN` or the
 * port it listens on — never the request's `Host` or `X-Forwarded-Proto`,
 * which the client controls: trusting them would let any request point the
 * server's own fetches (cookie attached) at a host of its choosing. Plain http
 * on loopback is right even behind a TLS proxy, which never sees this hop. And
 * the session cookie has to be forwarded explicitly; the browser would have
 * attached it on its own.
 *
 * Server-only: `next/headers` has no meaning in the browser, so importing this
 * from a client component fails at build time rather than at runtime. That is
 * the guard — no `server-only` package needed for a transport this small.
 */
/**
 * Where this app answers its own requests: `INTERNAL_ORIGIN` when the
 * deployment sets one (a container network, a non-default bind), otherwise
 * IPv4 loopback on `PORT` — `127.0.0.1` rather than `localhost`, which may
 * resolve to `::1` on a server bound to IPv4 only.
 */
function internalOrigin(): string {
  const configured = process.env.INTERNAL_ORIGIN?.replace(/\/+$/, "");
  return configured || `http://127.0.0.1:${process.env.PORT || 3001}`;
}

export async function serverRequestTarget(): Promise<{
  /** Absolute loopback origin of this app — never read from the request. */
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

  return {
    origin: internalOrigin(),
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
  const {
    origin,
    cookie,
    headers: requestHeaders,
  } = await serverRequestTarget();

  // The reader's address, forwarded when whoever fronts this app declared one.
  //
  // Without it the backend counts every server-rendered request under this
  // server's own address: the self-request below is a fresh `fetch` carrying no
  // headers of its own, so the one identifying the reader is dropped exactly
  // where it matters. Rate limits then apply platform-wide instead of per
  // reader — and since the browse page resolves two endpoints per render, a few
  // simultaneous readers are enough to trip a per-address limit and blank every
  // map at once.
  //
  // Nothing is invented when it is absent: a bare deployment behind no proxy
  // genuinely has one address, and forging a value would only make the backend's
  // trust chain lie.
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  return fetch(`${origin}/api${path}`, {
    // Member data must never be cached across requests: the response is scoped
    // to whoever holds the cookie being forwarded.
    cache: "no-store",
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers)),
      cookie,
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
  });
};
