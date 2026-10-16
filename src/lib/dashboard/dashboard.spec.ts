import { describe, expect, test } from "bun:test";
import type { ApplicationEntry } from "../applications";
import {
  COUNT_KEYS,
  zeroCounts,
  zeroCounts as zeroListingCounts,
} from "../counts";
import type { MyListing, MyListingsData } from "../listings";
import type { ApiApplicationStatusCounts } from "../types/api";
import { ACTIVITY_FEED_SIZE, adaptActivity } from "./activity";
import { adaptReactivity } from "./reactivity";
import { adaptStats } from "./stats";

const listingCounts = (
  partial: Partial<MyListingsData["counts"]>,
): MyListingsData["counts"] => ({
  ...zeroListingCounts(0, COUNT_KEYS.listingStatus),
  ...partial,
});

const applicationCounts = (
  partial: Partial<ApiApplicationStatusCounts>,
): ApiApplicationStatusCounts => ({
  ...zeroCounts(0, COUNT_KEYS.applicationStatus),
  ...partial,
});

const entry = (id: string, over: Partial<ApplicationEntry> = {}) =>
  ({
    id,
    status: "PENDING",
    decisionSource: null,
    createdAt: "2026-10-01T08:00:00.000Z",
    submittedLabel: "Postulé hier",
    viewed: true,
    rejectionBucket: null,
    listing: { id: `l-${id}`, title: `Annonce ${id}` },
    ...over,
  }) satisfies ApplicationEntry;

const listing = (id: string, over: Partial<MyListing> = {}) =>
  ({
    id,
    title: `Annonce ${id}`,
    status: "OPEN",
    specialty: "GENERALIST",
    startDate: "2026-12-01T00:00:00.000Z",
    endDate: "2026-12-05T00:00:00.000Z",
    urgent: false,
    applicationsCount: 0,
    createdAt: "2026-10-01T08:00:00.000Z",
    ...over,
  }) satisfies MyListing;

const stat = (stats: ReturnType<typeof adaptStats>, id: string) =>
  stats.find((entry) => entry.id === id);

describe("adaptStats", () => {
  const listings = (counts: MyListingsData["counts"], rows: MyListing[] = []) =>
    ({
      listings: rows,
      counts,
      page: 1,
      totalPages: 1,
      total: 0,
    }) satisfies MyListingsData;

  const applications = (counts: ApiApplicationStatusCounts, over = {}) =>
    ({
      total: counts.total,
      applications: [],
      pagination: { page: 1, limit: 1, totalPages: 1 },
      counts,
      bucketCounts: { PASSED_OVER: 0, POSTING_ENDED: 0, REFUSED: 0 },
      unseenOpenCount: 0,
      respondedCount: 0,
      ...over,
    }) as Parameters<typeof adaptStats>[1];

  test("counts the listings headline off the totals, whatever rows came back", () => {
    // Thirty-one OPEN postings exist; the page that came back holds one. A figure
    // read off the rows would report that one.
    const stats = adaptStats(
      listings(listingCounts({ total: 31, OPEN: 30, IN_DISCUSSION: 1 })),
      applications(applicationCounts({ total: 0 })),
    );

    expect(stat(stats, "listings")?.value).toBe("31");
    expect(stat(stats, "listings")?.detail).toContain("30 ouvertes");
  });

  test("counts a shortlisted application as still outstanding", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 0 })),
      applications(applicationCounts({ total: 5, SHORTLISTED: 2 })),
    );

    expect(stat(stats, "applications")?.value).toBe("2");
  });

  test("qualifies the total with the server's unseen counter", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 0 })),
      applications(applicationCounts({ total: 9, PENDING: 3 }), {
        unseenOpenCount: 2,
      }),
    );

    expect(stat(stats, "applications")?.detail).toContain(
      "dont 2 pas encore vues par le cabinet",
    );
  });

  test("drops the qualifier when the backend sends no counter", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 0 })),
      applications(applicationCounts({ total: 9, PENDING: 3 })),
    );

    expect(stat(stats, "applications")?.detail).toBe("3 en attente");
  });

  test("picks the soonest recruiting period, and ignores a DRAFT", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 3, OPEN: 2 }), [
        listing("late", { startDate: "2027-01-01T00:00:00.000Z" }),
        listing("soon", { startDate: "2026-11-01T00:00:00.000Z" }),
        listing("draft", {
          status: "DRAFT",
          startDate: "2026-10-05T00:00:00.000Z",
        }),
      ]),
      applications(applicationCounts({ total: 0 })),
    );

    expect(stat(stats, "next-replacement")?.detail).toBe("Annonce soon");
  });

  test("says « Aucun » rather than naming a period that has passed", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 1, OPEN: 1 }), [
        listing("past", { startDate: "2020-01-01T00:00:00.000Z" }),
      ]),
      applications(applicationCounts({ total: 0 })),
    );

    expect(stat(stats, "next-replacement")?.value).toBe("Aucun");
  });
});

describe("adaptReactivity", () => {
  test("divides answered applications by the answerable ones", () => {
    const { stats } = adaptReactivity({
      counts: applicationCounts({ total: 10, ACCEPTED: 3, WITHDRAWN: 2 }),
      respondedCount: 4,
    });

    expect(stats[0].value).toBe("50%"); // 4 of 8, not 4 of 10
    expect(stats[1].value).toBe("10");
    expect(stats[2].value).toBe("3");
  });

  test("reports no rate rather than a division by zero", () => {
    const { stats } = adaptReactivity({
      counts: applicationCounts({ total: 0 }),
      respondedCount: 0,
    });

    expect(stats[0].value).toBe("0%");
  });
});

describe("adaptActivity", () => {
  test("keeps the feed to the page the service asked for", () => {
    const feed = adaptActivity(
      Array.from({ length: ACTIVITY_FEED_SIZE + 3 }, (_, i) =>
        entry(String(i)),
      ),
    );

    expect(feed).toHaveLength(ACTIVITY_FEED_SIZE);
  });

  test("names the posting from the listing the application embeds", () => {
    // No listing map is passed in any more, and none is needed: the row carries
    // its own title, so an activity line can no longer fall back to
    // « Titre d'annonce indisponible » for a posting outside the member's page.
    const [first] = adaptActivity([entry("1")]);
    expect(first.message[1].text).toBe("Annonce 1");
  });
});
