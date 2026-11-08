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
 * The rows the browse screen renders, and the two handles that move between
 * its halves.
 *
 * The server answers every view by re-rendering: the page reads the same query
 * string and seeds this hook with the result. `seedFromServer` tells the shared
 * pagination hook to adopt each fresh `initialData` rather than refetch, so
 * there is no client fetch on this screen at all. The loader exists only to
 * satisfy the hook's contract.
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

  /**
   * A handle onto the results table, so a picked posting can be scrolled to.
   *
   * The screen asks the table to scroll rather than querying the document
   * itself: a row is the table's markup, and only the table should know how to
   * find one.
   */
  const tableRef = useRef<ListingsTableHandle>(null);

  /**
   * A handle onto the map, so a posting picked in the list can be brought to it.
   * Same shape of contract as the table's, for the same reason.
   */
  const mapRef = useRef<ListingsMapHandle>(null);

  /**
   * Which rows are on screen, as the trigger for a pending scroll.
   *
   * Keyed on the ids rather than on `data`: the row it is looking for is in the
   * DOM or it is not, and the ids are what say so.
   */
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
