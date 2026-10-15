import { describe, expect, it } from "bun:test";
import { shouldAdoptCommitted } from "./use-committed-input";

describe("shouldAdoptCommitted", () => {
  it("ignores the echo of the field's own commit", () => {
    // The reader committed "marseill", kept typing, and the navigation just
    // landed with the value they sent. The draft ("marseille") is newer and
    // must survive; the timer re-commits it.
    expect(shouldAdoptCommitted("marseill", "marseill")).toBe(false);
  });

  it("adopts a reset that lands while the reader is typing", () => {
    // « Réinitialiser » clears the URL to "" — nothing the field sent — so
    // the box must clear too, even mid-burst.
    expect(shouldAdoptCommitted("", "marseill")).toBe(true);
  });

  it("adopts the back button walking to another view", () => {
    // The arriving value is one the field never sent: external news.
    expect(shouldAdoptCommitted("lyon", "marseill")).toBe(true);
  });

  it("adopts the first value when nothing was ever sent", () => {
    expect(shouldAdoptCommitted("", null)).toBe(true);
    expect(shouldAdoptCommitted("lyon", null)).toBe(true);
  });
});
