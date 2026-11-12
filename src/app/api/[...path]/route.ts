import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

/**
 * Data proxy, so every backend call is same-origin from the browser.
 * `/api/auth/*` is handled by `api/auth/[...all]/route.ts`.
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
