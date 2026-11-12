/**
 * The one-shot mark a map pick leaves on its row — distinct from the lasting
 * selection, so the glow doesn't replay on later renders.
 */
export interface ListingSpotlight {
  id: string;
  /** Bumped on every pick; its parity picks the sheen keyframes, restarting them. */
  nonce: number;
  /** The page when the pick was made: a difference means the pager flashes too. */
  fromPage: number;
}

/** The classes a spotlighted row or card carries, or `undefined` for every other one. */
export function spotlightClass(
  spotlight: ListingSpotlight | null | undefined,
  listingId: string,
): string | undefined {
  if (!spotlight || spotlight.id !== listingId) return undefined;

  return spotlight.nonce % 2 === 0
    ? "row-spotlight row-spotlight-a"
    : "row-spotlight row-spotlight-b";
}
