import { describe, expect, test } from "bun:test";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  test("keeps an internal path, query and hash included", () => {
    expect(safeInternalPath("/profile")).toBe("/profile");
    expect(safeInternalPath("/listings?page=2#top")).toBe(
      "/listings?page=2#top",
    );
  });

  test("falls back to / when there is nothing to keep", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
  });

  test("refuses every spelling of another host", () => {
    for (const raw of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
    ]) {
      expect(safeInternalPath(raw)).toBe("/");
    }
  });
});
