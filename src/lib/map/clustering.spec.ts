import { describe, expect, test } from "bun:test";
import {
  groupByDistance,
  mergePlaces,
  type ProjectedPlace,
} from "@/lib/map/clustering";
import type { MapPlace } from "./types";

/** A place as `MapPlace`, with one posting under it. */
function bare(key: string, latitude = 0, longitude = 0, count = 1): MapPlace {
  return {
    key,
    latitude,
    longitude,
    count,
    listings: [
      {
        id: `${key}-l1`,
        title: `${key} annonce`,
        dateRange: "1 – 5 nov.",
        practiceName: `Cabinet ${key}`,
        city: "Bordeaux",
        location: { latitude, longitude },
      },
    ],
  };
}

/** The same place, at a screen position the grouping can measure. */
function place(key: string, x: number, y: number, count = 1): ProjectedPlace {
  return {
    place: bare(key, 0, 0, count),
    // The same Euclidean measure as MapLibre's `Point.dist`, so the grouping is
    // exercised against the geometry it really sees rather than against a looser
    // stand-in that would let a wrong threshold pass.
    point: {
      x,
      y,
      dist: (other) => Math.hypot(x - other.x, y - other.y),
    },
  };
}

describe("mergePlaces", () => {
  test("counts the postings the members hold, not the members", () => {
    const merged = mergePlaces([bare("a", 0, 0, 3), bare("b", 0, 0, 4)]);

    expect(merged.count).toBe(7);
  });

  test("sorts the key, so the same group is the same key whatever the order", () => {
    const forwards = mergePlaces([bare("a", 0, 0), bare("b", 0, 0)]);
    const backwards = mergePlaces([bare("b", 0, 0), bare("a", 0, 0)]);

    expect(forwards.key).toBe(backwards.key);
    expect(forwards.key).toBe("a+b");
  });

  test("stands at the mean, and carries every listing", () => {
    const merged = mergePlaces([bare("a", 44.0, -0.5), bare("b", 46.0, -1.5)]);

    expect(merged.latitude).toBe(45);
    expect(merged.longitude).toBe(-1);
    expect(merged.listings).toHaveLength(2);
  });
});

describe("groupByDistance", () => {
  test("leaves a place that is on its own as itself", () => {
    const alone = place("a", 0, 0);
    const rows = groupByDistance([alone], 44);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe(alone.place);
  });

  test("merges two places inside the radius and leaves the third", () => {
    const rows = groupByDistance(
      [place("a", 0, 0), place("b", 20, 0), place("c", 300, 0)],
      44,
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.key).sort()).toEqual(["a+b", "c"]);
  });

  test("is not transitive: a place within reach of a cluster is absorbed once", () => {
    // a and b touch, b and c touch, a and c do not. b is absorbed by a's pass,
    // so c is never reconsidered against it.
    const rows = groupByDistance(
      [place("a", 0, 0), place("b", 30, 0), place("c", 60, 0)],
      44,
    );

    expect(rows.map((row) => row.key)).toEqual(["a+b", "c"]);
  });

  test("leaves two places exactly at the radius apart", () => {
    // The comparison is strict: at the radius they are told apart, which is what
    // keeps two discs 44px apart from swallowing each other.
    const rows = groupByDistance([place("a", 0, 0), place("b", 44, 0)], 44);

    expect(rows).toHaveLength(2);
  });
});
