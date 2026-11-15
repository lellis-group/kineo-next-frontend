import { describe, expect, test } from "bun:test";
import { SPECIALTY_LABELS } from "../profile";
import { REPLACEMENT_LISTING_STATUSES } from "../types/api";
import {
  adaptFacetsRail,
  adaptMyListingsRail,
  SPECIALTY_RAIL_ROWS,
} from "./adapters";
import type { ListingStatusCounts, MyListing } from "./contracts";

type FacetRow = {
  specialty: keyof typeof SPECIALTY_LABELS;
  label: string;
  count: number;
  percent: number;
};

function listing(patch: Partial<MyListing> = {}): MyListing {
  return {
    id: "l1",
    title: "Remplacement",
    status: "OPEN",
    specialty: "GENERALIST",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    urgent: false,
    applicationsCount: 0,
    createdAt: "2025-12-01T00:00:00.000Z",
    ...patch,
  };
}

function counts(patch: Partial<ListingStatusCounts> = {}): ListingStatusCounts {
  const zero = Object.fromEntries(
    [...REPLACEMENT_LISTING_STATUSES, "total"].map((status) => [status, 0]),
  ) as ListingStatusCounts;
  return { ...zero, ...patch };
}

const SPECIALTIES = Object.keys(SPECIALTY_LABELS) as Array<
  keyof typeof SPECIALTY_LABELS
>;

function facetRows(count: number): FacetRow[] {
  return SPECIALTIES.slice(0, count).map((specialty, index) => ({
    specialty,
    label: `Label ${specialty}`,
    count: index + 1,
    percent: 0,
  }));
}

/**
 * Synthetic rows: the API enum has as many specialties as the rail draws, so
 * the fold only shows up once the enum grows.
 */
function syntheticRows(labels: string[]): FacetRow[] {
  return labels.map((specialty, index) => ({
    specialty,
    label: `Label ${specialty}`,
    count: index + 1,
    percent: 0,
  })) as unknown as FacetRow[];
}

describe("adaptFacetsRail", () => {
  test("marks the active row and keeps it inside the top rows", () => {
    const rows = facetRows(SPECIALTY_RAIL_ROWS);
    const active = rows.at(-1);
    const rail = adaptFacetsRail(
      { total: 100, urgent: 25, bySpecialty: rows },
      active?.specialty ?? "",
    );

    expect(rail.rows).toHaveLength(rows.length);
    expect(rail.rows.filter((row) => row.active)).toHaveLength(1);
    expect(rail.rows.at(-1)?.specialty).toBe(active?.specialty);
  });

  test("keeps an active row outside the top slice", () => {
    // One row more than the rail draws: the last one can only appear because
    // the filter selects it.
    const rows = syntheticRows(["S1", "S2", "S3", "S4", "S5", "S6"]);
    const folded = rows.at(-1) as FacetRow;
    const rail = adaptFacetsRail(
      { total: 100, urgent: 25, bySpecialty: rows },
      folded.specialty,
    );

    expect(rail.rows).toHaveLength(SPECIALTY_RAIL_ROWS + 1);
    expect(rail.rows.at(-1)).toMatchObject({
      specialty: folded.specialty,
      active: true,
    });
  });

  test("adds up the listings hidden behind the fold", () => {
    const rows = syntheticRows(["S1", "S2", "S3", "S4", "S5", "S6"]);
    const rail = adaptFacetsRail(
      { total: 100, urgent: 25, bySpecialty: rows },
      "",
    );

    expect(rail.foldedSpecialties).toBe(1);
    expect(rail.foldedCount).toBe(6);
  });

  test("counts the non-urgent listings as open, and rounds the share", () => {
    const rail = adaptFacetsRail({ total: 3, urgent: 1, bySpecialty: [] }, "");

    expect(rail.open).toBe(2);
    expect(rail.urgentPercent).toBe(33);
  });

  test("survives an empty collection", () => {
    const rail = adaptFacetsRail(
      { total: 0, urgent: 0, bySpecialty: [] },
      "GENERALIST",
    );

    expect(rail).toMatchObject({
      open: 0,
      urgentPercent: 0,
      rows: [],
      foldedCount: 0,
      foldedSpecialties: 0,
    });
  });
});

describe("adaptMyListingsRail", () => {
  test("sums the page's candidates and urgent listings", () => {
    const rail = adaptMyListingsRail(
      [
        listing({ applicationsCount: 2, urgent: true }),
        listing({ applicationsCount: 3 }),
      ],
      counts({ OPEN: 2, total: 2 }),
    );

    expect(rail.activeCandidates).toBe(5);
    expect(rail.urgent).toBe(1);
    expect(rail.recruiting).toBe(2);
    expect(rail.recruitingPercent).toBe(100);
  });

  test("drops statuses the collection does not hold", () => {
    const rail = adaptMyListingsRail(
      [listing()],
      counts({ OPEN: 1, total: 1 }),
    );

    expect(rail.statusRows.map((row) => row.status)).toEqual(["OPEN"]);
  });

  test("orders the specialty bars by count", () => {
    const rail = adaptMyListingsRail(
      [
        listing({ specialty: "GENERALIST" }),
        listing({ specialty: "DENTIST" }),
        listing({ specialty: "DENTIST" }),
      ],
      counts({ OPEN: 3, total: 3 }),
    );

    expect(rail.specialtyBars[0]).toMatchObject({ key: "DENTIST", count: 2 });
  });

  test("reads the recruiting total from the server counts, not the page", () => {
    const rail = adaptMyListingsRail(
      [listing()],
      counts({ OPEN: 2, FULL: 1, total: 10 }),
    );

    expect(rail.recruitingTotal).toBe(3);
    expect(rail.filledPercent).toBe(0);
  });
});
