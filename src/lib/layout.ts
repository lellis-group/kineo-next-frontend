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

/** Page title, sized to the same rhythm on every console screen. */
export const PAGE_TITLE = "text-2xl font-bold tracking-tight sm:text-3xl";

/** One line under a page title, or under a section heading inside a page. */
export const PAGE_SUBTITLE = "mt-1.5 text-sm leading-relaxed text-muted";

/**
 * A recessed box for a message that belongs to the flow rather than to the
 * chrome: an empty state, a note under a form, a hint inside a card.
 */
export const SOFT_PANEL = "rounded-xl border border-border bg-background/40";

/** Centred text inside a `SOFT_PANEL`. */
export const SOFT_PANEL_BODY = "px-4 py-6 text-center text-sm text-muted";
