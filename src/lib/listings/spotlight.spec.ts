import { describe, expect, it } from "bun:test";
import { spotlightClass } from "./spotlight";

describe("spotlightClass", () => {
  it("leaves every row but the picked one alone", () => {
    const spotlight = { id: "l1", nonce: 1, fromPage: 1 };

    expect(spotlightClass(spotlight, "l2")).toBeUndefined();
    expect(spotlightClass(null, "l1")).toBeUndefined();
  });

  it("alternates the sheen keyframe on each pick", () => {
    // The shared class keeps the outline lit; the modifier is what restarts the
    // sweep when the same posting is picked twice.
    expect(spotlightClass({ id: "l1", nonce: 1, fromPage: 1 }, "l1")).toBe(
      "row-spotlight row-spotlight-b",
    );
    expect(spotlightClass({ id: "l1", nonce: 2, fromPage: 1 }, "l1")).toBe(
      "row-spotlight row-spotlight-a",
    );
  });
});
