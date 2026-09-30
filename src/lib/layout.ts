/**
 * Layout constants shared across screens.
 *
 * The member console's page shell was written out seven times by hand, which is
 * how the marketing pages ended up with a different max-width at the same
 * breakpoint. Anything repeated verbatim belongs here rather than in a
 * component, so there is one place to change it.
 */

/** Member console page shell — listings, applications, profile. */
export const PAGE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10";

/** Marketing page shell — landing sections, legal pages. */
export const MARKETING_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20";

/** Prose shell for the legal pages: narrower, for reading. */
export const PROSE_CONTAINER =
  "mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14";
