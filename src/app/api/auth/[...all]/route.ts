import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

/**
 * `/api/auth/*` is a mount point on the backend rather than a prefix to strip,
 * so the path crosses unchanged — which is also what makes this route the same
 * forwarding as the data proxy with no rewriting at all.
 */
const toBackendPath = (pathname: string) => pathname;

function handleAuthRequest(request: NextRequest) {
  return proxyToBackend(request, toBackendPath, "Auth");
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
export const PUT = handleAuthRequest;
export const DELETE = handleAuthRequest;
export const PATCH = handleAuthRequest;
