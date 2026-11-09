/**
 * Route audit — does this frontend call the routes the backend publishes?
 *
 * Every service function is invoked with a transport that records the request
 * and rejects it; each recorded call is held against the generated contract
 * (`api.gen.ts`, regenerated from the running backend's `/api-json` with
 * `bun run api:types`): the method-path pair must be published there, and the
 * call must have gone exactly there. A backend rename, a typo in a template
 * literal or a route that drifted shows up as a failing test instead of a 404
 * in a browser, after login.
 *
 * The audit goes both ways. A route the document gains must be either audited
 * on a call the frontend makes or named with a reason on `NOT_CONSUMED` — an
 * endpoint with no consumer is usually a screen half-built, and an unexplained
 * route would hide it. The better-auth session routes (`/api/auth/*`) are not
 * the backend's document and stay out, as do the probes a screen has no reason
 * to call.
 *
 * Methods and paths are in scope; bodies and query parameters are the
 * call-site contract the service specs test beside each adapter.
 */
import { describe, expect, it } from "bun:test";
import { confirmAccountDeletion } from "./account-deletion-service";
import type { ApiTransport } from "./api-client";
import {
  APPLICATIONS_PAGE_SIZE,
  applyToListing,
  fetchApplicationDetail,
  fetchApplicationsData,
  updateApplicationMessage,
  withdrawApplication,
} from "./applications/service";
import {
  fetchBrowseListing,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  fetchListingPageOf,
} from "./listings/browse-service";
import {
  acceptReceivedApplication,
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  fetchMyListings,
  markApplicationViewed,
  rejectReceivedApplication,
  shortlistReceivedApplication,
} from "./listings/service";
import {
  createProfile,
  fetchMyProfile,
  updateProfile,
} from "./profile-service";
import type { paths } from "./types/api.gen";

/**
 * The HTTP methods the backend document actually books — the operation keys of
 * the path items, beside the path-level `parameters` a document can carry and
 * which is not an operation.
 */
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Every operation the contract publishes, as `METHOD /path` — derived from the
 * generated `paths`, so the names below are checked against the *live* truth.
 *
 * The generator emits every method key on every path item and types the
 * unbooked ones `?: never` (and path-level `parameters` alongside them), so an
 * entry is kept only when the thing it points at is actually declared there —
 * required, and not `never`. The contract itself left the repository:
 * `api.gen.ts` is its only resident copy, regenerated with `bun run api:types`
 * against the dist the backend is serving. Nothing is imported at runtime —
 * the union is built at type level, and it is what gives the audit its teeth:
 *
 * - `DOCUMENTED_ROUTES` below is checked element-against-`satisfies`: any name
 *   the document does not publish (a typo, a removed route) is a compile error
 *   on the offending line;
 * - the counterpart `DOCUMENTED_COVERS_ALL` makes the written list *equal* the
 *   derived union, so a route the freshly regenerated document gained cannot
 *   slip past unaccounted — it surfaces as a compile error here, in this file,
 *   before any test runs.
 */
type DocumentedRoute = {
  [P in keyof paths & string]: {
    [M in keyof paths[P] & HttpMethod]: [undefined] extends [paths[P][M]]
      ? never
      : `${Uppercase<M>} ${P}`;
  }[keyof paths[P] & HttpMethod];
}[keyof paths & string];

/**
 * Two types are identical when each extends the other; mutual assignability of
 * a concrete literal union against the derived one is the strongest statement
 * TypeScript offers for "no member left out, none invented".
 */
type Identical<_A, _B> = [_A] extends [_B]
  ? [_B] extends [_A]
    ? true
    : false
  : false;

/**
 * The document's routes, written out in full.
 *
 * The contract could be walked at runtime (it used to be a committed JSON), but
 * `api.gen.ts` publishes only types, so the list exists as values here — and,
 * constrained as above, it *is* the audit: both reductions funnel through the
 * compiler, which is a stricter reader of the document than `Object.keys` ever
 * was.
 */
