import { describe, expect, it } from "bun:test";
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
