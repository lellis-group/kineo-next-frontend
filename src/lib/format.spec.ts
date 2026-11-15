import { describe, expect, test } from "bun:test";
import { formatRelativeTime } from "./format";

const ago = (hours: number) =>
  new Date(Date.now() - hours * 3_600_000).toISOString();

describe("formatRelativeTime", () => {
  test("agrees in number with a single hour or week", () => {
    expect(formatRelativeTime(ago(1))).toBe("il y a 1 heure");
    expect(formatRelativeTime(ago(8 * 24))).toBe("il y a 1 semaine");
  });

  test("keeps the plural above one", () => {
    expect(formatRelativeTime(ago(3))).toBe("il y a 3 heures");
    expect(formatRelativeTime(ago(15 * 24))).toBe("il y a 2 semaines");
  });
});
