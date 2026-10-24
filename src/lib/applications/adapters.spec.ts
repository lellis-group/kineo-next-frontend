import { describe, expect, it } from "bun:test";
import { countForBucket } from "./adapters";
import {
  APPLICATION_FILTERS,
  type ApplicationsData,
  type ApplicationsFilter,
} from "./contracts";

const data: ApplicationsData = {
  total: 10,
  applications: [],
  pagination: { page: 1, limit: 5, totalPages: 2 },
  counts: {
    total: 10,
    PENDING: 3,
    SHORTLISTED: 1,
    ACCEPTED: 2,
    REJECTED: 4,
    WITHDRAWN: 0,
  },
  bucketCounts: { PASSED_OVER: 1, POSTING_ENDED: 2, REFUSED: 1 },
  unseenOpenCount: 2,
  respondedCount: 6,
};

const byId = (id: ApplicationsFilter) =>
  APPLICATION_FILTERS.find((option) => option.id === id);

describe("countForBucket", () => {
  it("reads the rejected total for the « Refusées » chip", () => {
    const refused = byId("REFUSED");
    expect(refused).toBeDefined();
    if (!refused) return;
    expect(countForBucket(refused, data)).toBe(4);
  });

  it("reads each single-status bucket from its own key", () => {
    const pending = byId("PENDING");
    expect(pending).toBeDefined();
    if (!pending) return;
    expect(countForBucket(pending, data)).toBe(3);

    const accepted = byId("ACCEPTED");
    expect(accepted).toBeDefined();
    if (!accepted) return;
    expect(countForBucket(accepted, data)).toBe(2);

    const withdrawn = byId("WITHDRAWN");
    expect(withdrawn).toBeDefined();
    if (!withdrawn) return;
    expect(countForBucket(withdrawn, data)).toBe(0);
  });

  it("reads the grand total for « Toutes »", () => {
    const all = byId("ALL");
    expect(all).toBeDefined();
    if (!all) return;
    expect(countForBucket(all, data)).toBe(10);
  });
});
