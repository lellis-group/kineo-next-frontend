import { describe, expect, it } from "bun:test";
import { rowEnterStyle } from "./row-enter";

/** Reads the custom property back off the returned style object. */
function delayOf(index: number): string {
  return (rowEnterStyle(index) as Record<string, string>)["--row-delay"] ?? "";
}

describe("rowEnterStyle", () => {
  it("staggers by rank", () => {
    expect(delayOf(0)).toBe("0ms");
    expect(delayOf(3)).toBe("78ms");
  });

  it("caps, so the last row of a long page is not held back", () => {
    expect(delayOf(10)).toBe("260ms");
    expect(delayOf(19)).toBe("260ms");
    expect(delayOf(1000)).toBe("260ms");
  });

  it("never produces a negative delay", () => {
    // A negative delay would land a row mid-fade on first paint.
    expect(delayOf(-1)).toBe("0ms");
  });

  it("returns a fresh object, not a shared one", () => {
    const first = rowEnterStyle(1);
    expect(rowEnterStyle(1)).not.toBe(first);
    expect(rowEnterStyle(1)).toEqual(first);
  });
});
