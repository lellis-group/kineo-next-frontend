/**
 * Fetches the user's own applications. The backend embeds each listing and its
 * practice, so a page loads in a single request (including listings otherwise
 * hidden by visibility rules). A soft 404 (empty list) is expected, not an
 * error.
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
  ApiApplicationStatusCounts,
  ApplicationRejectionBucket,
} from "../types/api";
import { adaptApplicationEntry, byNewestFirst } from "./adapters";
import type { ApplicationEntry, ApplicationsData } from "./contracts";

/**
 * Rows per page on the applications screen.
 *
 * Lives here rather than in the container because the server page needs it to
 * fetch the first slice: if the two disagreed, the page would send a limit the
 * container did not expect and the first client-driven page change would skip a
 * row.
 */
export const APPLICATIONS_PAGE_SIZE = 5;

/** Pagination parameters for fetching applications. */
export interface PaginationParams {
  page: number;
  limit: number;
  /**
   * Backend status filter, comma-separated when a bucket spans several.
   *
   * The buckets are not the backend statuses — « Un autre candidat retenu » is
   * a `REJECTED` narrowed to one decision source — so this stays a string
   * rather than the enum. What protects it is the backend, which 400s on a
   * value outside the enum instead of ignoring it.
   */
  status?: string;
  /**
   * Which situation, among the rejected applications. Sent only alongside
   * `status: "REJECTED"`, which is the chip row it belongs to.
   *
   * Distinct from `decisionSource`, which nothing sends any more: a situation is
   * read by the backend off fields it already stores, and it is named by the
   * backend rather than guessed here.
   */
  bucket?: ApplicationRejectionBucket;
}

function statusCounts(total: number): ApiApplicationStatusCounts {
  return zeroCounts(total, COUNT_KEYS.applicationStatus);
}

async function fetchMyApplications(
  params: PaginationParams,
  transport?: ApiTransport,
): Promise<{
  applications: ApiApplication[];
  meta: ApiApplicationPage<ApiApplication>["meta"];
}> {
  // The filtering stays server-side, so the counters keep describing the whole
  // collection rather than the page that came back. "ALL" is the no-filter case,
  // and sending it would narrow to rows that do not exist.
  //
  // `decisionSource` is gone rather than left dormant: the backend's query schema
  // is strict and rejects it, so the one chip that used to send it was relying on a
  // parameter that no longer worked. The situations it selected are `bucket` now,
  // which the backend computes off fields it already stores.
  const narrowed = params.status !== "ALL";
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    status: narrowed ? params.status : undefined,
    // Sent whenever the caller sets it: it only ever accompanies `REJECTED`, so
    // there is nothing to guard against here, and dropping it would silently
    // widen the query — the chips would then show a situation filter that changes
    // no rows, which reads as a broken screen rather than a missing parameter.
    bucket: params.bucket,
  });

  const raw = await apiFetch<unknown>(
    `/applications/mine?${query}`,
    undefined,
    transport,
  ).catch(notFoundAs<unknown>(null));

  const shape = unwrapCollection<ApiApplication>(raw);

  if (shape.kind === "envelope") {
    return { applications: shape.rows, meta: shape.meta };
  }

  if (shape.kind === "array") {
    // Legacy shape: a bare array is the whole collection, with no totals of its
    // own. The counts are summed here so the chips stay stable — the counters
    // must describe the collection either way, and this response carries
    // everything in it, so nothing is being guessed.
    const counts = statusCounts(shape.rows.length);
    for (const application of shape.rows) {
      counts[application.status] += 1;
    }
    // A bare array carries no meta of its own. The situations can still be counted
    // here without any classification — every row already names its own bucket, so
    // this only adds up what the backend decided, unlike the status counts above
    // which have to be read off `status`.
    const bucketCounts = zeroBucketCounts();
    for (const application of shape.rows) {
      if (application.rejectionBucket) {
        bucketCounts[application.rejectionBucket] += 1;
      }
    }
    return {
      applications: shape.rows,
      meta: {
        total: shape.rows.length,
        page: 1,
        limit: shape.rows.length || 1,
        totalPages: 1,
        counts,
        bucketCounts,
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
    `/applications/${id}`,
    undefined,
    transport,
  );
  return adaptApplicationEntry(application);
}

export async function fetchApplicationsData(
  params: PaginationParams = { page: 1, limit: APPLICATIONS_PAGE_SIZE },
  transport?: ApiTransport,
): Promise<ApplicationsData> {
  const { applications, meta } = await fetchMyApplications(params, transport);

  // Newest submissions first — matches the backend orderBy, kept as a guard
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
    // Server-computed totals — never derived from the loaded page. Completed
    // from a partial breakdown so a missing status reads 0, not undefined.
    counts: withZeroCounts(
      { total: meta.total, ...meta.counts },
      COUNT_KEYS.applicationStatus,
    ),
    // Zeroed when absent, for the same reason as the status totals: a chip claiming
    // a situation exists when the backend confirmed nothing is worse than one that
    // shows nothing.
    bucketCounts: withZeroCounts(
      meta.bucketCounts,
      COUNT_KEYS.rejectionBucket,
    ) as ApplicationsData["bucketCounts"],
  };
}

/**
 * Whether a mutation answered by echoing the row back.
 *
 * Two of the write endpoints here answer with the updated application and two
 * answer `204` — both are legitimate, and the caller refetches when there is
 * nothing to adapt. The check is on the *shape* of the body rather than on the
 * status code, because a `200` with a body the backend has since changed should
 * be treated as "no echo" and refetched rather than adapted into a broken
 * entry.
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
): Promise<ApplicationEntry | null> {
  const trimmed = withdrawnReason?.trim();
  const raw = await apiFetch<unknown>(`/applications/${id}/withdraw`, {
    method: "PATCH",
    body: JSON.stringify(trimmed ? { withdrawnReason: trimmed } : {}),
  });

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
): Promise<ApplicationEntry | null> {
  const raw = await apiFetch<unknown>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ message: message.trim() }),
  });

  return echoedApplicationEntry(raw);
}
