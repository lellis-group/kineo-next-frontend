import { describe, expect, test } from "bun:test";
import type { ApplicationEntry } from "../applications";
import {
  COUNT_KEYS,
  zeroCounts,
  zeroCounts as zeroListingCounts,
} from "../counts";
import type { MyListingsData } from "../listings";
import type { ApiApplicationStatusCounts } from "../types/api";
import { ACTIVITY_FEED_SIZE, adaptActivity } from "./activity";
import { adaptReactivity } from "./response-rate";
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

const stat = (stats: ReturnType<typeof adaptStats>, id: string) =>
  stats.find((entry) => entry.id === id);

describe("adaptStats", () => {
  const listings = (
    counts: MyListingsData["counts"],
    nextRecruitingListing: MyListingsData["nextRecruitingListing"] = null,
  ) =>
    ({
      listings: [],
      counts,
      page: 1,
      totalPages: 1,
      total: 0,
      nextRecruitingListing,
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
    // 31 OPEN postings exist; the page holds one.
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

  test("names the posting the server picked as the next one", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 3, OPEN: 2 }), {
        id: "soon",
        title: "Annonce soon",
        startDate: "2026-11-01T00:00:00.000Z",
        endDate: "2026-11-05T00:00:00.000Z",
      }),
      applications(applicationCounts({ total: 0 })),
    );

    expect(stat(stats, "next-replacement")?.detail).toBe("Annonce soon");
    expect(stat(stats, "next-replacement")?.value).not.toBe("Aucun");
  });

  test("says « Aucun » when the server found nothing coming", () => {
    const stats = adaptStats(
      listings(listingCounts({ total: 1, OPEN: 1 }), null),
      applications(applicationCounts({ total: 0 })),
    );

    expect(stat(stats, "next-replacement")?.value).toBe("Aucun");
  });
});

describe("adaptReactivity", () => {
  test("divides answered applications by the answerable ones", () => {
    const { rate, figures } = adaptReactivity({
      counts: applicationCounts({
        total: 10,
        PENDING: 2,
        SHORTLISTED: 1,
        ACCEPTED: 3,
        WITHDRAWN: 2,
      }),
      respondedCount: 4,
    });

    expect(rate).toBe(50); // 4 of 8, not 4 of 10
    expect(figures.map((figure) => figure.value)).toEqual([
      "10",
      "3",
      "3",
      "0",
    ]);
  });

  test("hands the gauge the same rate, and says what it is of", () => {
    const reactivity = adaptReactivity({
      counts: applicationCounts({ total: 10, WITHDRAWN: 2 }),
      respondedCount: 4,
    });

    expect(reactivity.rate).toBe(50);
    expect(reactivity.rateCaption).toBe("4 réponses sur 8 candidatures");
  });

  test("reports no rate rather than a division by zero", () => {
    const { rate } = adaptReactivity({
      counts: applicationCounts({ total: 0 }),
      respondedCount: 0,
    });

    expect(rate).toBe(0);
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
    const [first] = adaptActivity([entry("1")]);
    expect(first?.message[1]?.text).toBe("Annonce 1");
  });

  test("carries the status chip and the listing's practice", () => {
    const [first] = adaptActivity([
      entry("1", {
        status: "ACCEPTED",
        listing: {
          id: "l-1",
          title: "Annonce 1",
          practiceName: "Cabinet des Pins",
          practiceCity: "Bordeaux",
        },
      }),
    ]);

    expect(first?.status).toEqual({ label: "Acceptée", tone: "success" });
    expect(first?.place).toBe("Cabinet des Pins · Bordeaux");
  });

  test("leaves the place out rather than printing an empty one", () => {
    const [first] = adaptActivity([entry("1")]);
    expect(first?.place).toBeUndefined();
  });
});
