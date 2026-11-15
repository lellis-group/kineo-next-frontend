import { describe, expect, test } from "bun:test";
import { formatDurationDays, formatRelativeTime } from "./format";

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

describe("formatDurationDays", () => {
  test("counts both ends of the period", () => {
    expect(formatDurationDays("2027-02-15", "2027-02-22")).toBe("8 jours");
  });

  test("reads ISO instants as their calendar day", () => {
    expect(
      formatDurationDays(
        "2027-02-15T00:00:00.000Z",
        "2027-02-15T23:59:59.000Z",
      ),
    ).toBe("1 jour");
  });
});
