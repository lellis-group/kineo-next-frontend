/**
 * Server-computed counters, and the zeroed stand-in for a response that has none.
 *
 * Every list screen shows per-status totals that must describe the whole
 * collection, not the page that came back. When the backend sends no breakdown
 * — a 404 for a brand-new member, an older deploy, a shape it does not know —
 * the counters are zeroed rather than guessed, because a chip that claims a
 * candidate exists in a status nobody confirmed is worse than a chip that shows
 * nothing.
 */
import {
  APPLICATION_REJECTION_BUCKETS,
  APPLICATION_STATUSES,
  type ApplicationRejectionBucket,
  type ApplicationStatus,
  REPLACEMENT_LISTING_STATUSES,
  type ReplacementListingStatus,
  type StatusCounts,
} from "./types/api";

export type { StatusCounts };

/**
 * A zeroed breakdown, built from the canonical key list.
 *
 * `total` is passed separately rather than summed, because the whole point of
 * these records is to say "nothing is confirmed" — a total derived from the
 * (empty) parts would quietly mean "nothing exists" instead.
 */
export function zeroCounts<S extends string>(
  total: number,
  keys: readonly S[],
): StatusCounts<S> {
  const counts = { total } as StatusCounts<S>;
  for (const key of keys) {
    counts[key] = 0;
  }
  return counts;
}

/**
 * Completes a partial breakdown from the wire.
 *
 * `counts` is partial on purpose: a status this frontend knows about but the
 * backend does not is simply absent from the response, and spreading the raw
 * object over the zeros would leave that key undefined rather than 0.
 */
export function withZeroCounts<S extends string>(
  counts: Partial<StatusCounts<S>> | undefined,
  keys: readonly S[],
): StatusCounts<S> {
  return { ...zeroCounts(0, keys), ...counts };
}

/**
 * A zeroed per-situation breakdown, for the rejected applications.
 *
 * Kept as its own name rather than a `StatusCounts` because there is no `total`
 * here: three situations do not add up to a number of anything, and the rejected
 * total is a fourth, larger figure — a settled rejection belongs to it and to none
 * of the three.
 */
export function zeroBucketCounts(): Record<ApplicationRejectionBucket, number> {
  return {
    PASSED_OVER: 0,
    POSTING_ENDED: 0,
    REFUSED: 0,
  };
}

/** The canonical key list for each breakdown the API serves. */
export const COUNT_KEYS = {
  applicationStatus: APPLICATION_STATUSES,
  listingStatus: REPLACEMENT_LISTING_STATUSES,
  rejectionBucket: APPLICATION_REJECTION_BUCKETS,
} as const satisfies {
  applicationStatus: readonly ApplicationStatus[];
  listingStatus: readonly ReplacementListingStatus[];
  rejectionBucket: readonly ApplicationRejectionBucket[];
};
