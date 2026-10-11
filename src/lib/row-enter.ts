import type { CSSProperties } from "react";

/**
 * How long a row waits before entering, by its rank in the list.
 *
 * The step is small enough that the list reads as one gesture rather than as a
 * queue. The cap is the part that matters: an uncapped stagger on a page of
 * twenty would hold the last row back for nearly half a second, so the reader
 * watches the top of the table fill in while the row they scrolled to is still
 * invisible — and a row that is not yet there does not read as "still loading",
 * it reads as "missing".
 *
 * Ten ranks at 26 ms is 260 ms for the last row, under the 420 ms the fade
 * itself takes, so the whole list is settled a little after the first row
 * finishes rather than half a second behind it.
 */
const STEP_MS = 26;
const CAP = 10;

/**
 * The `style` for a row's entrance delay.
 *
 * Returns a new object per row rather than a shared constant: these end up as
 * inline styles on React elements, and a frozen shared object is one `style`
 * prop away from being mutated by something that thinks it is configuring a
 * single row.
 *
 * `--row-delay` is cast because `CSSProperties` knows nothing about custom
 * properties. It is registered with `@property` in `globals.css`, so the value
 * is a real typed time and animatable rather than an unvalidated token.
 */
export function rowEnterStyle(index: number): CSSProperties {
  return {
    "--row-delay": `${Math.min(Math.max(index, 0), CAP) * STEP_MS}ms`,
  } as CSSProperties;
}
