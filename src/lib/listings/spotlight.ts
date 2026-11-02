/**
 * The transient mark a posting picked on the map leaves on its row.
 *
 * Deliberately not the selection itself: `selectedListing` is a choice that
 * lasts until it is dismissed, while this is a one-shot signal that says *what
 * just changed*. Keeping them apart is what lets the row settle into its
 * persistent selected style after the glow, without the glow replaying on every
 * later render.
 */
export interface ListingSpotlight {
  /** The posting the reader picked. */
  id: string;
  /**
   * Bumped on every pick, including a second pick of the same posting.
   *
   * The class is chosen from its parity: switching between the two sheen
   * keyframes restarts the animation without remounting the row.
   */
  nonce: number;
  /**
   * The page the reader was on when the pick was made.
   *
   * Compared with the page now on screen: a difference means the pick turned
   * the list, which is the only case where the pager is worth flashing too.
   */
  fromPage: number;
}

/**
 * The classes a spotlighted row or card carries, or `undefined` for every other
 * posting.
 *
 * `row-spotlight` lights the outline and the background; the `-a` / `-b`
 * modifier only selects which of the two identical sheen keyframes runs, so a
 * repeat pick restarts the sweep instead of leaving it finished.
 */
export function spotlightClass(
  spotlight: ListingSpotlight | null | undefined,
  listingId: string,
): string | undefined {
  if (!spotlight || spotlight.id !== listingId) return undefined;

  return spotlight.nonce % 2 === 0
    ? "row-spotlight row-spotlight-a"
    : "row-spotlight row-spotlight-b";
}
