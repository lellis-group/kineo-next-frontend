import { describe, expect, it } from "bun:test";
import { rowEnterStyle } from "./row-enter";

/** Reads the custom property back off the returned style object. */
function delayOf(index: number): string {
  return (rowEnterStyle(index) as Record<string, string>)["--row-delay"];
}

describe("rowEnterStyle", () => {
  it("staggers by rank", () => {
    expect(delayOf(0)).toBe("0ms");
    expect(delayOf(3)).toBe("78ms");
  });

  it("caps, so the last row of a long page is not held back", () => {
    // The cap is the reason the helper exists: at a fixed 26 ms per rank a
    // twenty-row page would delay its last row by 494 ms — longer than the
    // fade itself, so the reader watches the table fill in top-down.
    expect(delayOf(10)).toBe("260ms");
    expect(delayOf(19)).toBe("260ms");
    expect(delayOf(1000)).toBe("260ms");
  });

  it("never produces a negative delay", () => {
    // A negative `animation-delay` is valid CSS and replays the animation as if
    // it had already been running, which lands a row mid-fade on first paint.
    expect(delayOf(-1)).toBe("0ms");
  });

  it("returns a fresh object, not a shared one", () => {
    // These become React `style` props; a shared mutable object is one caller
    // away from configuring every row at once.
    const first = rowEnterStyle(1);
    expect(rowEnterStyle(1)).not.toBe(first);
    expect(rowEnterStyle(1)).toEqual(first);
  });
});
