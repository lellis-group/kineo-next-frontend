/**
 * The « how soon » chips above the results, as calendar bounds. A horizon names
 * a *period*, so it writes both `from` and `to`.
 */

import type { BrowseHorizon, HorizonBounds } from "./browse-contracts";

/**
 * The bounds a horizon produces, on a caller-supplied clock (for tests).
 * Calendar-anchored (Monday–Sunday, 1st–last day) rather than today-anchored,
 * so a chip stays lit for the whole span its label names.
 */
export function horizonBoundsFor(
  horizon: BrowseHorizon,
  now: Date,
): HorizonBounds {
  switch (horizon) {
    case "WEEK":
      return {
        from: toIsoDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - ((now.getDay() + 6) % 7),
          ),
        ),
        to: toIsoDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (6 - ((now.getDay() + 6) % 7)),
          ),
        ),
      };
    case "MONTH":
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "LATER":
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
        to: "",
      };
    default:
      return { from: "", to: "" };
  }
}

export function horizonBounds(horizon: BrowseHorizon): HorizonBounds {
  return horizonBoundsFor(horizon, new Date());
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The horizon a pair of date fields corresponds to, or `ALL`. Matched on the
 * exact pair, so a hand-typed range never lights a chip it doesn't match.
 */
export function horizonForBounds(
  from?: string,
  to?: string,
  now: Date = new Date(),
): BrowseHorizon {
  if (!from) {
    return "ALL";
  }
  for (const horizon of ["WEEK", "MONTH", "LATER"] as const) {
    const bounds = horizonBoundsFor(horizon, now);
    if (bounds.from === from && bounds.to === to) {
      return horizon;
    }
  }
  return "ALL";
}
