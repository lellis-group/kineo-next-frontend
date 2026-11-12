/**
 * Server-computed counters, and the zeroed stand-in when a response has none:
 * zeros rather than guesses.
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

/** A zeroed breakdown. `total` is passed separately rather than summed. */
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

/** Completes a partial breakdown: an absent key reads 0, not undefined. */
export function withZeroCounts<S extends string>(
  counts: Partial<StatusCounts<S>> | undefined,
  keys: readonly S[],
): StatusCounts<S> {
  return { ...zeroCounts(0, keys), ...counts };
}

/**
 * A zeroed per-situation breakdown. No `total`: the rejected total is a
 * separate, larger figure.
 */
export function zeroBucketCounts(): Record<ApplicationRejectionBucket, number> {
  return {
    PASSED_OVER: 0,
    POSTING_ENDED: 0,
    REFUSED: 0,
  };
}

export const COUNT_KEYS = {
  applicationStatus: APPLICATION_STATUSES,
  listingStatus: REPLACEMENT_LISTING_STATUSES,
  rejectionBucket: APPLICATION_REJECTION_BUCKETS,
} as const satisfies {
  applicationStatus: readonly ApplicationStatus[];
  listingStatus: readonly ReplacementListingStatus[];
  rejectionBucket: readonly ApplicationRejectionBucket[];
};
