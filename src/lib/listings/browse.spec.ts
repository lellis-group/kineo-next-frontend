import { describe, expect, it } from "bun:test";
import type { ApiListingPlace } from "@/lib/types/api";
import type { ApiTransport } from "../api-client";
import { toIsoDayBound } from "../format";
import { adaptFacets } from "./browse-adapters";
import {
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
