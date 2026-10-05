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
  APPLICATION_STATUSES,
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

/** The canonical key list for each breakdown the API serves. */
export const COUNT_KEYS = {
  applicationStatus: APPLICATION_STATUSES,
  listingStatus: REPLACEMENT_LISTING_STATUSES,
} as const satisfies {
  applicationStatus: readonly ApplicationStatus[];
  listingStatus: readonly ReplacementListingStatus[];
};
