import { headers } from "next/headers";
import type { ApiTransport } from "./api-client";
import { backendUrl } from "./backend-url.server";

/**
 * How a server component reaches the backend: straight to `BACKEND_URL`, with
 * the reader's cookie.
 *
 * Not through this app's own `/api/*` proxy. A request back into the app needs
 * an absolute address for the app itself, and every way of producing one is
 * wrong somewhere: the request's `Host` is the client's to forge (the server
 * would then send its own requests, cookie attached, wherever it is told), and
 * a loopback address does not exist on a serverless platform. Calling the
 * backend directly needs neither, saves a hop on every read, and keeps one
 * place that knows the backend's address (`backend-url.server.ts`) — the proxy
 * reads the same one. Paths are the backend's: `/profile/me` for data,
 * `/api/auth/…` for better-auth's own routes.
 *
 * The cookie has to be forwarded explicitly; the browser would have attached it
 * on its own. Member data is never cached across requests: the response is
 * scoped to whoever holds that cookie.
 *
 * Server-only: `next/headers` has no meaning in the browser, so importing this
 * from a client component fails at build time rather than at runtime.
 */
export const serverTransport: ApiTransport = async (path, init) => {
  const requestHeaders = await headers();

  // The reader's address, as it reached this app. Without it the backend would
  // count every server-rendered request under this server's own address, and a
  // few simultaneous readers would trip a per-address rate limit for everyone.
  // Forwarded as received, like the proxy does: it is only as true as the
  // reverse proxy in front of this app makes it (see `.env.example`).
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  return fetch(`${backendUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers)),
      cookie: requestHeaders.get("cookie") ?? "",
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
  });
};
