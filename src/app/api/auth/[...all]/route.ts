import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

/** `/api/auth/*` is a mount point on the backend: the path crosses unchanged. */
const toBackendPath = (pathname: string) => pathname;

function handleAuthRequest(request: NextRequest) {
  return proxyToBackend(request, toBackendPath, "Auth");
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
export const PUT = handleAuthRequest;
export const DELETE = handleAuthRequest;
export const PATCH = handleAuthRequest;
