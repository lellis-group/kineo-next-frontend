import { type NextRequest, NextResponse } from "next/server";
import { slimForTarget, slimListPayload } from "@/lib/list-slimming";

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
): Promise<NextResponse> {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
  const target = rewrite(request.nextUrl.pathname);
  const url = `${backendUrl}${target}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
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
    });

    const slimmed = await maybeSlimListResponse(request, target, response);
    if (slimmed) return slimmed;

    const responseHeaders = new Headers(response.headers);
    // The body is forwarded as a stream, so it is no longer the encoding these
    // headers describe. Passing them through makes the client try to decode it
    // a second time.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error (${label}):`, error);
    return NextResponse.json(
      { error: `${label} service unavailable` },
      { status: 502 },
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
): Promise<NextResponse | null> {
  if (request.method !== "GET" || !upstream.ok) return null;
  const slim = slimForTarget(target);
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
