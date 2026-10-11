import { describe, expect, it } from "bun:test";
import type { MapPlace, MapPlaceListing } from "./browse-contracts";
import { cameraTargetFor, distinctPoints } from "./map-camera";

/** A preview at a coordinate; only the fields this module reads are set. */
function listingAt(
  key: string,
  latitude: number,
  longitude: number,
): MapPlaceListing {
  return {
    id: key,
    title: key,
    dateRange: "",
    practiceName: key,
    city: "",
    location: { latitude, longitude },
  };
}

function placeWith(listings: MapPlaceListing[]): MapPlace {
  return {
    key: "place",
    latitude: listings[0]?.location.latitude ?? 0,
    longitude: listings[0]?.location.longitude ?? 0,
    count: listings.length,
    listings,
  };
}

describe("distinctPoints", () => {
  it("collapses the postings of one practice to one point", () => {
    // Six openings at one address is the ordinary case, not an edge case: the
    // bounds built from this would otherwise be a zero-area rectangle.
    const place = placeWith([
      listingAt("a", 44.84, -0.58),
      listingAt("b", 44.84, -0.58),
      listingAt("c", 44.84, -0.58),
    ]);

    expect(distinctPoints(place)).toEqual([[-0.58, 44.84]]);
  });

  it("keeps practices that sit at different addresses", () => {
    const place = placeWith([
      listingAt("a", 44.84, -0.58),
      listingAt("b", 44.87, -0.6),
    ]);

    expect(distinctPoints(place)).toEqual([
      [-0.58, 44.84],
      [-0.6, 44.87],
    ]);
  });

  it("emits longitude before latitude", () => {
    // Every call in the map's geometry is [lng, lat]; the reverse pair is
    // plausible-looking, lands in the Gulf of Guinea, and fails silently.
    const [point] = distinctPoints(placeWith([listingAt("a", 44.84, -0.58)]));

    expect(point).toEqual([-0.58, 44.84]);
  });
});

describe("cameraTargetFor", () => {
  it("frames the practices a group covers, so its dots can separate", () => {
    // Centring on the mean would reproduce the very cluster the reader is
    // trying to open — this is the regression the whole gesture exists for.
    const target = cameraTargetFor(
      placeWith([listingAt("a", 44.84, -0.58), listingAt("b", 44.87, -0.6)]),
    );

    expect(target).toEqual({
      kind: "bounds",
      points: [
        [-0.58, 44.84],
        [-0.6, 44.87],
      ],
    });
  });

  it("points at the camera for a single practice", () => {
    const target = cameraTargetFor(placeWith([listingAt("a", 44.84, -0.58)]));

    expect(target).toEqual({ kind: "point", center: [-0.58, 44.84] });
  });

  it("points even when a group holds several postings at one address", () => {
    // `fitBounds` on one coordinate is the documented way to end up with a
    // camera that never moves, which reads as a button that does nothing.
    const target = cameraTargetFor(
      placeWith([listingAt("a", 44.84, -0.58), listingAt("b", 44.84, -0.58)]),
    );

    expect(target).toEqual({ kind: "point", center: [-0.58, 44.84] });
  });
});
