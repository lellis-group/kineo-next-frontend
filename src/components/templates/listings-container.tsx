"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import type { ListingsTableHandle } from "@/components/organisms/listings-table";
import { ListingsView } from "@/components/templates/listings-view";
import { isInView } from "@/lib/dom";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  BROWSE_PAGE_SIZE,
  type BrowseFacets,
  type BrowseFormFilters,
  type BrowseListing,
  type BrowseListingsData,
  type BrowsePlacesData,
  type BrowseSort,
  type BrowseView,
  EMPTY_BROWSE_FILTERS,
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchFacets,
  fetchListingPageOf,
  horizonForStart,
  horizonStart,
  isDefaultBrowseView,
  toBrowseView,
} from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";

/**
 * The map card's id, so a choice made in the list can bring it back into view.
 *
 * On a phone the map sits a screen above the results, and the reciprocal gesture
 * — the row's title flies the camera — is invisible unless the camera is on
 * screen. Looked up by id rather than held in a ref because the map is rendered
 * through a `Suspense` boundary by a component this file does not own the markup
 * of; the id is the one thing that crosses it.
 */
const BROWSE_MAP_ID = "browse-map";

/**
 * The map, loaded only in the browser.
 *
 * `ssr: false` is not an optimisation here, it is a requirement: MapLibre opens
 * a WebGL context and reads `window` on import, so a server render of this module
 * throws before the first byte of HTML. Next only honours `ssr: false` from a
 * client component, which is why this file is one.
 */
const ListingsMap = dynamic(
  () =>
    import("@/components/organisms/listings-map").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => (
      <div className="size-full rounded-card bg-map-base" aria-hidden="true" />
    ),
  },
);

/**
 * Owns the browse screen's state: which filters, which page, and how the rows
 * are ordered.
 *
 * The split is the same as on the other three console screens. The server sends
 * the default view — no filter, first page — so the route paints with content on
 * arrival; every other combination is client state that fetches, through the
 * shared `usePaginatedResource` hook and its cancellation guard.
 *
 * The filters are one object rather than five states. Handing the toolbar
 * `filters` and `onFiltersChange(patch)` collapses seven `useState`s and seven
 * near-identical handlers into one merge, and it puts the "every filter change
 * returns to page 1" rule in one place instead of in each handler — which is
 * what it was for, since a filter that keeps page 4 hands the reader an empty
 * screen and a pager offering pages that no longer exist.
 *
 * Three reads, not one, and the split is the whole point:
 *
 * - the **rows** answer what the page shows, so they follow the pager;
 * - the **panels** (`/facets`) answer the shape of the collection and depend on
 *   a strict subset of the filters — never the specialty, never the page, never
 *   the ordering. They used to be refetched with the rows, on every page turn
 *   and every reordering, for an answer that could not have changed;
 * - the **map** is the whole filtered collection, not a page, so it moves when
 *   the filters do and not when the page does.
 *
 * The map's read arrives as a promise and is unwrapped inside a `<Suspense>`
 * boundary one level down, so the rows and the panels paint without waiting for
 * the heaviest read on the screen — which on the seeded corpus is also the
 * biggest payload. `initialPlaces` stays a promise rather than being awaited in
 * the page for exactly that reason; see `ListingsMapSlot`.
 */
