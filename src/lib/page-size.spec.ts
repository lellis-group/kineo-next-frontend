import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_CHOICES,
  PAGE_SIZE_COOKIE,
  pageSizeCookie,
  readPageSize,
} from "./page-size";

describe("readPageSize", () => {
  test("accepts every size on the list", () => {
    for (const size of PAGE_SIZE_CHOICES) {
      expect(readPageSize(String(size))).toBe(size);
    }
  });

  test("falls back on anything the list does not carry", () => {
    // Only sizes on the list reach `?limit=`.
    for (const raw of ["0", "37", "1000", "-10", "abc", "", undefined]) {
      expect(readPageSize(raw), String(raw)).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  test("reads a size written with its percent-encoding intact", () => {
    expect(readPageSize(encodeURIComponent("50"))).toBe(50);
  });

  test("does not treat 100 as a prefix of 1000", () => {
    expect(readPageSize("1000")).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("pageSizeCookie", () => {
  test("namespaces the cookie the page reads back", () => {
    expect(pageSizeCookie(50)).toContain(`${PAGE_SIZE_COOKIE}=50`);
  });

  test("persists a chosen size, and only a chosen one", () => {
    expect(pageSizeCookie(50)).toContain("Max-Age=");
    expect(pageSizeCookie(DEFAULT_PAGE_SIZE)).not.toContain("Max-Age=");
  });
});
