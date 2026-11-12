/**
 * Shared API client — base URL, typed errors, fetch helper.
 *
 * Isomorphic: callers pass an `ApiTransport` (`browserTransport` by default,
 * `serverTransport` from a server component), so no runtime check can pull a
 * server-only module into the browser bundle.
 */

import type { ApiPaginated } from "./types/api";

/** Same-origin: proxied server-side to the backend by `app/api/[...path]/route.ts`. */
const API_BASE = "/api";

/** How a request reaches the backend, from an API path (`/profile/me`). */
export type ApiTransport = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

/** `credentials: "include"` carries the session cookie. */
const browserTransport: ApiTransport = (path, init) =>
  fetch(`${API_BASE}${path}`, { credentials: "include", ...init });

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    path: string,
    public readonly apiMessage?: string,
    public readonly fieldErrors?: ReadonlyArray<FieldError>,
    /** Discriminator for routes where one status means several things. */
    public readonly code?: string,
  ) {
    super(
      apiMessage
        ? `API ${status} (${path}): ${apiMessage}`
        : `API ${status}: ${path}`,
    );
    this.name = "ApiError";
  }
}

export interface FieldError {
  /** Path segments pointing at the invalid field (e.g. ["city"]). */
  path: unknown[];
  message: string;
}

/**
 * Ceiling for one request. The caller's abort signal only fires when the next
 * view starts, so a hung backend would otherwise load forever.
 */
const REQUEST_TIMEOUT_MS = 20_000;

function withTimeout(init: RequestInit | undefined): RequestInit {
  const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, deadline])
    : deadline;
  return { ...init, signal };
}

/** Fetch through `transport`; throws `ApiError` on a non-OK response. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  transport: ApiTransport = browserTransport,
): Promise<T> {
  const { headers: callerHeaders, ...rest } = init ?? {};
  // One `Headers`: an object spread would drop a `Headers` instance.
  const headers = new Headers({ Accept: "application/json" });
  if (rest.body) headers.set("Content-Type", "application/json");
  new Headers(callerHeaders).forEach((value, name) => {
    headers.set(name, value);
  });
  const res = await transport(path, withTimeout({ ...rest, headers }));

  if (!res.ok) {
    let apiMessage: string | undefined;
    let fieldErrors: FieldError[] | undefined;
    let code: string | undefined;
    try {
      const body = (await res.json()) as {
        message?: unknown;
        errors?: unknown;
        code?: unknown;
      };
      if (typeof body.message === "string") {
        apiMessage = body.message;
      }
      if (Array.isArray(body.errors)) {
        fieldErrors = body.errors as FieldError[];
      }
      if (typeof body.code === "string") {
        code = body.code;
      }
    } catch {
      // Non-JSON body (proxy, network cut) — nothing to extract.
    }
    throw new ApiError(res.status, path, apiMessage, fieldErrors, code);
  }

  // 204 / empty body.
  const text = await res.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Which shape a collection endpoint answered with: `GET /applications/mine`
 * may answer a bare array or the `{ data, meta }` envelope.
 */
export type CollectionShape<T, TMeta = ApiPaginated<T>["meta"]> =
  | { kind: "array"; rows: T[] }
  | { kind: "envelope"; rows: T[]; meta: TMeta }
  | { kind: "unknown"; rows: [] };

export function unwrapCollection<T, TMeta = ApiPaginated<T>["meta"]>(
  raw: unknown,
): CollectionShape<T, TMeta> {
  if (Array.isArray(raw)) {
    return { kind: "array", rows: raw };
  }
  if (raw && typeof raw === "object" && "data" in raw && "meta" in raw) {
    const envelope = raw as { data: T[]; meta: TMeta };
    return { kind: "envelope", rows: envelope.data ?? [], meta: envelope.meta };
  }
  return { kind: "unknown", rows: [] };
}

/**
 * A query string from optional parameters. `undefined`, `null` and `""` are
 * left out; `false` and `0` are sent.
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

/** Converts an expected 404 to a fallback; other errors keep propagating. */
export function notFoundAs<T>(fallback: T) {
  return (error: unknown): T => {
    if (error instanceof ApiError && error.status === 404) {
      return fallback;
    }
    throw error;
  };
}
