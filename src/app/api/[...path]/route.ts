import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

/**
 * Generic data proxy — mirrors the auth proxy so all backend calls stay
 * same-origin from the browser. The phone only ever talks to this Next.js app;
 * the backend is reached from the machine itself, so no CORS, no second port,
 * no hard-coded IP in the client bundle.
 *
 * /api/auth/* is handled by the more specific src/app/api/auth/[...all]/route.ts.
 */
const toBackendPath = (pathname: string) =>
  pathname.replace(/^\/api/, "") || "/";

function handleApiProxy(request: NextRequest) {
  return proxyToBackend(request, toBackendPath, "API");
}

export const GET = handleApiProxy;
export const POST = handleApiProxy;
export const PUT = handleApiProxy;
export const DELETE = handleApiProxy;
export const PATCH = handleApiProxy;
