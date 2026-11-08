/**
 * Route audit — does this frontend call the routes the backend publishes?
 *
 * Every service function is invoked with a transport that records the request
 * and rejects it; each recorded call is held against the generated document
 * (`openapi.json`): the method-path pair must be published there, and the call
 * must have gone exactly there. A backend rename, a typo in a template literal
 * or a route that drifted shows up as a failing test instead of a 404 in a
 * browser, after login.
 *
 * The audit goes both ways. A route the document gains must be either audited
 * on a call the frontend makes or named with a reason on `NOT_CONSUMED_ROUTES`
 * — an endpoint with no consumer is usually a screen half-built, and an
 * unexplained route would hide it. The better-auth session routes
 * (`/api/auth/*`) are not the backend's document and stay out, as do the probes
 * a screen has no reason to call.
 *
 * Methods and paths are in scope; bodies and query parameters are the
 * call-site contract the service specs test beside each adapter.
 */
import { describe, expect, it } from "bun:test";
import spec from "../../openapi.json";
import { confirmAccountDeletion } from "./account-deletion-service";
import type { ApiTransport } from "./api-client";
import {
  APPLICATIONS_PAGE_SIZE,
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
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  fetchMyListings,
} from "./listings/service";
import {
  createProfile,
  fetchMyProfile,
  updateProfile,
} from "./profile-service";

/** Every operation the document publishes, as `METHOD /path`. */
const PUBLISHED = new Set(
  Object.entries(spec.paths).flatMap(([path, operations]) =>
    Object.keys(operations).map((verb) => `${verb.toUpperCase()} ${path}`),
  ),
);

/** Verbatim records of the call each audit case must produce. */
const METHOD_PATH = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

type Method = keyof typeof METHOD_PATH;

interface AuditCase {
  /** The documented operation, written the way the document writes it. */
  operation: `${Method} ${string}`;
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
 * - `POST /applications` and the decision actions `PATCH /applications/{id}/view|
 *   shortlist|accept|reject` — the candidate apply flow and the practice
 *   decision screens are built against the live backend first (PLAN files at
 *   the repository root).
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
  "POST /applications",
  "PATCH /applications/{id}/view",
  "PATCH /applications/{id}/shortlist",
  "PATCH /applications/{id}/accept",
  "PATCH /applications/{id}/reject",
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
] as const;

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
  expect(PUBLISHED.has(operation), `${operation}: published`).toBe(true);

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
