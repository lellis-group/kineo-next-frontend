import { describe, expect, test } from "bun:test";
import { FRANCE, homeRegion } from "./home-region";

describe("homeRegion", () => {
  test("opens on the profile's city, longitude first", () => {
    const region = homeRegion({
      coordinates: { latitude: 44.84, longitude: -0.58 },
      timeZone: "Indian/Reunion",
    });
    expect(region.center).toEqual([-0.58, 44.84]);
  });

  test("reads an overseas department off the time zone", () => {
    const region = homeRegion({ timeZone: "Indian/Reunion" });
    expect(region.center[0]).toBeCloseTo(55.53);
  });

  test("falls back to mainland France for an unknown or missing zone", () => {
    expect(homeRegion({ timeZone: "Asia/Tokyo" })).toBe(FRANCE);
    expect(homeRegion({})).toBe(FRANCE);
  });

  test("keeps mainland France inside France", () => {
    const [longitude, latitude] = FRANCE.center;
    expect(longitude).toBeGreaterThan(-5);
    expect(longitude).toBeLessThan(10);
    expect(latitude).toBeGreaterThan(41);
    expect(latitude).toBeLessThan(52);
  });
});
