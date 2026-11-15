import { describe, expect, test } from "bun:test";
import type { ApplicationEntry } from "../applications";
import { COUNT_KEYS, zeroCounts } from "../counts";
import type { ApiApplicationStatusCounts } from "../types/api";
import { ACTIVITY_FEED_SIZE, adaptActivity } from "./activity";
import { adaptNextReplacement } from "./next-replacement";
import { adaptReactivity } from "./response-rate";

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

describe("adaptNextReplacement", () => {
  test("names the posting the server picked as the next one, with its page", () => {
    const next = adaptNextReplacement({
      nextRecruitingListing: {
        id: "soon",
        title: "Annonce soon",
        startDate: "2026-11-01T00:00:00.000Z",
        endDate: "2026-11-05T00:00:00.000Z",
      },
    });

    expect(next.title).toBe("Annonce soon");
    expect(next.href).toBe("/listings/mine/soon");
    expect(next.period).not.toBeNull();
  });

  test("says nothing is coming when the server found nothing", () => {
    const next = adaptNextReplacement({ nextRecruitingListing: null });

    expect(next.period).toBeNull();
    expect(next.href).toBeUndefined();
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

  test("carries the server's count of applications no practice has opened", () => {
    const { unseen } = adaptReactivity({
      counts: applicationCounts({ total: 9, PENDING: 3 }),
      respondedCount: 0,
      unseenOpenCount: 2,
    });
    expect(unseen).toBe(2);
  });

  test("reads a missing counter as none", () => {
    const { unseen } = adaptReactivity({
      counts: applicationCounts({ total: 9, PENDING: 3 }),
      respondedCount: 0,
    });
    expect(unseen).toBe(0);
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
