"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  forwardRef,
  Suspense,
  use,
  useCallback,
  useEffect,
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
  type BrowseSelection,
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
  type ListingSpotlight,
  type MapPlaceListing,
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

/** How long the pick's glow lasts before the container lets it go. */
const SPOTLIGHT_MS = 1_800;

/**
 * What a screen reader hears when the picked row is already on screen.
 *
 * The visual answer to « what changed » is the row's own glow; this is the same
 * answer in words, and it never mentions the pager, because the pager did not
 * move.
 */
function pickAnnouncement(listing: BrowseSelection): string {
  const where = listing.city ? `, ${listing.city}` : "";
  return `Annonce sélectionnée : ${listing.title}${where}.`;
}

/**
 * Same, for the pick that turned the list.
 *
 * The pager's flash is colour alone, so the turn is named here — this is the
 * only place the reader is told which page they were brought to.
 */
function pickMovedAnnouncement(
  listing: BrowseSelection,
  page: number,
  totalPages: number,
): string {
  return `${pickAnnouncement(listing)} Page ${page} sur ${totalPages}.`;
}

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
   * What the chosen posting is, as the rail's panel draws it.
   *
   * The coordinates above are for the map; this is the rest — title, place,
   * period. It is filled from the map's own preview when the pick came from a
   * pin, so the panel never asks the server about a posting the reader just
   * clicked, and it survives a page turn that takes the row away.
   */
  const [selectedPreview, setSelectedPreview] =
    useState<BrowseSelection | null>(null);

  /**
   * The one-shot mark a pick on the map leaves on its row.
   *
   * Not the selection: `selectedListing` lasts until dismissed, this lasts
   * about two seconds. See `ListingSpotlight`.
   */
  const [spotlight, setSpotlight] = useState<ListingSpotlight | null>(null);

  /**
   * A pick whose row is on another page, waiting for the turn to land.
   *
   * The glow must not start at the click: at that moment the row is not in the
   * DOM, so the reader would see a page turn and then a row that never lit. It
   * starts in the effect below, once the row is really on screen.
   */
  const [pendingPick, setPendingPick] = useState<{
    listing: BrowseSelection;
    fromPage: number;
  } | null>(null);

  /**
   * What a screen reader hears after a pick — the visual glow in words.
   *
   * The page turn is stated here because the pager's flash is colour only.
   */
  const [announcement, setAnnouncement] = useState("");

  /**
   * The kind of view write currently in flight.
   *
   * The rail's figures are aggregates of the collection: a filter or a sort
   * changes them, a page does not. This is what tells the rail's busy state
   * apart from the results panel's, which dims for both.
   */
  const [pendingWrite, setPendingWrite] = useState<"filters" | "page" | null>(
    null,
  );

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
   *
   * `kind` names what the write is about, for the rail's busy state. It is not
   * derivable from `method`: a page turn made on the reader's behalf (a pick
   * whose row is elsewhere) is a `replace` and still a page, not a filter.
   */
  const writeView = useCallback(
    (
      next: { filters: BrowseFormFilters; page: number; sort: BrowseSort },
      method: "replace" | "push",
      kind: "filters" | "page",
    ) => {
      const query = browseViewToParams(next.filters, next.page, next.sort);
      const search = query.toString();
      const url = search ? `${pathname}?${search}` : pathname;
      setPendingWrite(kind);
      startTransition(() => {
        if (method === "push") router.push(url);
        else router.replace(url);
      });
    },
    [pathname, router],
  );

  /**
   * Drops the transient half of a choice: the glow, the pending turn, the words.
   *
   * The selection itself is cleared by the callers that want that; this is the
   * part that must not survive a view the reader has left.
   */
  const clearTransientPick = useCallback(() => {
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

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
      setSelectedPreview(null);
      clearTransientPick();
      // A pending scroll belongs to the view the reader just left: whatever it
      // was waiting for is no longer the page they are being shown. The hook's
      // pending id is cleared below via clearScroll once it is in scope; here we
      // simply stop requesting it — the new onScreenIds will never match it.
      writeView(
        { filters: { ...filters, ...patch }, page: 1, sort },
        "replace",
        "filters",
      );
    },
    [filters, sort, writeView, clearTransientPick],
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
      setSelectedPreview(null);
      clearTransientPick();
      writeView({ filters, page: 1, sort: next }, "replace", "filters");
    },
    [filters, writeView, clearTransientPick],
  );

  const resetFilters = useCallback(() => {
    setHoveredListingId(null);
    setSelectedListing(null);
    setSelectedPreview(null);
    clearTransientPick();
    writeView(
      { filters: EMPTY_BROWSE_FILTERS, page: 1, sort },
      "replace",
      "filters",
    );
  }, [sort, writeView, clearTransientPick]);

  /**
   * Turns the page. A `push`, unlike a filter change, so the back button walks
   * the pages rather than leaving the feed.
   *
   * The glow and the pending turn are dropped: the row they were about is on the
   * page the reader has just left, and a signal that reappears when they page
   * back is a signal about the wrong gesture.
   */
  const changePage = useCallback(
    (next: number) => {
      clearTransientPick();
      writeView({ filters, page: next, sort }, "push", "page");
    },
    [filters, sort, writeView, clearTransientPick],
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
   * The chosen posting's row, when it happens to be on the page on screen.
   *
   * Looked up, not stored: the row is already in the response the screen holds,
   * and storing a second copy of it would be one more state that can drift from
   * `data` as the reader pages. When the row is on another page this is null and
   * the map's preview answers instead — which is how the rail's panel says what
   * was chosen without any request the screen was not already making.
   */
  const selectedRow = useMemo(
    (): BrowseSelection | null =>
      (selectedListing &&
        data.listings.find((listing) => listing.id === selectedListing.id)) ||
      null,
    [data.listings, selectedListing],
  );

  /**
   * What the rail's selection panel draws.
   *
   * The row is preferred because it is the fuller fact — specialty, urgency —
   * and only when the row is off the screen does the preview answer. The two
   * name the same posting; when both exist they must, because both were made
   * from the same pick.
   */
  const selection: BrowseSelection | null = selectedRow ?? selectedPreview;

  /**
   * Turns the page to the one holding `id`, then scrolls to it.
   *
   * Shared by `pickListing` and `selectListing`: both need to send the reader to
   * the page that holds a posting the map named, and only one of them should own
   * that read. A `replace`, not a `push`: the reader picked a posting, they did
   * not page to it, and a jump they never asked for must not become a stop the
   * back button walks back through.
   *
   * Resolves with the page it turned to, or null when the posting is no longer
   * in the collection. The caller uses that to cancel a pending spotlight rather
   * than leaving it armed against an id that will never arrive.
   */
  const turnToPage = useCallback(
    (id: string): Promise<number | null> => {
      scrollTo(id);
      return fetchListingPageOf(id, {
        ...view,
        limit: BROWSE_PAGE_SIZE,
      }).then((target) => {
        if (target === null) {
          clearScroll();
          return null;
        }
        writeView({ filters, page: target, sort }, "replace", "page");
        return target;
      });
    },
    [view, filters, sort, writeView, scrollTo, clearScroll],
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
   *
   * The pick brought the whole preview, not just an id: the rail's panel has to
   * be able to name the posting before its row ever renders, without a request.
   */
  const pickListing = useCallback(
    (listing: MapPlaceListing) => {
      // In « Carte seule » the list is not drawn, so scrolling a row into view has
      // nothing to scroll. The popup's action is « see this in the list », so the
      // honest answer is to reveal the list: switching to the split mounts it,
      // and the rows this screen already holds are the rows it then renders.
      if (layout === "map") {
        setLayout("split");
      }

      setHoveredListingId(listing.id);

      setSelectedListing({
        id: listing.id,
        latitude: listing.location.latitude,
        longitude: listing.location.longitude,
      });
      setSelectedPreview(listing);

      if (onScreenIds.has(listing.id)) {
        // The row is already here: the glow can start now, and say which page
        // the pick left the reader on (its own — so nothing about the pager).
        setSpotlight((current) => ({
          id: listing.id,
          nonce: (current?.nonce ?? 0) + 1,
          fromPage: page,
        }));
        setAnnouncement(pickAnnouncement(listing));
        scrollTo(listing.id);
        return;
      }

      /*
        The row is on another page. The glow must not start at the click — at
        that moment there is no row under the reader — so it is armed here and
        lit by the effect below, once the turn has landed and `onScreenIds`
        actually holds the id.
      */
      setPendingPick({ listing, fromPage: page });
      turnToPage(listing.id).then((target) => {
        if (target !== null) return;
        // The posting is gone from the collection. Stand down rather than leave
        // a glow armed against an id that will never arrive.
        setPendingPick(null);
        setAnnouncement(`Annonce introuvable : ${listing.title}.`);
      });
    },
    [layout, onScreenIds, page, scrollTo, turnToPage],
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
   *
   * No glow here, on purpose: the row was already on screen, so nothing changed
   * under the reader, and a light on an unchanged row is noise.
   */
  const selectListing = useCallback(
    (listing: BrowseListing) => {
      setHoveredListingId(listing.id);
      // The row is in hand — the panel keeps it through a later page turn.
      setSelectedPreview(listing);

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
        turnToPage(listing.id);
        return;
      }

      tableRef.current?.scrollToId(listing.id);
    },
    [onScreenIds, layout, turnToPage],
  );

  /**
   * Drops the choice — Escape on the map, a click outside, the panel's close.
   *
   * The glow goes with it: a mark whose subject has been unchosen is a lie the
   * next reader would read as an answer to a question nobody asked.
   */
  const clearSelection = useCallback(() => {
    setSelectedListing(null);
    setSelectedPreview(null);
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

  /** Brings the chosen posting's row back into view, from the rail's panel. */
  const revealSelection = useCallback(() => {
    if (!selection || !selection.location) return;
    pickListing({ ...selection, location: selection.location });
  }, [pickListing, selection]);

  /*
    Places a pending glow the moment its row is really on screen.

    The page that turned to reach the row is part of the sentence, because the
    visual signal for that turn is colour alone — and the pager's flash only
    says *that* something changed, not what.
  */
  useEffect(() => {
    if (!pendingPick) return;
    if (!onScreenIds.has(pendingPick.listing.id)) return;

    const turned = data.page !== pendingPick.fromPage;
    setSpotlight((current) => ({
      id: pendingPick.listing.id,
      nonce: (current?.nonce ?? 0) + 1,
      fromPage: pendingPick.fromPage,
    }));
    setAnnouncement(
      turned
        ? pickMovedAnnouncement(pendingPick.listing, data.page, data.totalPages)
        : pickAnnouncement(pendingPick.listing),
    );
    setPendingPick(null);
  }, [pendingPick, onScreenIds, data.page, data.totalPages]);

  /**
   * Ends the glow.
   *
   * The outline and sheen are transitions and an animation; without this timer
   * the halo would stay lit until the next pick, and a second reader landing on
   * the same screen would read the glow as live state rather than as the
   * aftermath of a click that has already settled.
   */
  useEffect(() => {
    if (!spotlight) return;
    const timer = window.setTimeout(() => setSpotlight(null), SPOTLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [spotlight]);

  return (
    /*
      The rail's busy state, read off what is in flight: the panels are
      aggregates of the collection, so a page turn — however it was asked for —
      gives them nothing to recompute, and a filter or a sort does. The results
      panel dims for both; this is the one that must not lie.
    */
    <ListingsView
      rail={{
        facets,
        filters,
        onFiltersChange: applyFilters,
        selection,
        onSelectionReveal: revealSelection,
        onSelectionClear: clearSelection,
        busy: isNavigating && pendingWrite === "filters",
      }}
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
        // The mark itself, and the words about it, and the pager flash — the
        // three answers to « what changed » one pick can make on this half.
        spotlight,
        announcement,
        pageHighlight:
          spotlight && data.page !== spotlight.fromPage
            ? spotlight.nonce
            : null,
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
            onSelectionClear={clearSelection}
            onMarkerSelect={pickListing}
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