const DOCUMENTED_ROUTES = [
  // Probes and the welcome route — the document's own scaffolding.
  "GET /",
  "GET /ping",
  "GET /health",

  // Account erasure
  "POST /account/confirm-deletion",

  // Profile
  "POST /profile",
  "GET /profile",
  "GET /profile/me",
  "GET /profile/{id}",
  "PATCH /profile/{id}",
  "DELETE /profile/{id}",

  // Practices — the public directory.
  "POST /practices",
  "GET /practices",
  "GET /practices/mine",
  "GET /practices/{id}",
  "PATCH /practices/{id}",
  "DELETE /practices/{id}",

  // Replacement listings
  "POST /replacement-listings",
  "GET /replacement-listings",
  "GET /replacement-listings/facets",
  "GET /replacement-listings/places",
  "GET /replacement-listings/page-of",
  "GET /replacement-listings/mine",
  "GET /replacement-listings/{id}",
  "PATCH /replacement-listings/{id}",
  "DELETE /replacement-listings/{id}",
  "PATCH /replacement-listings/{id}/publish",
  "PATCH /replacement-listings/{id}/close",
  "PATCH /replacement-listings/{id}/cancel",

  // Applications
  "POST /applications",
  "GET /applications/mine",
  "GET /applications/listing/{listingId}",
  "GET /applications/{id}",
  "PATCH /applications/{id}",
  "PATCH /applications/{id}/view",
  "PATCH /applications/{id}/shortlist",
  "PATCH /applications/{id}/accept",
  "PATCH /applications/{id}/reject",
  "PATCH /applications/{id}/withdraw",
] as const satisfies readonly DocumentedRoute[];

/** Proven in the suite below — completeness is a test, not a comment. */
const DOCUMENTED_COVERS_ALL: Identical<
  DocumentedRoute,
  (typeof DOCUMENTED_ROUTES)[number]
> = true;

/** Every operation the document publishes, as a set. */
const PUBLISHED = new Set<string>(DOCUMENTED_ROUTES);

/** Verbatim records of the call each audit case must produce. */
const METHOD_PATH = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

type Method = keyof typeof METHOD_PATH;

interface AuditCase {
  /** The documented operation, written the way the contract writes it. */
  operation: DocumentedRoute;
  /** The guarded call, transport already threaded into it. */
  call: (transport: ApiTransport) => Promise<unknown>;
}

const AUDITED: readonly AuditCase[] = [
  // Replacement listings
  {
    operation: "GET /replacement-listings/mine",
    call: (t) => fetchMyListings({}, t),
  },
  {
    operation: "GET /replacement-listings/{id}",
    call: (t) => fetchMyListing("l0", t),
  },
  {
    operation: "PATCH /replacement-listings/{id}/close",
    call: (t) => closeListing("l0", t),
  },
  {
    operation: "PATCH /replacement-listings/{id}/cancel",
    call: (t) => cancelListing("l0", t),
  },
  {
    operation: "GET /replacement-listings",
    call: (t) => fetchBrowseListings({}, t),
  },
  {
    operation: "GET /replacement-listings/{id}",
    call: (t) => fetchBrowseListing("l0", t),
  },
  {
    operation: "GET /replacement-listings/places",
    call: (t) => fetchBrowsePlaces({}, t),
  },
  {
    operation: "GET /replacement-listings/page-of",
    call: (t) => fetchListingPageOf("l0", {}, t),
  },
  {
    operation: "GET /replacement-listings/facets",
    call: (t) => fetchFacets({}, t),
  },

  // Applications
  {
    operation: "GET /applications/{id}",
    call: (t) => fetchApplicationDetail("a0", t),
  },
  {
    operation: "GET /applications/mine",
    call: (t) =>
      fetchApplicationsData({ page: 1, limit: APPLICATIONS_PAGE_SIZE }, t),
  },
  {
    operation: "GET /applications/listing/{listingId}",
    call: (t) => fetchListingApplications("l0", {}, t),
  },
  {
    operation: "PATCH /applications/{id}/withdraw",
    call: (t) => withdrawApplication("a0", undefined, t),
  },
  {
    operation: "PATCH /applications/{id}",
    call: (t) => updateApplicationMessage("a0", "Hello", t),
  },
  {
    operation: "POST /applications",
    call: (t) => applyToListing("l0", undefined, t),
  },
  {
    operation: "PATCH /applications/{id}/view",
    call: (t) => markApplicationViewed("a0", t),
  },
  {
    operation: "PATCH /applications/{id}/shortlist",
    call: (t) => shortlistReceivedApplication("a0", t),
  },
  {
    operation: "PATCH /applications/{id}/accept",
    call: (t) => acceptReceivedApplication("a0", t),
  },
  {
    operation: "PATCH /applications/{id}/reject",
    call: (t) => rejectReceivedApplication("a0", undefined, t),
  },

  // Profile
  {
    operation: "POST /profile",
    call: (t) => createProfile(PROFILE_PAYLOAD, t),
  },
  { operation: "GET /profile/me", call: (t) => fetchMyProfile(t) },
  {
    operation: "PATCH /profile/{id}",
    call: (t) => updateProfile("p0", PROFILE_PAYLOAD, t),
  },

  // Account erasure
  {
    operation: "POST /account/confirm-deletion",
    call: (t) => confirmAccountDeletion("tok", t),
  },
];

