import { describe, expect, it } from "bun:test";
import type { ApiListingPlace } from "@/lib/types/api";
import type { ApiTransport } from "../api-client";
import { toIsoDayBound } from "../format";
import { adaptFacets } from "./browse-adapters";
import {
  browseViewFromParams,
  browseViewToParams,
  EMPTY_BROWSE_FILTERS,
  horizonForStart,
  horizonStart,
  isDefaultBrowseView,
  listingBadge,
  toBrowseView,
} from "./browse-contracts";
import {
  fetchBrowseListings,
  fetchBrowsePlaces,
  fetchListingPageOf,
} from "./browse-service";

describe("adaptFacets", () => {
  it("gives every specialty a row, including those holding nothing", () => {
    const facets = adaptFacets({
      total: 8,
      urgent: 2,
      bySpecialty: {
        GENERALIST: 8,
        DENTIST: 0,
        DERMATOLOGIST: 0,
        PSYCHIATRIST: 0,
        OTHER: 0,
      },
    });

    expect(facets.bySpecialty).toHaveLength(5);
    expect(
      facets.bySpecialty.find((row) => row.specialty === "PSYCHIATRIST"),
    ).toMatchObject({ count: 0, percent: 0 });
  });

  it("reads the share against the total, not the largest row", () => {
    const facets = adaptFacets({
      total: 10,
      urgent: 0,
      bySpecialty: {
        GENERALIST: 5,
        DENTIST: 5,
        DERMATOLOGIST: 0,
        PSYCHIATRIST: 0,
        OTHER: 0,
      },
    });

    expect(facets.bySpecialty.map((row) => row.percent)).toEqual([
      50, 50, 0, 0, 0,
    ]);
  });

  /**
   * A response with no breakdown is a normal case — an older backend, or a feed
   * that was never asked — and it must read as zeros rather than as NaN.
   */
  it("stands in zeros when the breakdown is missing", () => {
    const facets = adaptFacets(undefined);

    expect(facets.total).toBe(0);
    expect(facets.urgent).toBe(0);
    expect(facets.bySpecialty.every((row) => row.count === 0)).toBe(true);
  });
});

describe("toIsoDayBound", () => {
  it("starts a day at midnight", () => {
    expect(toIsoDayBound("2026-10-15")).toBe("2026-10-15T00:00:00.000Z");
  });

  /**
   * Reading the upper bound as midnight would drop every posting published on
   * the day the reader picked — the one day they certainly meant to include.
   */
  it("ends a day at its last millisecond when asked to", () => {
    expect(toIsoDayBound("2026-10-15", true)).toBe("2026-10-15T23:59:59.999Z");
  });

  it("treats an empty field as no bound at all", () => {
    expect(toIsoDayBound("")).toBeUndefined();
  });
});

describe("toBrowseView", () => {
  it("sends an empty filter as an absent key, never an empty value", () => {
    const view = toBrowseView(EMPTY_BROWSE_FILTERS);

    expect(view).toEqual({
      page: 1,
      sort: "recent",
      specialty: undefined,
      city: undefined,
      urgentOnly: undefined,
      startDateFrom: undefined,
      startDateTo: undefined,
    });
  });

  /**
   * `city=""` is a search for a city literally called nothing, and the endpoint
   * rejects it — a cleared field must not become a failed request.
   */
  it("trims the city and drops it when it is blank", () => {
    expect(toBrowseView({ ...EMPTY_BROWSE_FILTERS, city: "  " }).city).toBe(
      undefined,
    );
    expect(toBrowseView({ ...EMPTY_BROWSE_FILTERS, city: " Lyon " }).city).toBe(
      "Lyon",
    );
  });

  it("widens both date bounds to cover the whole day", () => {
    const view = toBrowseView({
      ...EMPTY_BROWSE_FILTERS,
      from: "2026-10-01",
      to: "2026-10-31",
    });

    expect(view.startDateFrom).toBe("2026-10-01T00:00:00.000Z");
    expect(view.startDateTo).toBe("2026-10-31T23:59:59.999Z");
  });
});

