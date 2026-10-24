"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  forwardRef,
  Suspense,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ListingsTableHandle } from "@/components/organisms/listings-table";
import { ListingsView } from "@/components/templates/listings-view";
import { isInView } from "@/lib/dom";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import { useScrollToRow } from "@/lib/hooks/use-scroll-to-row";
import {
  BROWSE_MAP_ID,
  BROWSE_PAGE_SIZE,
  type BrowseFacets,
  type BrowseFormFilters,
  type BrowseLayout,
  type BrowseListing,
  type BrowseListingsData,
  type BrowsePlacesData,
  type BrowseSort,
  type BrowseView,
  browseViewFromParams,
  browseViewToParams,
  EMPTY_BROWSE_FILTERS,
  fetchBrowseListings,
  fetchListingPageOf,
  horizonBounds,
  horizonForBounds,
  isDefaultBrowseView,
  toBrowseView,
} from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";

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
 * Owns the browse screen's state — and the state now lives in the URL.
 *
 * This screen is the odd one out among the four console screens, and on purpose.
 * The other three hold their filter, page and bucket in `useState` and fetch
 * client-side; this one writes the query string and lets the server answer. The
 * difference is the reader's expectation: a filtered search here is something to
 * share, to bookmark and to walk back through with the back button, and none of
 * that survives a `useState`. So `filters`, `page` and `sort` are read from
 * `useSearchParams` (the single source of truth) and every change is a
 * `router.push`/`replace` — see `writeView`.
 *
 * The server answers every view by re-rendering: `page.tsx` reads the same query
 * string and seeds `fetchBrowseListings`, `fetchFacets` and `fetchBrowsePlaces`
 * with it. So all three reads arrive here as fresh `initialData`/`initialFacets`/
 * `initialPlaces` on each navigation, and there is **no client fetch on this
 * screen at all** — the loader handed to `usePaginatedResource` exists only to
 * satisfy the shared hook, and `seedFromServer` tells it to adopt each new
 * `initialData` rather than refetch. That is what removes the double read a
 * seeded filtered URL would otherwise cause.
 *
 * The filters stay one object rather than five states, and `onFiltersChange(patch)`
 * still merges a partial — it now folds the "every filter change returns to page
 * 1" rule into the one URL it writes, which is the whole reason it is a merge
 * rather than five setters: a filter that keeps page 4 hands the reader an empty
 * screen and a pager offering pages that no longer exist.
 *
 * Three reads, not one, and the split is still the whole point:
 *
 * - the **rows** answer what the page shows, so they follow the pager;
 * - the **panels** (`/facets`) answer the shape of the collection and depend on
 *   a strict subset of the filters — never the specialty, never the page, never
 *   the ordering;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  /**
   * The view, read from the URL — the single source of truth.
   *
   * Filters, page and sort all live in the query string, so a shared link opens
   * the exact view it was made from and the browser's back button walks the
   * views the reader has been through, which three `useState`s could not do.
   * `useSearchParams` hands back a fresh object each render; the query string is
   * the value that actually changes, so it is what the memo keys on, and the
   * parse runs only when it does.
   */
  const paramsKey = searchParams.toString();
  const { filters, page, sort } = useMemo(
    () => browseViewFromParams(new URLSearchParams(paramsKey)),
    [paramsKey],
  );

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

  /**
   * Which halves are on screen — a preference, held here and nowhere else.
   *
   * Client state, deliberately not in the URL: a layout change reflows the
   * screen and fetches nothing, and on this screen a URL write re-reads all
   * three endpoints. So it lives beside the hover and the selection, the other
   * things that are true of a sitting and not of a link. See `BrowseLayout`.
   */
  const [layout, setLayout] = useState<BrowseLayout>("split");

  const view = useMemo(
    () => toBrowseView(filters, page, sort),
    [filters, page, sort],
  );

  /**
   * Writes a view to the URL, which is how every view change happens now.
   *
   * `method` is the history policy: `replace` for a filter or a sort, so a
   * reader who narrows three fields does not build three back-button stops to
   * walk back through; `push` for the pager, where turning back a page is
   * exactly what the reader expects. Every write re-renders the route on the
   * server — see the container's header — so there is no client fetch behind
   * this, only a navigation. Wrapped in a transition so the list can show its
   * pending state rather than freezing.
   */
  const writeView = useCallback(
    (
      next: { filters: BrowseFormFilters; page: number; sort: BrowseSort },
      method: "replace" | "push",
    ) => {
      const query = browseViewToParams(next.filters, next.page, next.sort);
      const search = query.toString();
      const url = search ? `${pathname}?${search}` : pathname;
      startTransition(() => {
        if (method === "push") router.push(url);
        else router.replace(url);
      });
    },
    [pathname, router],
  );

  /**
   * Applies a filter change and returns to the first page.
   *
   * Not a nicety: the new result set is frequently shorter than the old one, and
   * staying on page 4 would show nothing while the pagination still offered four
   * pages. It also covers clearing a filter, which is how a reader recovers from
   * exactly that. The page reset is not a second write — it is folded into the
   * one URL this produces.
   */
  const applyFilters = useCallback(
    (patch: Partial<BrowseFormFilters>) => {
      setHoveredListingId(null);
      setSelectedListing(null);
      // A pending scroll belongs to the view the reader just left: whatever it
      // was waiting for is no longer the page they are being shown. The hook's
      // pending id is cleared below via clearScroll once it is in scope; here we
      // simply stop requesting it — the new onScreenIds will never match it.
      writeView(
        { filters: { ...filters, ...patch }, page: 1, sort },
        "replace",
      );
    },
    [filters, sort, writeView],
  );

  /**
   * Applies a reordering and returns to the first page.
   *
   * Same rule as a filter: the reader changes how the rows are ordered, and
   * page 4 of the old ordering says nothing about where to land in the new one.
   */
  const applySort = useCallback(
    (next: BrowseSort) => {
      setHoveredListingId(null);
      setSelectedListing(null);
      writeView({ filters, page: 1, sort: next }, "replace");
    },
    [filters, writeView],
  );

  const resetFilters = useCallback(() => {
    setHoveredListingId(null);
    setSelectedListing(null);
    writeView({ filters: EMPTY_BROWSE_FILTERS, page: 1, sort }, "replace");
  }, [sort, writeView]);

  /**
   * Turns the page. A `push`, unlike a filter change, so the back button walks
   * the pages rather than leaving the feed.
   */
  const changePage = useCallback(
    (next: number) => {
      writeView({ filters, page: next, sort }, "push");
    },
    [filters, sort, writeView],
  );

  /**
   * Fetches one view.
   *
   * `BrowseView` already carries the ordering, so this has nothing to add: the
   * view is what the server is asked for, filters and page and sort alike. The
   * second argument is the hook's abort signal, forwarded untouched to the
   * transport, so a page change stops the read the last page turn started.
   *
   * It is still passed to the hook — the hook's contract asks for a loader — but
   * on this screen it is never called: the URL is the source of truth and the
   * server answers every view by re-rendering, so the rows arrive as fresh
   * `initialData` and `seedFromServer` adopts them. There is no client fetch on
   * this path, and this loader exists only to satisfy the shared hook.
   */
  const load = useCallback(
    (target: BrowseView, init?: RequestInit) =>
      fetchBrowseListings(target, undefined, init),
    [],
  );

  /**
   * One resource, seeded by the server on every URL change.
   *
   * `seedFromServer` never client-fetches here, which also settles the error
   * surface: every read this screen performs belongs to a server navigation,
   * whose failure renders the route's error state — a banner pointing at
   * `reload` would offer a retry for a request this screen never makes.
   */
  const { data, loading } = usePaginatedResource({
    initialData,
    view,
    isDefaultView: isDefaultBrowseView,
    load,
    seedFromServer: true,
  });

  /**
   * Which period chip is lit, read back from the date fields rather than stored.
   *
   * The two date inputs and the segmented row write the same `from` *and `to`*
   * — a horizon names a period, not a lower bound — so keeping a second copy of
   * the choice would let them disagree: pick « Ce mois », then widen the lower
   * date by hand, and the row would still claim a narrowing the results no
   * longer have.
   */
  const horizon = horizonForBounds(
    filters.from || undefined,
    filters.to || undefined,
  );

  const specialties = useMemo(
    () =>
      (Object.keys(SPECIALTY_LABELS) as Specialty[]).map((id) => ({
        id,
        label: SPECIALTY_LABELS[id],
      })),
    [],
  );

  /**
   * The panels' figures, straight from the server's answer.
   *
   * No state and no client fetch: the URL is the source of truth, so every view
   * change re-renders the route and the server delivers fresh facets for exactly
   * the filters on screen. The split this replaces — panels depending on a
   * subset of the filters, refetched only when that subset changed — is the
   * server's job now, and it is what `page.tsx` seeds `fetchFacets` with. What
   * used to live here as a `useState` plus a `useEffect` with an abort guard was
   * a second request behind a navigation that had already produced the answer.
   */
  const facets = initialFacets;

  /**
   * The postings the map draws, straight from the server's promise.
   *
   * No state and no client refetch: the URL is the source of truth, so a filter
   * change re-renders the route and `initialPlaces` arrives as a fresh promise
   * for exactly those filters. The map is still the whole filtered collection,
   * never the page — `page.tsx` seeds `fetchBrowsePlaces` with the filters and
   * no page, so paging does not redraw it.
   *
   * Still a source rather than a value, because the page does not await this
   * read: it is the heaviest payload on the screen and the rows must not wait
   * for it. `ListingsMapSlot` unwraps whichever promise is current inside its
   * own `<Suspense>`, so a new navigation suspends only the map, not the list.
   */
  const placesSource = initialPlaces;

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

  const { scrollTo, clear: clearScroll } = useScrollToRow(
    tableRef,
    onScreenIds,
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
      // In « Carte seule » the list is not drawn, so scrolling a row into view has
      // nothing to scroll. The popup's action is « see this in the list », so the
      // honest answer is to reveal the list: switching to the split mounts it,
      // and the rows this screen already holds are the rows it then renders.
      if (layout === "map") {
        setLayout("split");
      }

      setHoveredListingId(id);

      const listing = data.listings.find((row) => row.id === id);
      if (listing?.location) {
        setSelectedListing({
          id: listing.id,
          latitude: listing.location.latitude,
          longitude: listing.location.longitude,
        });
      }

      if (listing) {
        // The posting is in the rows the screen already holds: there is a page
        // (the one showing) and nothing to ask. The scroll waits on the hook
        // below — which, coming from a popup in « Carte seule », runs again
        // once the split has mounted the table.
        scrollTo(id);
        return;
      }

      // Which page of the server's ordering holds it. The map covers the whole
      // filtered collection and the list one page of it, so the answer is a
      // position in that collection — asked now, of the reader's current filters
      // and page size, rather than carried by every map read as the id of every
      // posting it could ever be asked about.
      //
      // The turn itself is a `replace`, not a `push`: the reader picked a
      // posting, they did not page to it, and a jump they never asked for must
      // not become a stop the back button walks back through.
      scrollTo(id);
      fetchListingPageOf(id, { ...view, limit: BROWSE_PAGE_SIZE }).then(
        (target) => {
          // `null` — not in this view, or the read failed. Give the pending
          // scroll up rather than leave it armed: left, it would land on the
          // next read that happens to carry the id, a jump the reader moved
          // past asking.
          if (target === null) {
            clearScroll();
            return;
          }
          writeView({ filters, page: target, sort }, "replace");
        },
      );
    },
    [
      data.listings,
      view,
      filters,
      sort,
      writeView,
      layout,
      scrollTo,
      clearScroll,
    ],
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

      // In « Liste seule » the map is not drawn, so a camera move has nowhere to
      // land and a scroll to the map card has nothing to show. The row's title is
      // a « voir sur la carte » action, so the honest answer is to reveal the map:
      // switching to the split mounts it and the map opens this posting's card.
      // The imperative fly below is left to the case where the map is already
      // there, and the page turn is skipped because a posting the reader could
      // click is already on screen.
      if (layout === "list") {
        setLayout("split");
        return;
      }

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
        scrollTo(listing.id);
        fetchListingPageOf(listing.id, {
          ...view,
          limit: BROWSE_PAGE_SIZE,
        }).then((target) => {
          // A `replace`, like `pickListing`'s turn: the reader chose a posting,
          // the page followed, and that jump is not a history stop. And like
          // `pickListing`, `null` gives the pending scroll up rather than
          // leaving it armed for a later read.
          if (target === null) {
            clearScroll();
            return;
          }
          writeView({ filters, page: target, sort }, "replace");
        });
        return;
      }

      tableRef.current?.scrollToId(listing.id);
    },
    [
      onScreenIds,
      view,
      filters,
      sort,
      writeView,
      layout,
      scrollTo,
      clearScroll,
    ],
  );

  return (
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
        layout,
        onLayoutChange: setLayout,
      }}
      layout={layout}
      results={{
        listings: data.listings,
        totalPages: data.totalPages,
        page: data.page,
        onPageChange: changePage,
        // The hook's `loading` never fires on this screen — there is no client
        // fetch. The pending signal that matters is the server navigation the
        // URL write started, so the list dims while the new rows are in flight.
        loading: loading || isNavigating,
        filtered: !isDefaultBrowseView(view),
        horizon,
        onHorizonChange: (next) => applyFilters(horizonBounds(next)),
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