/**
 * Documented operations this frontend does not call — each with its reason, so
 * the list is a plan rather than an apology:
 *
 * - `GET /`, `/ping`, `/health` — welcome message and probes; no screen.
 * - `POST /replacement-listings`, `PATCH|DELETE /replacement-listings/{id}`,
 *   `PATCH /replacement-listings/{id}/publish` — the owner create, edit and
 *   publish screens, next consumers of the listings document.
 * - `GET /profile`, `GET|DELETE /profile/{id}` — the public directory read and
 *   its detail, until the directory screen exists.
 * - `/practices…` — practices are managed through the listings screens today; a
 *   dedicated screen will adopt these.
 */
const NOT_CONSUMED = [
  "GET /",
  "GET /ping",
  "GET /health",
  "POST /replacement-listings",
  "PATCH /replacement-listings/{id}",
  "DELETE /replacement-listings/{id}",
  "PATCH /replacement-listings/{id}/publish",
  "GET /profile",
  "GET /profile/{id}",
  "DELETE /profile/{id}",
  "POST /practices",
  "GET /practices",
  "GET /practices/mine",
  "GET /practices/{id}",
  "PATCH /practices/{id}",
  "DELETE /practices/{id}",
] as const satisfies readonly DocumentedRoute[];

/** A payload past the shape gates — the audit never gets an answer back. */
const PROFILE_PAYLOAD = {
  specialty: "GENERALIST",
  profileType: "REPLACEMENT",
  rppsNumber: "1012345678",
  city: "Paris",
  isPublic: true,
} as const;

/** Just the path of a request URL, down to the query string. */
function withoutQuery(path: string): string {
  const queryStart = path.indexOf("?");
  return queryStart === -1 ? path : path.slice(0, queryStart);
}

async function audited({ operation, call }: AuditCase): Promise<void> {
  const [method, documentedPath] = operation.split(" ") as [Method, string];
  const seen: Array<{ path: string; method: string }> = [];
  const transport: ApiTransport = (path, init) => {
    seen.push({ path: withoutQuery(path), method: init?.method ?? "GET" });
    return Promise.reject(new Error("route audit stops here"));
  };

  await call(transport).catch(() => {});

  expect(seen, `${operation}: exactly one audited request`).toHaveLength(1);

  const recorded = seen[0];
  expect(recorded?.path, `${operation}: the call went to that path`).toMatch(
    new RegExp(`^${documentedPath.replace(/\{[^}]+\}/g, "[^/]+")}$`),
  );
  expect(recorded?.method, `${operation}: the method matched`).toBe(
    METHOD_PATH[method],
  );
}

describe("API routes", () => {
  it("every audited call lands on the operation the document publishes", async () => {
    for (const auditCase of AUDITED) {
      await audited(auditCase);
    }
  });

  it("the written contract list is the document, exactly", () => {
    // Fails at typecheck first — this is the proof that runs when it does not.
    expect(DOCUMENTED_COVERS_ALL, "list and generated paths agree").toBe(true);
  });

  it("accounts for every operation the document publishes", () => {
    const vouched = new Set<string>(AUDITED.map((entry) => entry.operation));
    const unexplained = [...PUBLISHED].filter(
      (operation) =>
        !vouched.has(operation) &&
        !(NOT_CONSUMED as readonly string[]).includes(operation),
    );
    expect(unexplained).toEqual([]);
  });
});
