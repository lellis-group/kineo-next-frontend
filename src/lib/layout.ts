/** Member console page shell — listings, applications, profile. */
export const PAGE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10";

/** Marketing page shell — landing sections, legal pages. */
export const MARKETING_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20";

/** Prose shell for the legal pages: narrower, for reading. */
export const PROSE_CONTAINER =
  "mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14";

export const STRIP_CONTAINER =
  "mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6";

/** Back link to the parent screen — the top of every detail page. */
export const BACK_LINK =
  "inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground";

/**
 * Page title, sized to the same rhythm on every console screen. */
export const PAGE_TITLE = "text-2xl font-bold tracking-tight sm:text-3xl";

/**
 * The horizontal geometry every full-width band on a `(site)` page shares —
 * the header, the working content, and the footer.
 *
 * One `max-width` and one horizontal padding, so those three bands line up on
 * the same left and right edges instead of each picking its own width. They
 * used to drift apart on wide screens: the header ran to `max-w-360`, the
 * console content to `max-w-[100rem]` and the footer only to `max-w-7xl`, so
 * past ~1700px the content overhung the footer and the header overhung the
 * content. This is the header's geometry, kept as the shared value because it
 * is already the widest — and a working screen wants every pixel of width.
 *
 * `max-w-360` resolves against the theme's spacing unit (0.3rem), so it is
 * 108rem. Drawn from the same unit as the padding so the pair scales together.
 */
export const SITE_SHELL = "mx-auto w-full max-w-360 px-4 sm:px-8 lg:px-10";

/** One line under a page title, or under a section heading inside a page. */
export const PAGE_SUBTITLE = "mt-1.5 text-sm leading-relaxed text-muted";

/**
 * A recessed box for a message that belongs to the flow rather than to the
 * chrome: an empty state, a note under a form, a hint inside a card.
 */
export const SOFT_PANEL = "rounded-xl border border-border bg-background/40";

/** Centred text inside a `SOFT_PANEL`. */
export const SOFT_PANEL_BODY = "px-4 py-6 text-center text-sm text-muted";
