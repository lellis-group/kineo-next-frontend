import { describe, expect, test } from "bun:test";
import { LISTING_STATUS_META } from "@/lib/listings";
import { STATUS_MARKS } from "./my-listings-rail";

describe("STATUS_MARKS", () => {
  test("covers exactly the statuses the meta table carries", () => {
    expect(Object.keys(STATUS_MARKS).sort()).toEqual(
      Object.keys(LISTING_STATUS_META).sort(),
    );
  });

  test("gives every status something to draw", () => {
    for (const status of Object.keys(LISTING_STATUS_META)) {
      expect(
        typeof STATUS_MARKS[status as keyof typeof STATUS_MARKS],
        status,
      ).toBe("function");
    }
  });
});
