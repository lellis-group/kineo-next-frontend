import { type NextRequest, NextResponse } from "next/server";
import { slimForTarget, slimListPayload } from "@/lib/list-slimming";

/**
 * Headers that belong to one hop, not to the message.
 *
 * Relaying them to the backend (or back to the browser) describes a connection
 * the other side never made. `Connection` is read before the set is applied
 * because it can name more of them.
 */
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

/** The methods the two route files export; anything else is a 405, not a relay. */
const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/**
 * How long the backend gets to answer.
 *
 * Without a ceiling a hung upstream keeps the Next worker and the reader's tab
 * waiting for as long as the connection survives. Thirty seconds is far beyond
 * any endpoint this app calls.
 */
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
 * Points an upstream redirect back at this app.
 *
 * The backend answers with absolute URLs on its own origin; forwarding one
 * verbatim would send the browser straight to the internal address (and out of
 * the same-origin proxy). Only that origin is rewritten — relative and
 * third-party locations are left alone.
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
 * Forwards a request to the Kineo backend and streams the answer back.
 *
 * Shared by both proxy routes (`/api/[...path]` for data, `/api/auth/[...all]`
 * for auth), which were otherwise byte-identical apart from how they rewrote the
 * path and what they called the failure. One implementation means the header
 * handling, the body forwarding and the hop-by-hop stripping cannot drift
 * between the two.
 *
 * `rewrite` maps the incoming path onto the backend path; `label` names the
 * service in the 502 body, so a failure says which half of the API is down.
 *
 * List slimming (see `lib/list-slimming.ts`): the two heavy list reads are
 * buffered and re-emitted without the fields their cards never render
 * (`listing.description`, practice address/coords, full `message`), so every
 * page size benefits — including today's. Detail reads pass through untouched.
 */
export async function proxyToBackend(
  request: NextRequest,
  rewrite: (pathname: string) => string,
  label: string,
  /** Slimming table: which backend path wants which row slimming, or null to stream. */
  slimForTargetFn: (
    target: string,
  ) =>
    | ((row: Record<string, unknown>) => Record<string, unknown>)
    | null = slimForTarget,
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

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const target = rewrite(request.nextUrl.pathname);
  const url = `${backendUrl}${target}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  stripHopByHop(headers);
  // `fetch` sets both from the body and the URL it is actually calling. A
  // forwarded `host` would tell the backend it is serving the frontend's name,
  // and a forwarded `content-length` can disagree with a body we re-read.
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  // `x-forwarded-for` is deliberately left as it arrived, by copying every
  // incoming header and rewriting only the two above. It is what the backend
  // keys its rate limiter on, so rewriting or dropping it here would fold every
  // reader behind this app into one bucket. Do not "tidy" it away with the rest.

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      // Let the backend's own redirect reach the browser as a redirect rather
      // than being followed here, which would turn it into an opaque 200.
      redirect: "manual",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const slimmed = await maybeSlimListResponse(
      request,
      target,
      response,
      slimForTargetFn,
    );
    if (slimmed) return slimmed;

    const responseHeaders = new Headers(response.headers);
    stripHopByHop(responseHeaders);
    // The body is forwarded as a stream, so it is no longer the encoding these
    // headers describe. Passing them through makes the client try to decode it
    // a second time, and the length describes the encoded body, not the decoded
    // one we hand over.
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

/**
 * Buffers, slims and re-emits the two heavy list reads, or null to stream.
 *
 * Strictly `GET /applications/mine` and `GET /replacement-listings/mine`:
 * detail reads, writes and every other route return null and keep streaming
 * untouched. Non-JSON or unparsable answers fall through the same way, so a
 * slimming path that cannot parse never breaks a response it did not
 * understand — and an unknown future shape falls back to streaming rather
 * than to a broken page.
 */
async function maybeSlimListResponse(
  request: NextRequest,
  target: string,
  upstream: Response,
  slimForTargetFn: (
    target: string,
  ) => ((row: Record<string, unknown>) => Record<string, unknown>) | null,
): Promise<NextResponse | null> {
  if (request.method !== "GET" || !upstream.ok) return null;
  const slim = slimForTargetFn(target);
  if (!slim) return null;
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  let raw: unknown;
  try {
    raw = (await upstream.json()) as unknown;
  } catch {
    return null;
  }
  const slimmed = slimListPayload(raw, slim);
  if (slimmed === null) return null;
  return NextResponse.json(slimmed, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
}