describe("isDefaultBrowseView", () => {
  it("recognises the view the server answered for", () => {
    expect(isDefaultBrowseView(toBrowseView(EMPTY_BROWSE_FILTERS))).toBe(true);
  });

  it("is false as soon as anything is narrowed", () => {
    expect(
      isDefaultBrowseView(
        toBrowseView({ ...EMPTY_BROWSE_FILTERS, urgentOnly: true }),
      ),
    ).toBe(false);
    expect(isDefaultBrowseView(toBrowseView(EMPTY_BROWSE_FILTERS, 2))).toBe(
      false,
    );
  });

  /**
   * The ordering is part of what the server answered for, like any filter.
   *
   * Omitting it here breaks nothing the eye can see: the reader picks
   * « Urgentes d'abord », the view reads as the default one, and
   * `usePaginatedResource` restores `initialData` instead of fetching — the rows
   * stay in the old order under a control that has already moved.
   */
  it("is false for a reordering, which the server has not answered", () => {
    expect(
      isDefaultBrowseView(toBrowseView(EMPTY_BROWSE_FILTERS, 1, "urgent")),
    ).toBe(false);
    expect(
      isDefaultBrowseView(toBrowseView(EMPTY_BROWSE_FILTERS, 1, "startDate")),
    ).toBe(false);
    expect(
      isDefaultBrowseView(toBrowseView(EMPTY_BROWSE_FILTERS, 1, "recent")),
    ).toBe(true);
  });
});

describe("horizons", () => {
  it("round-trips: a horizon's bound reads back as that horizon", () => {
    expect(horizonForStart(horizonStart("MONTH"))).toBe("MONTH");
    expect(horizonForStart(horizonStart("LATER"))).toBe("LATER");
  });

  /**
   * Today and tomorrow are both « this week » to a reader asking what they could
   * take from now on, whatever the day of the week is.
   */
  it("treats a bound of today as this week", () => {
    expect(horizonForStart(horizonStart("WEEK"))).toBe("WEEK");
  });

  /**
   * A date typed by hand is not a horizon. Matching "at or before today" would
   * have lit « Cette semaine » under a bound a month in the past, which names a
   * filter the results do not have.
   */
  it("reads a bound that is not a horizon as no horizon", () => {
    expect(horizonForStart("2020-07-04")).toBe("ALL");
    expect(horizonForStart(`${horizonStart("WEEK")}x`)).toBe("ALL");
    expect(horizonForStart(undefined)).toBe("ALL");
  });
});

describe("listingBadge", () => {
  it("names an urgent posting once, for both renderings", () => {
    expect(listingBadge({ urgent: true })).toEqual({
      label: "Urgent",
      tone: "danger",
    });
    expect(listingBadge({ urgent: false })).toEqual({
      label: "Ouverte",
      tone: "info",
    });
  });
});

