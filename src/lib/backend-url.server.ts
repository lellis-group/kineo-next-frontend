/**
 * Where the Kineo backend answers, for the two server-side callers that reach
 * it: the `/api/*` proxy routes (`lib/backend-proxy.ts`) and the server
 * components' transport (`lib/api-transport.server.ts`).
 *
 * Read from `BACKEND_URL` on every call rather than once at import, so a test
 * or a restart with a new value is honoured. Development falls back to the
 * backend's default local port; production refuses to guess, because a
 * fallback there would send every member's cookie to whatever happens to
 * listen on `localhost:3000`.
 */
const DEVELOPMENT_BACKEND_URL = "http://localhost:3000";

export function backendUrl(): string {
  const configured = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL must be set in production");
  }
  return DEVELOPMENT_BACKEND_URL;
}
