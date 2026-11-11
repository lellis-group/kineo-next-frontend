import { describe, expect, test } from "bun:test";
import { cn } from "./cn";

describe("cn", () => {
  test("keeps a theme text size beside a text colour", () => {
    expect(cn("text-control text-muted")).toBe("text-control text-muted");
    expect(cn("text-2xs text-primary")).toBe("text-2xs text-primary");
  });

  test("lets a later size replace a theme size", () => {
    expect(cn("text-control", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
  });

  test("treats the theme radii as radii", () => {
    expect(cn("rounded-card", "rounded-full")).toBe("rounded-full");
    expect(cn("rounded-full", "rounded-control")).toBe("rounded-control");
  });
});
