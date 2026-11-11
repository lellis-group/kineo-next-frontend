import { describe, expect, it } from "bun:test";
import {
  groupHeading,
  listingCount,
  shortReference,
  unlistedLine,
  zoomLabel,
} from "./popup-copy";
import type { MapPlace, MapPlaceListing } from "./types";

function listing(
  id: string,
  practiceName: string,
  latitude: number,
  longitude: number,
): MapPlaceListing {
  return {
    id,
    title: `Remplacement ${id}`,
    dateRange: "1 – 15 déc.",
    practiceName,
    city: "Bordeaux",
    location: { latitude, longitude },
  };
}

function place(count: number, listings: MapPlaceListing[]): MapPlace {
  return { key: "k", latitude: 44.84, longitude: -0.58, count, listings };
}

const atOnePractice = [
  listing("a", "Cabinet Gambetta", 44.84, -0.58),
  listing("b", "Cabinet Gambetta", 44.84, -0.58),
];
const acrossTwoPractices = [
  listing("a", "Cabinet Gambetta", 44.84, -0.58),
  listing("b", "Cabinet Chartrons", 44.86, -0.57),
];

describe("listingCount", () => {
  it("agrees with its number", () => {
    expect(listingCount(1)).toBe("1 annonce");
    expect(listingCount(4)).toBe("4 annonces");
  });
});

describe("groupHeading", () => {
  it("titles one practice by its name, with its city under it", () => {
    expect(groupHeading(place(2, atOnePractice))).toEqual({
      heading: "Cabinet Gambetta",
      location: "Bordeaux",
    });
  });

  it("counts practices rather than naming the first of a cluster", () => {
    expect(groupHeading(place(2, acrossTwoPractices))).toEqual({
      heading: "2 cabinets à proximité",
      location: "Bordeaux",
    });
  });

  it("drops the city when the cluster spans several", () => {
    const [gambetta, chartrons] = acrossTwoPractices;
    if (!gambetta || !chartrons) throw new Error("fixture");
    const spread = [gambetta, { ...chartrons, city: "Mérignac" }];
    expect(groupHeading(place(2, spread)).location).toBeNull();
  });
});

describe("zoomLabel", () => {
  it("centres a lone posting", () => {
    expect(zoomLabel(place(1, atOnePractice.slice(0, 1)))).toBe("Centrer");
  });

  it("counts practices, not postings", () => {
    // Two openings at one address are one point: zooming separates nothing.
    expect(zoomLabel(place(2, atOnePractice))).toBe("Centrer sur ce cabinet");
    expect(zoomLabel(place(5, acrossTwoPractices))).toBe(
      "Zoomer sur ces 2 cabinets",
    );
  });
});

describe("unlistedLine", () => {
  it("is absent when every posting has a preview", () => {
    expect(unlistedLine(place(2, atOnePractice))).toBeNull();
  });

  it("names the postings the read sent no preview for", () => {
    expect(unlistedLine(place(3, atOnePractice))).toBe(
      "+ 1 autre annonce, visible dans la liste",
    );
    expect(unlistedLine(place(6, atOnePractice))).toBe(
      "+ 4 autres annonces, visibles dans la liste",
    );
  });
});

describe("shortReference", () => {
  it("keeps eight characters, upper-cased", () => {
    expect(shortReference("a1b2c3d4-e5f6")).toBe("#A1B2C3D4");
  });
});
