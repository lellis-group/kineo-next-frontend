import { describe, expect, test } from "bun:test";
import { REPLACEMENT_LISTING_STATUSES } from "../types/api";
import {
  LISTING_STATUS_META,
  LISTING_STATUS_ORDER,
  RECRUITING_STATUSES,
} from "./contracts";

describe("LISTING_STATUS_META", () => {
  test("covers the statuses the API can send, and nothing else", () => {
    expect(Object.keys(LISTING_STATUS_META).sort()).toEqual(
      [...REPLACEMENT_LISTING_STATUSES].sort(),
    );
  });

  test("orders the statuses the way a listing moves through them", () => {
    expect(LISTING_STATUS_ORDER).toEqual([...REPLACEMENT_LISTING_STATUSES]);
  });

  test("gives every status a short label narrower than its full one", () => {
    for (const [status, meta] of Object.entries(LISTING_STATUS_META)) {
      expect(meta.shortLabel.length, status).toBeLessThanOrEqual(
        meta.label.length,
      );
      expect(meta.shortLabel.length, status).toBeGreaterThan(0);
    }
  });

  test("derives the recruiting set from the rows, not from a second list", () => {
    const expected = REPLACEMENT_LISTING_STATUSES.filter(
      (s) => LISTING_STATUS_META[s].recruiting,
    );
    expect([...RECRUITING_STATUSES].sort()).toEqual([...expected].sort());
  });

  test("counts a listing that can still receive an application as recruiting", () => {
    expect(RECRUITING_STATUSES.has("OPEN")).toBe(true);
    expect(RECRUITING_STATUSES.has("IN_DISCUSSION")).toBe(true);
    expect(RECRUITING_STATUSES.has("FULL")).toBe(true);
    expect(RECRUITING_STATUSES.has("FILLED")).toBe(false);
    expect(RECRUITING_STATUSES.has("CANCELLED")).toBe(false);
  });
});
