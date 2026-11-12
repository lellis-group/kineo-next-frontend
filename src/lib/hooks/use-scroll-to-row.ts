"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ListingsTableHandle } from "@/lib/listings";

/**
 * Scrolls a listing row into view once it is rendered: holds the pending id
 * and retries on each render until the row is on screen.
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

  /** Drops a pending scroll — the view it belonged to is gone. */
  const clear = useCallback(() => {
    setPendingId(null);
  }, []);

  useEffect(() => {
    if (!pendingId) return;
    // Not on this page yet — the page turn is still in flight, retry next render.
    if (!onScreenIds.has(pendingId)) return;
    if (tableRef.current?.scrollToId(pendingId)) {
      setPendingId(null);
    }
  }, [pendingId, onScreenIds, tableRef]);

  return { scrollTo, clear };
}
