/**
 * The « how soon » chips above the results, as calendar bounds.
 *
 * A horizon and the bounds it produces are the same filter expressed two ways:
 * the chip row is the quick way in, the two date fields are the exact one, and
 * both write the same `from` **and `to`**. A horizon names a *period*, not a
 * lower bound — a lone `from` reads « Ce mois » as « from the 1st of next
 * month » and silently drops every posting starting this month, the very one
 * the chip is named for.
 */

import type { BrowseHorizon, HorizonBounds } from "./browse-contracts";

/**
 * The bounds a horizon produces, on a caller-supplied clock.
 *
 * `now` is a parameter rather than a `new Date()` done inside so the three
 * boundary days — week's Monday, month's first and last, next month's start —
 * can be tested against a fixed day. `horizonBounds` is the reader-facing
 * wrapper that hands over the real clock.
 *
 * The bounds are *calendar*-anchored, not today-anchored. « Cette semaine »
 * spans Monday to Sunday, « Ce mois » the 1st to the month's last day, and the
 * chips re-read the date fields against the current clock: bounds tied to
 * today's date would unlight every chip at midnight under a shared link — a
 * narrowing the results still carry, announced by a row that says nothing. A
 * calendar week and month keep each chip lit for exactly the span its labels
 * name. (Postings the feed shows are open ones, so a replacement that started
 * earlier in the week but is still running belongs under « Cette semaine »
 * every bit as much as one starting tomorrow.)
 */
export function horizonBoundsFor(
  horizon: BrowseHorizon,
  now: Date,
): HorizonBounds {
  switch (horizon) {
    case "WEEK":
      // Monday through Sunday of the current week. « From today » would have to
      // unlight again every midnight; the exact "from now on" tool is the date
      // field beside the chips, not the chip.
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
      // The 1st through the last day of the month — the whole month the chip
      // is named for, tail included.
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "LATER":
      // The first of the month after this one, with no upper bound: everything
      // that falls past the other two chips.
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
        to: "",
      };
    default:
      return { from: "", to: "" };
  }
}

/** The bounds a horizon produces, on today's clock. */
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
 * The horizon a pair of date fields corresponds to, or `ALL`.
 *
 * Keeps the segmented row honest about the date fields: typing a range that
 * does not match any option has to clear the selection, otherwise the row
 * would claim a narrowing the results do not have.
 *
 * Each horizon is matched against the exact pair it produces, rather than
 * against a range. Reading « at or before today » as « Cette semaine » looked
 * equivalent and is not: a reader who typed a date last month would have seen
 * the chip for a filter starting today lit under a date a month in the past. The
 * chip has to name what is actually applied.
 *
 * The chips overlap — an open replacement that started mid-week is both
 * « Cette semaine » and « Ce mois » — but their *pairs* never collide: a month
 * is longer than a week, so the two chips' bounds cannot coincide on any day.
 * Deterministic on both ends: which pair is applied and which chip it lights
 * rest on the same strings.
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
