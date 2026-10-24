"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ListingsTableHandle } from "@/components/organisms/listings-table";

/**
 * Scrolls a listing row into view once it is rendered, without the container
 * reaching into the table's DOM.
 *
 * Extracted from `listings-container.tsx`, where `pickListing` and
 * `selectListing` both needed to turn a listing id into a scroll once the page
 * turn that holds it had landed. The hook owns the pending id and retries the
 * scroll on each render until the row is on screen, then clears itself.
 */
export function useScrollToRow(
  tableRef: RefObject<ListingsTableHandle | null>,
  /** The ids of the rows currently rendered on screen. */
  onScreenIds: Set<string>,
) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** Asks the table to scroll to `id` as soon as it is on screen. */
  const scrollTo = useCallback((id: string) => {
    setPendingId(id);
  }, []);

  useEffect(() => {
    if (!pendingId) return;
    // Not on this page yet — the page turn is still in flight, retry next render.
    if (!onScreenIds.has(pendingId)) return;
    if (tableRef.current?.scrollToId(pendingId)) {
      setPendingId(null);
    }
  }, [pendingId, onScreenIds, tableRef]);

  return { scrollTo, clear: () => setPendingId(null) };
}
