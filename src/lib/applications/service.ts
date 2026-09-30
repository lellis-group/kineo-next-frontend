/**
 * Fetches the user's own applications. The backend embeds each listing and its
 * practice, so a page loads in a single request (including listings otherwise
 * hidden by visibility rules). A soft 404 (empty list) is expected, not an
 * error.
 */

import { type ApiTransport, apiFetch, notFoundAs } from "../api-client";
import type {
  ApiApplication,
  ApiApplicationPage,
  ApiApplicationStatusCounts,
  ApplicationStatus,
} from "../types/api";
import { adaptApplicationEntry } from "./adapters";
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
   * A backend application status, or the literal "ALL" the filter chips use for
   * "no status filter". Typed as a union rather than `string` so a typo is a
   * compile error instead of a request the backend silently ignores.
   */
  status?: ApplicationStatus | "ALL";
}

function statusCounts(total: number): ApiApplicationStatusCounts {
  return {
    total,
    PENDING: 0,
    SHORTLISTED: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
}

async function fetchMyApplications(
  params: PaginationParams,
  transport?: ApiTransport,
): Promise<{
  applications: ApiApplication[];
  meta: ApiApplicationPage<ApiApplication>["meta"];
}> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.status && params.status !== "ALL") {
    searchParams.set("status", params.status);
  }

  const raw = await apiFetch<
    ApiApplicationPage<ApiApplication> | ApiApplication[]
  >(`/applications/mine?${searchParams}`, undefined, transport).catch(
    notFoundAs([]),
  );

  // Legacy shape: a bare array is the whole collection — counts stay stable.
  if (Array.isArray(raw)) {
    const counts = statusCounts(raw.length);
    for (const application of raw) {
      counts[application.status] += 1;
    }
    return {
      applications: raw,
      meta: {
        total: raw.length,
        page: 1,
        limit: raw.length || 1,
        totalPages: 1,
        counts,
      },
    };
  }

  if (raw && typeof raw === "object" && "data" in raw && "meta" in raw) {
    return {
      applications: raw.data,
      meta: raw.meta,
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
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
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
    counts: { ...statusCounts(meta.total), ...meta.counts },
  };
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

  if (raw && typeof raw === "object" && "id" in raw && "status" in raw) {
    return adaptApplicationEntry(raw as ApiApplication);
  }
  return null;
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

  if (raw && typeof raw === "object" && "id" in raw && "status" in raw) {
    return adaptApplicationEntry(raw as ApiApplication);
  }
  return null;
}
