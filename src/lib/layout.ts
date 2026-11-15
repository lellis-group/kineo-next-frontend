/** Member console page shell — listings, applications, profile. */
export const PAGE_CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10";

/**
 * A landing section: the site's own geometry (`SITE_SHELL`, declared below),
 * so the sections line up with the header and the footer.
 */
export const MARKETING_SECTION = "py-16 sm:py-24";

/** Prose shell for the legal pages: narrower, for reading. */
export const PROSE_CONTAINER =
  "mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14";

export const STRIP_CONTAINER =
  "mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6";

/** Back link to the parent screen — the top of every detail page. */
export const BACK_LINK =
  "inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground";

export const PAGE_TITLE = "text-2xl font-medium tracking-tight sm:text-3xl";

/**
 * The horizontal geometry shared by the header, the content and the footer, so
 * the three bands line up. `max-w-360` is 108rem on the 0.3rem spacing unit.
 */
export const SITE_SHELL = "mx-auto w-full max-w-360 px-4 sm:px-8 lg:px-10";

/** Header height, mobile: same band the skeleton reserves so nothing moves on hydration. */
export const HEADER_HEIGHT = "h-[calc(3.75rem+env(safe-area-inset-top))]";

/** Header height, small and up. */
export const HEADER_HEIGHT_SM = "sm:h-[calc(4rem+env(safe-area-inset-top))]";

/** The sticky header band; shared by the header and its skeleton. */
export const HEADER_BAR = "sticky top-0 z-40 bg-background/95 backdrop-blur";

/** The header's row inside the band, at the site's own geometry. */
export const HEADER_ROW = `flex ${HEADER_HEIGHT} items-center justify-between gap-2 pt-[env(safe-area-inset-top)] ${HEADER_HEIGHT_SM} sm:gap-6`;

/**
 * A console board that fills the viewport from `lg`: the page doesn't scroll,
 * its panels do. Shared by the browse feed and the practice board.
 */
export const BOARD_SHELL = `${SITE_SHELL} flex flex-col gap-4 py-4 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-3 lg:py-3`;

/** The board's two columns: a summary rail, then the content beside it. */
export const BOARD_GRID =
  "grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:gap-3";

/** The rail column: below the content on a phone, scrolling on its own from `lg`. */
export const BOARD_RAIL =
  "scrollbar-quiet order-2 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1";

/** The content column of a board. */
export const BOARD_MAIN =
  "order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:min-h-0 lg:flex-1";

/**
 * A control floating on the map. Opaque, no `backdrop-blur`: a blur over the
 * WebGL canvas is recomputed every frame and makes panning stutter.
 */
export const MAP_PILL =
  "xl:border-0 xl:bg-white xl:text-map-ink xl:shadow-[0_2px_10px_rgb(22_21_15/0.18)] xl:hover:bg-white xl:hover:text-map-ink";

/** A centred page narrower than the console, for a form or a detail. */
export const NARROW_PAGE =
  "mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10";

/** The same, wider, for a detail that carries a side panel. */
export const WIDE_PAGE = "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10";

/** One line under a page title, or under a section heading inside a page. */
export const PAGE_SUBTITLE = "mt-1.5 text-sm leading-relaxed text-muted";

/**
 * A recessed box for a message that belongs to the flow rather than to the
 * chrome: an empty state, a note under a form, a hint inside a card.
 */
export const SOFT_PANEL = "rounded-control border border-border bg-surface-2";

/** Centred text inside a `SOFT_PANEL`. */
export const SOFT_PANEL_BODY = "px-4 py-6 text-center text-sm text-muted";
