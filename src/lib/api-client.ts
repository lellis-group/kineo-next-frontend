/**
 * Shared API client — base URL, typed errors, fetch helper.
 * Consumed by the domain services (dashboard, profile…).
 *
 * Isomorphic: the same service functions serve the browser and the server, and
 * the only thing that differs between the two is how the request leaves the
 * process. That difference is expressed as an `ApiTransport`, passed in by
 * whoever is calling — `browserTransport` from a client component,
 * `serverTransport` from a server component. Nothing here reaches for a runtime
 * environment check, so no server-only module can be pulled into the browser
 * bundle by accident.
 */

import type { ApiPaginated } from "./types/api";

/**
 * Backend base URL — same-origin. Requests are sent to /api/* on this Next.js
 * app and proxied server-side to the real backend (see
 * src/app/api/[...path]/route.ts). No backend IP/port is ever embedded in
 * client code, so the app works from any device/network (mobile included).
 */
const API_BASE = "/api";

/**
 * How a request reaches the backend.
 *
 * Takes the API path (`/profile/me`) rather than a full URL, because what the
 * full URL is depends on where the caller is running.
 */
export type ApiTransport = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Default: the browser calling this Next.js app, which proxies to the backend.
 * `credentials: "include"` is what carries the session cookie.
 */
const browserTransport: ApiTransport = (path, init) =>
  fetch(`${API_BASE}${path}`, { credentials: "include", ...init });

/** Typed API error — status, optional business message, optional machine code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    path: string,
    /** Business message from the API body, if JSON. */
    public readonly apiMessage?: string,
    /** Per-field Zod validation issues when the backend replies with { errors }. */
    public readonly fieldErrors?: ReadonlyArray<FieldError>,
    /**
     * Discriminator sent by routes where one status means several unrelated
     * things. The account erasure returns 409 both for "another candidate
     * blocks this" and "no pending request matches", and those need opposite
     * screens, so the status alone is not enough to act on.
     */
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

/** One validation issue surfaced by the backend `{ errors: [...] }` envelope. */
export interface FieldError {
  /** Path segments pointing at the invalid field (e.g. ["city"]). */
  path: unknown[];
  message: string;
}

/**
 * Fetch through `transport`. Throws typed ApiError on non-OK so callers can
 * distinguish expected states (soft 404, see `notFoundAs`) from real failures.
 *
 * `transport` defaults to the browser, so every existing call site keeps
 * working unchanged; only the server-side callers pass one.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  transport: ApiTransport = browserTransport,
): Promise<T> {
  const { headers, ...rest } = init ?? {};
  const res = await transport(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : undefined),
      ...headers,
    },
  });

  if (!res.ok) {
    // NestJS returns { message, error, statusCode } or, for Zod validation,
    // { message: "Validation failed", errors: [{ path, message }] } — surface
    // both the business message and the per-field issues.
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

  // 204 No Content / empty body (e.g. DELETE) → no JSON to parse.
  const text = await res.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Which of the three shapes a collection endpoint answered with.
 *
 * `GET /applications/mine` is documented to answer either as a bare array or as
 * the `{ data, meta }` envelope, and the array form carries no pagination or
 * totals at all. Both callers of this needed to tell the two apart — and needed
 * a third answer for "neither", which is what a backend that changed the shape
 * looks like — so the detection lives here once.
 *
 * `unknown` is not an error. A screen that can still show something useful from
 * an empty list should; that is each caller's decision, and `fetchAllPages`
 * treats it as an empty collection while the applications screen zeroes its
 * counters.
 */
export type CollectionShape<T> =
  | { kind: "array"; rows: T[] }
  | { kind: "envelope"; rows: T[]; meta: ApiPaginated<T>["meta"] }
  /** Nothing readable came back — `rows` is empty so callers can spread it. */
  | { kind: "unknown"; rows: [] };

export function unwrapCollection<T>(raw: unknown): CollectionShape<T> {
  if (Array.isArray(raw)) {
    return { kind: "array", rows: raw };
  }
  if (raw && typeof raw === "object" && "data" in raw && "meta" in raw) {
    const envelope = raw as ApiPaginated<T>;
    return { kind: "envelope", rows: envelope.data ?? [], meta: envelope.meta };
  }
  return { kind: "unknown", rows: [] };
}

/** A query string from a record of optional parameters.
 *
 * `undefined`, `null` and `""` are left out; everything else is sent, including
 * `false` and `0`. That is deliberate — a flag whose value is genuinely `false`
 * is not the same as one the caller had no opinion about, and silently dropping
 * it would make `urgentOnly: false` indistinguishable from not narrowing at all
 * at the call site that can only pass one of the two. Callers with a truthiness
 * rule (`urgentOnly || undefined`) say so themselves.
 *
 * Four call sites had this loop written out by hand.
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

/** Largest page size the collection endpoints accept. */
const MAX_PAGE_SIZE = 100;

/**
 * Stops a runaway loop if a backend ever reports an unbounded `totalPages`.
 * At this page size it is far more collections than one member can own.
 */
const MAX_PAGES = 20;

/**
 * Reads every page of a paginated collection.
 *
 * The collection endpoints default to `limit=20`, so a single request returns
 * only the first page. Anything that *counts* over a collection must therefore
 * not use one request: the dashboard would report fewer listings and
 * applications than the member actually owns, silently, past the twentieth.
 *
 * A 404 is an empty collection (onboarding), not a failure, so the pages
 * collected so far are returned rather than thrown away.
 *
 * A bare array is accepted as a whole collection. `/applications/mine` is
 * documented to answer that way as well as with the `{ data, meta }` envelope,
 * and returning nothing for it would quietly empty the dashboard for anyone on
 * that shape.
 */
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | undefined> = {},
  transport?: ApiTransport,
): Promise<T[]> {
  const collected: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = buildQuery({
      page,
      limit: MAX_PAGE_SIZE,
      ...params,
    });

    const raw = await apiFetch<unknown>(
      `${path}?${query}`,
      undefined,
      transport,
    ).catch(notFoundAs<unknown>(null));
    if (!raw) return collected;

    const shape = unwrapCollection<T>(raw);
    collected.push(...shape.rows);

    // A bare array is the whole collection — there is no next page to ask for.
    // A shape we cannot read stops the walk too: continuing would re-request
    // the first page until MAX_PAGES and then report a total nobody sent.
    if (shape.kind !== "envelope") break;

    if (page >= (shape.meta?.totalPages ?? 1)) break;
  }

  return collected;
}
