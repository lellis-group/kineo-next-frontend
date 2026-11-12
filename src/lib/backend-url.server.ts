/**
 * Where the backend answers, for the `/api/*` proxy and the server transport.
 * Read on every call. Production refuses to fall back: that would send
 * members' cookies to whatever listens on `localhost:3000`.
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
