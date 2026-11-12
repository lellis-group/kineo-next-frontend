import { type NextRequest, NextResponse } from "next/server";
import { backendUrl as configuredBackendUrl } from "@/lib/backend-url.server";

/** Hop-by-hop headers; `Connection` may name more of them. */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/** Without a ceiling, a hung upstream holds the worker and the tab. */
const PROXY_TIMEOUT_MS = 30_000;

function stripHopByHop(headers: Headers): void {
  const connection = headers.get("connection");
  if (connection) {
    for (const token of connection.split(",")) {
      const name = token.trim();
      if (name) headers.delete(name);
    }
  }
  for (const name of HOP_BY_HOP) headers.delete(name);
}

/**
 * Points an upstream redirect on the backend's origin back at this app, so the
 * browser never leaves the same-origin proxy.
 */
function rewriteLocation(headers: Headers, backendUrl: string): void {
  const location = headers.get("location");
  if (!location) return;

  let origin: string;
  try {
    origin = new URL(backendUrl).origin;
  } catch {
    return;
  }
  if (!location.startsWith(origin)) return;

  const url = new URL(location);
  headers.set("location", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Forwards a request to the Kineo backend and streams the answer back. Shared by
 * `/api/[...path]` and `/api/auth/[...all]`; `label` names the service in the
 * 502 body.
 */
export async function proxyToBackend(
  request: NextRequest,
  rewrite: (pathname: string) => string,
  label: string,
): Promise<NextResponse> {
  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json(
      { error: `${label} method not allowed` },
      {
        status: 405,
        headers: { Allow: [...ALLOWED_METHODS].join(", ") },
      },
    );
  }

  const backendUrl = configuredBackendUrl();
  const target = rewrite(request.nextUrl.pathname);
  const url = `${backendUrl}${target}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  stripHopByHop(headers);
  // `fetch` sets these from the actual URL and body.
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  // `x-forwarded-for` is deliberately kept: the backend's rate limiter keys on
  // it. A deployment must put a reverse proxy in front that overwrites it (see
  // `.env.example`).

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      // Relay redirects to the browser instead of following them here.
      redirect: "manual",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const responseHeaders = new Headers(response.headers);
    stripHopByHop(responseHeaders);
    // The streamed body is already decoded.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    rewriteLocation(responseHeaders, backendUrl);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    console.error(`Proxy error (${label}):`, error);
    return NextResponse.json(
      { error: `${label} service ${timedOut ? "timed out" : "unavailable"}` },
      { status: timedOut ? 504 : 502 },
    );
  }
}
