/**
 * What the results table lets the screen do to its rows. Declared in `lib` so
 * the hooks that use it don't import from `components`.
 */
export interface ListingsTableHandle {
  /** Centres the row for `id`; returns whether it was found. */
  scrollToId: (id: string) => boolean;
}