export function ListingsContainer({
  initialData,
  initialFacets,
  initialPlaces,
}: {
  initialData: BrowseListingsData;
  initialFacets: BrowseFacets;
  initialPlaces: Promise<BrowsePlacesData | null>;
}) {
  const [filters, setFilters] =
    useState<BrowseFormFilters>(EMPTY_BROWSE_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<BrowseSort>("recent");

  /**
   * The two halves of pointing at something.
   *
   * Two states, because two durations: the hover is a preview that lasts as long
   * as the pointer, and the choice is a selection that lasts until it is
   * dismissed. They were one value here, which meant a posting chosen in the
   * table went dark the moment the mouse left its row — the map's card closed
   * with it, and the reader was back to wondering where they were.
   */
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<{
    id: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const view = useMemo(
    () => toBrowseView(filters, page, sort),
    [filters, page, sort],
  );

  /**
   * Applies a filter change and returns to the first page.
   *
   * Not a nicety: the new result set is frequently shorter than the old one, and
   * staying on page 4 would show nothing while the pagination still offered four
   * pages. It also covers clearing a filter, which is how a reader recovers from
   * exactly that.
   */
  const applyFilters = useCallback((patch: Partial<BrowseFormFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    setHoveredListingId(null);
    setSelectedListing(null);
  }, []);

  /**
   * Applies a reordering and returns to the first page.
   *
   * Same rule as a filter: the reader changes how the rows are ordered, and
   * page 4 of the old ordering says nothing about where to land in the new
   * one.
   */
  const applySort = useCallback((next: BrowseSort) => {
    setSort(next);
    setPage(1);
    setHoveredListingId(null);
    setSelectedListing(null);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_BROWSE_FILTERS);
    setPage(1);
    setHoveredListingId(null);
    setSelectedListing(null);
  }, []);

  /**
   * Fetches one view.
   *
   * `BrowseView` already carries the ordering, so this has nothing to add: the
   * view is what the server is asked for, filters and page and sort alike. The
   * second argument is the hook's abort signal, forwarded untouched to the
   * transport, so a page change stops the read the last page turn started.
   */
  const load = useCallback(
    (target: BrowseView, init?: RequestInit) =>
      fetchBrowseListings(target, undefined, init),
    [],
  );

  const { data, error, loading, reload } = usePaginatedResource({
    initialData,
    view,
    isDefaultView: isDefaultBrowseView,
    load,
  });

  /**
   * Which period chip is lit, read back from the date field rather than stored.
   *
   * The two date inputs and the segmented row write the same `from`, so keeping
   * a second copy of the choice would let them disagree: pick « Ce mois », then
   * clear the lower date by hand, and the row would still claim a narrowing the
   * results no longer have.
   */
  const horizon = horizonForStart(filters.from || undefined);

  const specialties = useMemo(
    () =>
      (Object.keys(SPECIALTY_LABELS) as Specialty[]).map((id) => ({
        id,
        label: SPECIALTY_LABELS[id],
      })),
    [],
  );

  /**
   * The filters the panels actually depend on.
   *
   * The facets endpoint is sent the reader's filters but never their specialty
   * and never the page or the ordering, because a « répartition par spécialité »
   * panel reading « Médecine générale — 12 » under a Dermatologie filter answers
   * a question nobody asked. The same reasoning says when to ask again: only
   * when one of these four changes. Paging, reordering and narrowing by
   * specialty leave the panels' collection alone, so they leave the numbers
   * alone too — three requests behind a click that moved ten rows, until now.
   *
   * Keyed on the widened values, not on `filters`, so that an untouched date
   * field does not read as a changed one.
   */
  const facetsScope = useMemo(() => {
    const widened = toBrowseView(filters);
    return {
      city: widened.city,
      startDateFrom: widened.startDateFrom,
      startDateTo: widened.startDateTo,
      urgentOnly: widened.urgentOnly,
    };
  }, [filters]);

  const [facets, setFacets] = useState(initialFacets);
  const facetsSeeded = useRef(facetsScope);

  useEffect(() => {
    // Skip the first run for the scope the server already answered: asking again
    // would be the very request this split was meant to avoid, and it would fire
    // on every page load for an answer already in hand.
    if (facetsSeeded.current === facetsScope) return;
    facetsSeeded.current = facetsScope;
    const controller = new AbortController();

    fetchFacets(facetsScope, undefined, { signal: controller.signal })
      .then((loaded) => {
        if (!controller.signal.aborted) setFacets(loaded);
      })
      // Neither is something the panels need to say: an aborted read is the
      // reader moving on, and a 5xx is absorbed by `fetchFacets` itself.
      .catch(() => {});

    return () => controller.abort();
  }, [facetsScope]);

  /**
   * The postings the map draws, held apart from the page on screen.
   *
   * Two states with two lives. The list is paged and re-fetches whenever the
   * reader pages; the map is the whole filtered collection and re-fetches only
   * when the filters change. Sharing one state was the defect — paging used to
   * redraw the map, so the same posts vanished from it and came back a page later.
   *
   * Seeded from the server's answer, so the first paint already carries markers,
   * and the first effect run is skipped: the server sent exactly this data for
   * exactly these filters, and asking again would be the very request we avoided.
   *
   * Held as a source rather than as a value, because the seed arrives as a
   * promise the page has not awaited. `ListingsMapSlot` unwraps whichever source
   * is current inside its own `<Suspense>`, and a refetched collection replaces
   * the source with a resolved one.
   */
  const [placesSource, setPlacesSource] = useState(initialPlaces);
  const seeded = useRef({ filters, sort });

  useEffect(() => {
    if (seeded.current.filters === filters && seeded.current.sort === sort) {
      return;
    }
    seeded.current = { filters, sort };
    const controller = new AbortController();

    fetchBrowsePlaces(toBrowseView(filters, 1, sort), undefined, {
      signal: controller.signal,
    })
      .then((data) => {
        // `null` is the failure signal; the map keeps the markers it has rather
        // than emptying itself over a failed refresh, because stale pins are a
        // smaller lie than a blank map.
        if (controller.signal.aborted || !data) return;
        setPlacesSource(Promise.resolve(data));
      })
      .catch(() => {
        // Unreachable while `fetchBrowsePlaces` catches its own failures, and
        // left in place only because a rejected promise here would otherwise be
        // an unhandled rejection.
      });

    return () => controller.abort();
  }, [filters, sort]);

  /** Set when a posting is picked on the map but is not on the current page. */
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  /**
   * A handle onto the results table, so a picked posting can be scrolled to.
   *
   * The container asks the table to scroll rather than querying the document
   * itself: a row is the table's markup, and only the table should know how to
   * find one. See `ListingsTableHandle`.
   */
  const tableRef = useRef<ListingsTableHandle>(null);

  /**
   * A handle onto the map, so a posting picked in the list can be brought to it.
   *
   * The same shape of contract as the table's, and for the same reason: the two
   * halves of this screen are one set of rows seen two ways, and the screen's job
   * is to pass a choice from one to the other. See `ListingsMapHandle`.
   */
  const mapRef = useRef<ListingsMapHandle>(null);

  /**
   * Which rows are on screen, as the trigger for a pending scroll.
   *
   * Keyed on the ids rather than on `data`, which is what the effect actually
   * depends on: the row it is looking for is in the DOM or it is not, and the ids
   * are what say so. Watching the whole payload instead would re-run this on every
   * count that happens to be fetched alongside the rows.
   */
  const onScreenIds = useMemo(
    () => new Set(data.listings.map((listing) => listing.id)),
    [data.listings],
  );

  /**
   * Brings a posting picked on the map to the reader in the list.
   *
   * The two halves of this screen are one set of rows seen two ways, and the map
   * used to be a dead end: a popup named a posting and offered no way to reach it.
   *
   * Now that the map covers the whole collection rather than the page, the posting
   * picked may not be on screen — so this turns to the page that holds it first,
   * and scrolls once those rows have landed, rather than scrolling to nothing.
   *
   * `block: "center"` because the list is taller than the viewport: the reader is
   * looking at a map some hundreds of pixels above the list, and `"nearest"` would
   * park the row on an edge that is itself off screen.
   *
   * It also *chooses* the posting. Both doors into this screen — a marker and a
   * row — must land on the same state, or the reader learns that clicking a pin
   * and clicking a title do different things to the same posting.
   */
  const pickListing = useCallback(
    (id: string) => {
      const listing = data.listings.find((row) => row.id === id);
      if (listing?.location) {
        setSelectedListing({
          id: listing.id,
          latitude: listing.location.latitude,
          longitude: listing.location.longitude,
        });
      }
      setHoveredListingId(id);

      // On this page already: the table scrolls the row itself and reports it
      // was found, so there is nothing to page to — and nothing to ask.
      if (tableRef.current?.scrollToId(id)) {
        return;
      }

      // Which page of the server's ordering holds it. The map covers the whole
      // filtered collection and the list one page of it, so the answer is a
      // position in that collection — asked now, of the reader's current filters
      // and page size, rather than carried by every map read as the id of every
      // posting it could ever be asked about.
      //
      // `null` is a real answer: the posting is not in the current view, or the
      // read failed. Either way there is no page to turn to, and the list is
      // still correct — it just cannot show a posting it does not show.
      setPendingScrollId(id);
      fetchListingPageOf(id, { ...view, limit: BROWSE_PAGE_SIZE }).then(
        (target) => {
          if (target !== null) setPage(target);
        },
      );
    },
    [data.listings, view],
  );

  /**
   * The other direction: a posting chosen in the list comes to the map.
   *
   * This is the reciprocal the screen never had — the row's title is a button,
   * and the map flies to the posting and opens its card, which is exactly what
   * clicking a marker does to the list.
   *
   * The camera flies whatever page the row is on: the map is the same map. The
   * row then scrolls into view, by way of the same page-turning read `pickListing`
   * uses — a posting chosen in the list is frequently on another page of the same
   * ordering, and a choice the reader cannot see on either half is half a choice.
   *
   * A posting with no coordinates simply selects: its practice was never
   * geocoded, so there is nothing to fly to, and the row lights up on its own.
   */
  const selectListing = useCallback(
    (listing: BrowseListing) => {
      setHoveredListingId(listing.id);

      if (!listing.location) {
        setSelectedListing(null);
        return;
      }

      setSelectedListing({
        id: listing.id,
        latitude: listing.location.latitude,
        longitude: listing.location.longitude,
      });

      mapRef.current?.focusOn(listing.location);

      // On a phone the map is a screen away *above* the list, and a camera move
      // nobody can see is a camera that did not move. Brought back only when it
      // is out of view: on a desktop the two halves are side by side and the call
      // would be a no-op that scrolls nothing.
      const card = document.getElementById(BROWSE_MAP_ID);
      if (card && !isInView(card)) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (!onScreenIds.has(listing.id)) {
        setPendingScrollId(listing.id);
        fetchListingPageOf(listing.id, {
          ...view,
          limit: BROWSE_PAGE_SIZE,
        }).then((target) => {
          if (target !== null) setPage(target);
        });
        return;
      }

      tableRef.current?.scrollToId(listing.id);
    },
    [onScreenIds, view],
  );

  useEffect(() => {
    if (!pendingScrollId) return;
    // Not on this page yet — the turn of the page is still in flight, and the
    // effect runs again for the rows that land.
    if (!onScreenIds.has(pendingScrollId)) return;
    // Cleared only once the row is actually found, so a turn of the page whose
    // rows have not painted yet is retried on the next run rather than dropped.
    if (tableRef.current?.scrollToId(pendingScrollId)) {
      setPendingScrollId(null);
    }
  }, [onScreenIds, pendingScrollId]);

  return (
    <>
      {error != null && (
        <div className="mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-6">
          <InlineRetryBanner
            noun="Les annonces affichées"
            onRetry={reload}
            error={error}
          />
        </div>
      )}

      <ListingsView
        facets={facets}
        toolbar={{
          filters,
          onFiltersChange: applyFilters,
          specialties,
          filtered: !isDefaultBrowseView(view),
          onResetFilters: resetFilters,
          total: data.total,
          sort,
          onSortChange: applySort,
        }}
        results={{
          listings: data.listings,
          totalPages: data.totalPages,
          page: data.page,
          onPageChange: setPage,
          loading,
          filtered: !isDefaultBrowseView(view),
          horizon,
          onHorizonChange: (next) =>
            applyFilters({ from: horizonStart(next) ?? "" }),
          onHoveredChange: setHoveredListingId,
          selectedListingId: selectedListing?.id ?? null,
          onListingSelect: selectListing,
          onResetFilters: resetFilters,
          tableRef,
        }}
        map={
          <Suspense
            fallback={
              <div
                className="size-full rounded-card bg-map-base"
                aria-hidden="true"
              />
            }
          >
            <ListingsMapSlot
              ref={mapRef}
              places={placesSource}
              hoveredListingId={hoveredListingId}
              onHoveredChange={setHoveredListingId}
              selectedListing={selectedListing}
              onSelectionClear={() => setSelectedListing(null)}
              onMarkerSelect={setSelectedListing}
              onListingPick={pickListing}
            />
          </Suspense>
        }
      />
    </>
  );
}

/**
 * The map, and the promise its first read arrived in.
 *
 * The seed for this map is not awaited in the page: `/places` is the heaviest
 * read on this screen and the biggest payload in the response, and holding the
 * rows behind it meant the list a reader actually reads waited on a map that is
 * drawn by a chunk that has not loaded yet. So the read stays a promise until
 * here, inside its own boundary, and the rows paint without it.
 *
 * `use()` suspends this component — not the container — which is what puts the
 * boundary in the right place. It is called on a promise either way, whether the
 * data is the server's seed or one a filter change has since resolved, so the
 * order of the hook never changes.
 *
 * The `ref` passes straight through: a handle is a prop, and the component that
 * owns it is the one that forwards it. Holding it here instead would mean the
 * container reached *through* a `Suspense` boundary to a node this component
 * renders, which is the one thing a boundary exists to prevent.
 */
type MapSlotProps = Omit<
  React.ComponentProps<typeof ListingsMap>,
  "places" | "unlocated" | "totalPlaces" | "truncated"
> & { places: Promise<BrowsePlacesData | null> };

const ListingsMapSlot = forwardRef<ListingsMapHandle, MapSlotProps>(
  function ListingsMapSlot({ places, ...rest }, ref) {
    const resolved = use(places);

    return (
      <ListingsMap
        ref={ref}
        places={resolved?.places ?? []}
        unlocated={resolved?.unlocated ?? 0}
        totalPlaces={resolved?.totalPlaces ?? 0}
        truncated={resolved?.truncated ?? false}
        {...rest}
      />
    );
  },
);
