import { type NextRequest, NextResponse } from "next/server";

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
