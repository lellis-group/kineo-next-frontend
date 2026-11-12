/**
 * The applications data service — fetching the user's own applications,
 * reading one, editing or withdrawing one, and applying to a listing.
 *
 * The backend embeds the listing of each row so a page loads in a single
 * request (including listings otherwise hidden by visibility rules). A soft 404
 * on the list (empty collection) is expected, not an error.
 */

import {
  type ApiTransport,
  apiFetch,
  buildQuery,
  notFoundAs,
  unwrapCollection,
} from "../api-client";
import {
  COUNT_KEYS,
  withZeroCounts,
  zeroBucketCounts,
  zeroCounts,
} from "../counts";
import type {
  ApiApplication,
  ApiApplicationPage,
  ApiApplicationRow,
  ApiApplicationStatusCounts,
  ApplicationRejectionBucket,
} from "../types/api";
import {
  AWAITING_DECISION_STATUSES,
  adaptApplicationEntry,
  byNewestFirst,
} from "./adapters";
import type { ApplicationEntry, ApplicationsData } from "./contracts";

/**
 * Rows per page on the applications screen. Shared by the server page and the
 * container, which must agree on the limit.
 */
export const APPLICATIONS_PAGE_SIZE = 5;

export interface PaginationParams {
  page: number;
  limit: number;
  /**
   * Backend status filter, comma-separated when a bucket spans several. A
   * string rather than the enum; the backend 400s on an unknown value.
   */
  status?: string;
  /** Situation among the rejected applications; only with `status: "REJECTED"`. */
  bucket?: ApplicationRejectionBucket;
}

function statusCounts(total: number): ApiApplicationStatusCounts {
  return zeroCounts(total, COUNT_KEYS.applicationStatus);
}

async function fetchMyApplications(
  params: PaginationParams,
  transport?: ApiTransport,
): Promise<{
  applications: ApiApplicationRow[];
  meta: ApiApplicationPage<ApiApplicationRow>["meta"];
}> {
  // "ALL" is the no-filter case. No `decisionSource`: the backend's strict
  // query schema rejects it.
  const narrowed = params.status !== "ALL";
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    status: narrowed ? params.status : undefined,
    bucket: params.bucket,
  });

  const raw = await apiFetch<unknown>(
    `/applications/mine?${query}`,
    undefined,
    transport,
  ).catch(notFoundAs<unknown>(null));

  const shape = unwrapCollection<
    ApiApplicationRow,
    ApiApplicationPage<ApiApplicationRow>["meta"]
  >(raw);

  if (shape.kind === "envelope") {
    return { applications: shape.rows, meta: shape.meta };
  }

  if (shape.kind === "array") {
    // Legacy shape: a bare array is the whole collection, so every counter
    // can be computed from it.
    const counts = statusCounts(shape.rows.length);
    for (const application of shape.rows) {
      counts[application.status] += 1;
    }
    const bucketCounts = zeroBucketCounts();
    for (const application of shape.rows) {
      if (application.rejectionBucket) {
        bucketCounts[application.rejectionBucket] += 1;
      }
    }
    const open = shape.rows.filter(
      (application) =>
        AWAITING_DECISION_STATUSES.has(application.status) &&
        !application.viewedAt,
    ).length;
    const responded = shape.rows.filter(
      (application) =>
        application.status !== "WITHDRAWN" && application.respondedAt,
    ).length;
    return {
      applications: shape.rows,
      meta: {
        total: shape.rows.length,
        page: 1,
        limit: shape.rows.length || 1,
        totalPages: 1,
        counts,
        bucketCounts,
        unseenOpenCount: open,
        respondedCount: responded,
      },
    };
  }

  return {
    applications: [],
    meta: {
      total: 0,
      page: params.page,
      limit: params.limit,
      totalPages: 0,
      counts: statusCounts(0),
      bucketCounts: zeroBucketCounts(),
      unseenOpenCount: 0,
      respondedCount: 0,
    },
  };
}

