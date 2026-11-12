import { headers } from "next/headers";
import type { ApiTransport } from "./api-client";
import { backendUrl } from "./backend-url.server";

/**
 * How a server component reaches the backend: straight to `BACKEND_URL`, with
 * the reader's cookie forwarded. Not through our own `/api/*` proxy: that
 * would need an absolute self-address, and the request's `Host` is forgeable.
 */
export const serverTransport: ApiTransport = async (path, init) => {
  const requestHeaders = await headers();

  // Forwarded so the backend's per-address rate limit sees the reader, not
  // this server (see `.env.example`).
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