describe("fetchBrowseListings", () => {
  /** A transport that records the path and answers one feed page. */
  function recorder() {
    const paths: string[] = [];
    const transport: ApiTransport = async (path) => {
      paths.push(path);
      return Response.json({
        data: [
          {
            id: "l1",
            practiceId: "p1",
            practice: {
              id: "p1",
              name: "Cabinet",
              city: "Lyon",
              latitude: 45.76,
              longitude: 4.83,
            },
            title: "Remplacement",
            startDate: "2026-10-01T08:00:00.000Z",
            endDate: "2026-10-03T08:00:00.000Z",
            status: "OPEN",
            specialty: "GENERALIST",
            urgent: false,
            maxApplications: null,
            applicationsCount: 2,
            createdAt: "2026-09-01T08:00:00.000Z",
            updatedAt: "2026-09-01T08:00:00.000Z",
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    };
    return { paths, transport };
  }

  /**
   * The rows and the panels are two reads, not one.
   *
   * The panels were fetched alongside the rows, which meant every page turn and
   * every reordering asked for a distribution the filter they just changed could
   * not have touched — the facets endpoint is given no `specialty`, no `sort`
   * and no page. This pins that the rows read asks for the rows and nothing
   * else, so the panels stay where they belong: a separate read, with its own
   * trigger.
   */
  it("asks for the rows, and for nothing else", async () => {
    const { paths, transport } = recorder();

    const data = await fetchBrowseListings({ page: 1 }, transport);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe("/replacement-listings?page=1&limit=10");
    expect(data.listings).toHaveLength(1);
    expect("facets" in data).toBe(false);
  });

  it("carries the page, the ordering and the filters it is given", async () => {
    const { paths, transport } = recorder();

    await fetchBrowseListings(
      {
        specialty: "DENTIST",
        city: "Paris",
        urgentOnly: true,
        startDateFrom: "2026-10-01",
        sort: "urgent",
        page: 3,
      },
      transport,
    );

    expect(paths[0]).toContain("specialty=DENTIST");
    expect(paths[0]).toContain("city=Paris");
    expect(paths[0]).toContain("urgent=true");
    expect(paths[0]).toContain("startDateFrom=2026-10-01");
    expect(paths[0]).toContain("sort=urgent");
    expect(paths[0]).toContain("page=3");
  });

  /**
   * An aborted read is this client's decision, not the endpoint's answer.
   *
   * A page turn cancels the read the last page turn started; that cancellation
   * must surface here as a rejection the caller's guard handles, and not as a
   * page of rows the reader has already left.
   */
  it("forwards a caller's signal", async () => {
    const { paths, transport } = recorder();
    const controller = new AbortController();

    await fetchBrowseListings({}, transport, { signal: controller.signal });
    controller.abort();

    expect(paths).toHaveLength(1);
  });
});

describe("fetchListingPageOf", () => {
  it("asks for one posting, with the page size the reader pages the list with", async () => {
    const paths: string[] = [];
    const transport: ApiTransport = async (path) => {
      paths.push(path);
      return Response.json({ page: 7 });
    };

    const page = await fetchListingPageOf(
      "listing-9",
      { limit: 10 },
      transport,
    );

    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("id=listing-9");
    expect(paths[0]).toContain("limit=10");
    expect(page).toBe(7);
  });

  /**
   * The filters travel with it, because a page is a position inside the filtered
   * collection: the same posting is on page 2 of one view and page 9 of another,
   * and asking without the filters would answer for a collection the reader is
   * not looking at.
   */
  it("carries the filters and the ordering the reader is on", async () => {
    const paths: string[] = [];
    const transport: ApiTransport = async (path) => {
      paths.push(path);
      return Response.json({ page: 1 });
    };

    await fetchListingPageOf(
      "listing-9",
      { city: "Lyon", urgentOnly: true, sort: "urgent", specialty: "DENTIST" },
      transport,
    );

    expect(paths[0]).toContain("city=Lyon");
    expect(paths[0]).toContain("urgent=true");
    expect(paths[0]).toContain("sort=urgent");
    expect(paths[0]).toContain("specialty=DENTIST");
  });

  /**
   * `null` for "not in this view" and for "could not ask", which the caller acts
   * on the same way: turn to no page rather than to a wrong one.
   */
  it("reads an absent page as null", async () => {
    const transport: ApiTransport = () =>
      Promise.resolve(Response.json({ page: null }));

    expect(await fetchListingPageOf("x", {}, transport)).toBeNull();
  });

  it("reads a failed read as null rather than throwing", async () => {
    const transport: ApiTransport = () =>
      Promise.resolve(new Response("", { status: 500 }));

    expect(await fetchListingPageOf("x", {}, transport)).toBeNull();
  });
});

describe("fetchBrowsePlaces", () => {
  const place = (practiceId: string, count: number): ApiListingPlace => ({
    practiceId,
    name: `Cabinet ${practiceId}`,
    city: "Lyon",
    latitude: 45.76,
    longitude: 4.83,
    count,
    listings: [
      {
        id: `${practiceId}-l1`,
        title: "Remplacement",
        startDate: "2026-10-01T08:00:00.000Z",
        endDate: "2026-10-03T08:00:00.000Z",
      },
    ],
  });

  /** A transport that records the path, and answers one places payload. */
  function recorder(
    places: Array<ReturnType<typeof place>> = [place("p1", 3)],
  ) {
    const paths: string[] = [];
    const transport: ApiTransport = async (path) => {
      paths.push(path);
      return Response.json({
        places,
        unlocated: 2,
        totalPlaces: places.length,
        truncated: false,
      });
    };
    return { paths, transport };
  }

  it("asks for places, never for a page", async () => {
    const { paths, transport } = recorder();

    await fetchBrowsePlaces({}, transport);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe("/replacement-listings/places");
  });

  it("carries the filters, so the map shows what the list shows", async () => {
    const { paths, transport } = recorder();

    await fetchBrowsePlaces(
      {
        specialty: "DENTIST",
        city: "Paris",
        urgentOnly: true,
        startDateFrom: "2026-10-01",
      },
      transport,
    );

    expect(paths[0]).toContain("specialty=DENTIST");
    expect(paths[0]).toContain("city=Paris");
    expect(paths[0]).toContain("urgent=true");
    expect(paths[0]).toContain("startDateFrom=2026-10-01");
  });

  it("carries the ordering, so the preview follows the list", async () => {
    const { paths, transport } = recorder();

    await fetchBrowsePlaces({ sort: "urgent" }, transport);

    expect(paths[0]).toContain("sort=urgent");
  });

  it("keeps the population in `count` while previewing few", async () => {
    const { transport } = recorder();

    const data = await fetchBrowsePlaces({}, transport);

    expect(data?.places[0].count).toBe(3);
    expect(data?.places[0].listings).toHaveLength(1);
  });

  it("drops a practice with no coordinates, rather than pinning it at 0,0", async () => {
    const { transport } = recorder([
      { ...place("p1", 2), latitude: null, longitude: null },
    ]);

    const data = await fetchBrowsePlaces({}, transport);

    expect(data?.places).toHaveLength(0);
    expect(data?.unlocated).toBe(2);
  });

  it("reads a failure as null, so the caller keeps the pins it had", async () => {
    const transport: ApiTransport = () =>
      Promise.resolve(new Response("", { status: 500 }));

    const data = await fetchBrowsePlaces({}, transport);

    // Not an empty set. An empty set is what "the filters matched nothing" looks
    // like, and returning it for a failed refresh meant a 429 or a dropped
    // connection blanked the map while the reader was told nothing.
    expect(data).toBeNull();
  });

  it("reads an empty collection as an empty set, not as a failure", async () => {
    const { transport } = recorder([]);

    const data = await fetchBrowsePlaces({}, transport);

    // The distinction the caller acts on: an empty collection is a result to
    // apply, a failed read is null and leaves the pins alone.
    expect(data).not.toBeNull();
    expect(data?.places).toEqual([]);
  });
});

/**
 * The URL boundary: a view read off the query string and written back to it.
 *
 * These two are the halves of one contract, and the tests that matter are the
 * round-trips — a value written must read back as the same view, or the screen
 * and the URL drift apart with nothing to catch it. `/listings` is built on this:
 * `page.tsx` parses the URL server-side, the client reads the same string, and a
 * shared link has to open exactly the view it was made from.
 */
describe("browseViewFromParams", () => {
  it("reads an empty query as the default view", () => {
    const { filters, page, sort } = browseViewFromParams(new URLSearchParams());

    expect(filters).toEqual(EMPTY_BROWSE_FILTERS);
    expect(page).toBe(1);
    expect(sort).toBe("recent");
  });

  it("reads every filter, the page and the ordering", () => {
    const params = new URLSearchParams({
      specialty: "DENTIST",
      city: "Lyon",
      from: "2026-10-01",
      to: "2026-10-31",
      urgent: "true",
      page: "3",
      sort: "urgent",
    });

    const { filters, page, sort } = browseViewFromParams(params);

    expect(filters).toEqual({
      specialty: "DENTIST",
      city: "Lyon",
      from: "2026-10-01",
      to: "2026-10-31",
      urgentOnly: true,
    });
    expect(page).toBe(3);
    expect(sort).toBe("urgent");
  });

  /**
   * The value comes off the query string, so it is attacker- and accident-shaped.
   * An unknown specialty is not a filter to send — it is dropped, and the feed
   * reads as « toutes spécialités » rather than as a 400. A prototype key is not
   * a specialty either: `"toString"` would pass an `in` check and must not.
   */
  it("drops a specialty that is not one of the specialties", () => {
    expect(
      browseViewFromParams(new URLSearchParams({ specialty: "WIZARDRY" }))
        .filters.specialty,
    ).toBe("");
    expect(
      browseViewFromParams(new URLSearchParams({ specialty: "toString" }))
        .filters.specialty,
    ).toBe("");
  });

  /**
   * `page` is a number the pagination is divided by. A fractional, negative or
   * non-numeric page reads as page 1 rather than as a broken feed — the reader
   * typed the URL, and the safe reading of a bad page is the first one.
   */
  it("reads a page that is not a positive integer as page 1", () => {
    expect(browseViewFromParams(new URLSearchParams({ page: "0" })).page).toBe(
      1,
    );
    expect(browseViewFromParams(new URLSearchParams({ page: "-2" })).page).toBe(
      1,
    );
    expect(
      browseViewFromParams(new URLSearchParams({ page: "2.5" })).page,
    ).toBe(1);
    expect(
      browseViewFromParams(new URLSearchParams({ page: "abc" })).page,
    ).toBe(1);
  });

  it("reads an unknown ordering as the default one", () => {
    expect(
      browseViewFromParams(new URLSearchParams({ sort: "sideways" })).sort,
    ).toBe("recent");
  });

  /**
   * The shape alone is not a date. A `<input type="date">` never produces
   * « 2026-13-40 », but a hand-edited URL can, and an impossible bound handed to
   * the feed reads as a request that matched nothing.
   */
  it("drops a date that is shaped like one but is not a real day", () => {
    expect(
      browseViewFromParams(new URLSearchParams({ from: "2026-02-30" })).filters
        .from,
    ).toBe("");
    expect(
      browseViewFromParams(new URLSearchParams({ to: "nope" })).filters.to,
    ).toBe("");
  });

  it("reads a missing `urgent` as false, and only `true` as true", () => {
    expect(
      browseViewFromParams(new URLSearchParams({ urgent: "false" })).filters
        .urgentOnly,
    ).toBe(false);
    expect(
      browseViewFromParams(new URLSearchParams({ urgent: "true" })).filters
        .urgentOnly,
    ).toBe(true);
  });
});

describe("browseViewToParams", () => {
  it("writes the default view as an empty query, not as a row of defaults", () => {
    expect(
      browseViewToParams(EMPTY_BROWSE_FILTERS, 1, "recent").toString(),
    ).toBe("");
  });

  it("writes only what is narrowed", () => {
    const query = browseViewToParams(
      { ...EMPTY_BROWSE_FILTERS, city: "Lyon" },
      1,
      "recent",
    );

    expect(query.get("city")).toBe("Lyon");
    expect(query.has("specialty")).toBe(false);
    expect(query.has("page")).toBe(false);
    expect(query.has("sort")).toBe(false);
  });

  it("writes the page and the ordering only when they are not the default", () => {
    expect(
      browseViewToParams(EMPTY_BROWSE_FILTERS, 1, "recent").has("page"),
    ).toBe(false);
    expect(
      browseViewToParams(EMPTY_BROWSE_FILTERS, 4, "recent").get("page"),
    ).toBe("4");
    expect(
      browseViewToParams(EMPTY_BROWSE_FILTERS, 1, "urgent").get("sort"),
    ).toBe("urgent");
  });
});

/**
 * The round-trip is the contract that matters most here: the server parses the
 * URL, the client reads the same string, and the two have to agree on the view.
 * A value that does not survive the round-trip is a screen and a URL that drift.
 */
describe("browse view round-trips through the URL", () => {
  it("reads back the view it was written from", () => {
    const written = browseViewToParams(
      {
        specialty: "DENTIST",
        city: "Lyon",
        from: "2026-10-01",
        to: "2026-10-31",
        urgentOnly: true,
      },
      3,
      "urgent",
    );

    const { filters, page, sort } = browseViewFromParams(
      new URLSearchParams(written.toString()),
    );

    expect(filters).toEqual({
      specialty: "DENTIST",
      city: "Lyon",
      from: "2026-10-01",
      to: "2026-10-31",
      urgentOnly: true,
    });
    expect(page).toBe(3);
    expect(sort).toBe("urgent");
  });

  it("round-trips the default view to an empty query and back", () => {
    const written = browseViewToParams(EMPTY_BROWSE_FILTERS, 1, "recent");

    expect(written.toString()).toBe("");
    const { filters, page, sort } = browseViewFromParams(written);
    expect(filters).toEqual(EMPTY_BROWSE_FILTERS);
    expect(page).toBe(1);
    expect(sort).toBe("recent");
  });

  /**
   * The invariant the whole screen leans on: whatever the URL parses to, feeding
   * it back through `toBrowseView` must give a view `usePaginatedResource`
   * recognises — or `seedFromServer` would adopt rows for a view the server was
   * never asked for. The default query must read as the default view.
   */
  it("parses the default query to the view the server answered", () => {
    const { filters, page, sort } = browseViewFromParams(new URLSearchParams());

    expect(isDefaultBrowseView(toBrowseView(filters, page, sort))).toBe(true);
  });
});