/**
 * GET /applications/{id} — one application with its listing and practice
 * embedded by the backend: a single request (a 404 here is a real error,
 * unknown or foreign id, and propagates to the caller).
 */
export async function fetchApplicationDetail(
  id: string,
  transport?: ApiTransport,
): Promise<ApplicationEntry> {
  const application = await apiFetch<ApiApplication>(
    `/applications/${encodeURIComponent(id)}`,
    undefined,
    transport,
  );
  return adaptApplicationEntry(application);
}

/**
 * POST /applications — applies to one listing with an optional message.
 * Eligibility is decided by the backend; `applyErrorMessage` maps its refusals.
 */
export async function applyToListing(
  listingId: string,
  message: string | undefined,
  transport?: ApiTransport,
): Promise<ApplicationEntry> {
  const trimmed = message?.trim();
  const raw = await apiFetch<ApiApplication>(
    "/applications",
    {
      method: "POST",
      body: JSON.stringify({
        listingId,
        ...(trimmed ? { message: trimmed } : {}),
      }),
    },
    transport,
  );
  return adaptApplicationEntry(raw);
}

export async function fetchApplicationsData(
  params: PaginationParams = { page: 1, limit: APPLICATIONS_PAGE_SIZE },
  transport?: ApiTransport,
): Promise<ApplicationsData> {
  const { applications, meta } = await fetchMyApplications(params, transport);
  // Matches the backend orderBy, kept as a guard.
  const entries: ApplicationEntry[] = applications
    .slice()
    .sort(byNewestFirst)
    .map(adaptApplicationEntry);

  return {
    total: meta.total,
    applications: entries,
    pagination: {
      page: meta.page,
      limit: meta.limit,
      totalPages: meta.totalPages,
    },
    // Completed from a partial breakdown so a missing status reads 0.
    counts: withZeroCounts(meta.counts, COUNT_KEYS.applicationStatus),
    bucketCounts: withZeroCounts(
      meta.bucketCounts,
      COUNT_KEYS.rejectionBucket,
    ) as ApplicationsData["bucketCounts"],
    // Absent from a backend one release behind.
    unseenOpenCount: meta.unseenOpenCount ?? 0,
    respondedCount: meta.respondedCount ?? 0,
  };
}

/**
 * Some write endpoints echo the updated row, others answer 204. Checked on the
 * body's shape: anything else is treated as "no echo" and the caller refetches.
 */
function echoedApplicationEntry(raw: unknown): ApplicationEntry | null {
  if (raw && typeof raw === "object" && "id" in raw && "status" in raw) {
    return adaptApplicationEntry(raw as ApiApplication);
  }
  return null;
}

/**
 * PATCH /applications/{id}/withdraw — optional reason (trimmed, 1-500 chars).
 * Backend 400s when the status forbids withdrawal. Returns the updated entry
 * when echoed, else null (caller refetches).
 */
export async function withdrawApplication(
  id: string,
  withdrawnReason?: string,
  transport?: ApiTransport,
): Promise<ApplicationEntry | null> {
  const trimmed = withdrawnReason?.trim();
  const raw = await apiFetch<unknown>(
    `/applications/${encodeURIComponent(id)}/withdraw`,
    {
      method: "PATCH",
      body: JSON.stringify(trimmed ? { withdrawnReason: trimmed } : {}),
    },
    transport,
  );

  return echoedApplicationEntry(raw);
}

/**
 * PATCH /applications/{id} — edits the message of a pending application
 * (required, 1-2000 chars; backend 400s once the status moves). Returns the
 * updated entry when echoed, else null (caller refetches).
 */
export async function updateApplicationMessage(
  id: string,
  message: string,
  transport?: ApiTransport,
): Promise<ApplicationEntry | null> {
  const raw = await apiFetch<unknown>(
    `/applications/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ message: message.trim() }),
    },
    transport,
  );

  return echoedApplicationEntry(raw);
}
