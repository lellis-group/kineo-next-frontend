import { describe, expect, it } from "bun:test";
import type { ApiReplacementListing } from "@/lib/types/api";
import type { ApiTransport } from "../api-client";
import { toIsoDayBound } from "../format";
import { adaptFacets, groupByLocation } from "./browse-adapters";
import type { BrowseListing } from "./browse-contracts";
import {
  EMPTY_BROWSE_FILTERS,
  horizonForStart,
  horizonStart,
  isDefaultBrowseView,
  listingBadge,
  toBrowseView,
} from "./browse-contracts";
import { BROWSE_MAP_LIMIT, fetchBrowseLocations } from "./browse-service";

/** A posting as the API sends it, with only the fields these tests read. */
function apiListing(over: Partial<ApiReplacementListing> = {}) {
  return {
    id: "l1",
    practiceId: "p1",
    practice: {
      id: "p1",
      name: "Cabinet",
      city: "Lyon",
      latitude: 45.764,
      longitude: 4.8357,
    },
    title: "Remplacement",
    startDate: "2026-10-01T08:00:00.000Z",
    endDate: "2026-10-03T08:00:00.000Z",
    status: "OPEN",
    specialty: "GENERALIST",
    urgent: false,
    applicationsCount: 0,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...over,
  } as ApiReplacementListing;
}

/** A posting, with only the fields these functions read. */
function listing(over: Partial<BrowseListing> = {}): BrowseListing {
  return {
    id: "l1",
    title: "Remplacement",
    dateRange: "Du 1 au 3 oct.",
    startDate: "2026-10-01T08:00:00.000Z",
    endDate: "2026-10-03T08:00:00.000Z",
    specialty: "GENERALIST",
    urgent: false,
    practiceName: "Cabinet",
    city: "Lyon",
    location: { latitude: 45.764, longitude: 4.8357 },
    applicationsCount: 0,
    createdAt: "2026-09-01T08:00:00.000Z",
    ...over,
  };
}

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

describe("groupByLocation", () => {
  it("drops postings with no coordinates", () => {
    const places = groupByLocation([
      listing({ id: "a" }),
      listing({ id: "b", location: null }),
    ]);

    expect(places).toHaveLength(1);
    expect(places[0].listings.map((l) => l.id)).toEqual(["a"]);
  });

  /**
   * The reason this function exists: one practice publishing several openings
   * would otherwise stack several buttons on one pixel, and only the topmost
   * could be clicked.
   */
  it("gathers the postings that share a place", () => {
    const places = groupByLocation([
      listing({ id: "a" }),
      listing({ id: "b" }),
      listing({ id: "c", location: { latitude: 48.85, longitude: 2.35 } }),
    ]);

    expect(places).toHaveLength(2);
    expect(places[0].listings).toHaveLength(2);
    expect(places[0].listings.map((l) => l.id)).toEqual(["a", "b"]);
  });

  /**
   * Grid bucketing, so the guarantee is "the same hundred-metre cell", not "any
   * two nearby points". Two points eighty metres apart can still straddle a cell
   * boundary and get a pin each — which is why the key rounds rather than
   * comparing exactly, and why two spellings of the same address merge.
   */
  it("merges two spellings of one address", () => {
    const places = groupByLocation([
      listing({ id: "a", location: { latitude: 45.7641, longitude: 4.8357 } }),
      listing({ id: "b", location: { latitude: 45.7642, longitude: 4.8357 } }),
    ]);

    expect(places).toHaveLength(1);
    expect(places[0].listings).toHaveLength(2);
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

describe("fetchBrowseLocations", () => {
  /** A transport that records the path it was called with. */
  function recorder(pages = 1) {
    const paths: string[] = [];
    const transport: ApiTransport = async (path) => {
      paths.push(path);
      return Response.json({
        data: Array.from({ length: pages }, (_, i) =>
          apiListing({ id: `l${i}` }),
        ),
        meta: { total: pages, page: 1, limit: BROWSE_MAP_LIMIT, pages: 1 },
      });
    };
    return { paths, transport };
  }

  /**
   * The map asks for a page of a hundred and never asks for a second one.
   *
   * These are the two halves of the same promise: not the page under the reader,
   * and not a page at all. The first is what made the map redraw itself whenever
   * the list paginated; the second would make it a list too.
   */
  it("asks for the whole collection, not for a page", async () => {
    const { paths, transport } = recorder();

    await fetchBrowseLocations({}, transport);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain(`limit=${BROWSE_MAP_LIMIT}`);
    expect(paths[0]).toContain("page=1");
  });

  it("carries the filters, so the map shows what the list shows", async () => {
    const { paths, transport } = recorder();

    await fetchBrowseLocations(
      { specialty: "DENTIST", city: "Paris", urgentOnly: true },
      transport,
    );

    expect(paths[0]).toContain("specialty=DENTIST");
    expect(paths[0]).toContain("city=Paris");
    expect(paths[0]).toContain("urgent=true");
  });

  it("adapts the rows, so the popup can name the post behind a pin", async () => {
    const { transport } = recorder(2);

    const listings = await fetchBrowseLocations({}, transport);

    expect(listings).toHaveLength(2);
    expect(listings[0]).toEqual({
      id: "l0",
      title: "Remplacement",
      dateRange: "Du 1 au 3 oct.",
      startDate: "2026-10-01T08:00:00.000Z",
      endDate: "2026-10-03T08:00:00.000Z",
      specialty: "GENERALIST",
      urgent: false,
      practiceName: "Cabinet",
      city: "Lyon",
      location: { latitude: 45.764, longitude: 4.8357 },
      applicationsCount: 0,
      createdAt: "2026-09-01T08:00:00.000Z",
    });
  });

  /**
   * A 404 is an empty collection; every other failure is left to the caller.
   *
   * The container catches and keeps the pins it already has, which is the only
   * sensible response to a refresh that failed — a blank map is a louder lie than
   * pins a few seconds old. That decision belongs to whoever has the pins to
   * keep, not inside a function whose job is to report what the backend said.
   */
  it("reads a 404 as no locations, and lets other failures throw", async () => {
    const gone: ApiTransport = () =>
      Promise.resolve(new Response("", { status: 404 }));
    const broken: ApiTransport = () =>
      Promise.resolve(new Response("", { status: 500 }));

    expect(await fetchBrowseLocations({}, gone)).toEqual([]);
    expect(fetchBrowseLocations({}, broken)).rejects.toThrow();
  });
});
