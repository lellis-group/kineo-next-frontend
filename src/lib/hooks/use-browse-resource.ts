"use client";

import { useCallback, useMemo, useRef } from "react";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import {
  type BrowseListingsData,
  type BrowseView,
  fetchBrowseListings,
  isDefaultBrowseView,
  type ListingsTableHandle,
} from "@/lib/listings";
import { usePaginatedResource } from "./use-paginated-resource";
import { useScrollToRow } from "./use-scroll-to-row";

/**
 * The browse screen's rows and the handles between its halves. Seeded from
 * the server on every navigation (`seedFromServer`); the loader only satisfies
 * the hook's contract.
 */
export function useBrowseResource(
  initialData: BrowseListingsData,
  view: BrowseView,
) {
  const load = useCallback(
    (target: BrowseView, init?: RequestInit) =>
      fetchBrowseListings(target, undefined, init),
    [],
  );

  const { data, loading } = usePaginatedResource({
    initialData,
    view,
    isDefaultView: isDefaultBrowseView,
    load,
    seedFromServer: true,
  });

  const tableRef = useRef<ListingsTableHandle>(null);

  const mapRef = useRef<ListingsMapHandle>(null);

  // Keyed on ids: a pending scroll waits for its row to be in the DOM.
  const onScreenIds = useMemo(
    () => new Set(data.listings.map((listing) => listing.id)),
    [data.listings],
  );

  const { scrollTo, clear: clearScroll } = useScrollToRow(
    tableRef,
    onScreenIds,
  );

  return {
    data,
    loading,
    tableRef,
    mapRef,
    onScreenIds,
    scrollTo,
    clearScroll,
  };
}
