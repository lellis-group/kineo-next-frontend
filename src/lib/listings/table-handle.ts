/**
 * What the results table lets the screen do to its rows.
 *
 * The container scrolls a picked posting into view, but a row is the table's
 * own markup, not the container's business. It used to be reached with a
 * `document.querySelector("tbody tr[data-listing-id=…]")` living in the
 * container, which meant the container knew the shape of a section it only
 * arranges — and would break the day the table's structure changed. The lookup
 * lives beside the markup it reads, and the screen just asks.
 *
 * Declared here rather than in the table component because the modules that
 * *ask* — the scroll hook and the browse picking hook — must not import a
 * component just to name a type. A type-only import is erased at build time,
 * but it still points the dependency arrow from `lib/` back into `components/`,
 * which is the direction this refactor is undoing.
 */
export interface ListingsTableHandle {
  /**
   * Centers the row for `id`, when it is rendered. Returns whether the row was
   * found, so the caller can tell "scrolled" from "not on this page" without
   * reaching into the DOM itself.
   */
  scrollToId: (id: string) => boolean;
}
