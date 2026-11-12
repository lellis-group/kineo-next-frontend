import type { CSSProperties } from "react";

/**
 * Entrance stagger by rank, capped so the last row isn't held back: 10 × 26ms
 * stays under the 420ms fade.
 */
const STEP_MS = 26;
const CAP = 10;

/**
 * The `style` for a row's entrance delay. `--row-delay` is cast because
 * `CSSProperties` doesn't know custom properties (it's `@property`-registered
 * in `globals.css`).
 */
export function rowEnterStyle(index: number): CSSProperties {
  return {
    "--row-delay": `${Math.min(Math.max(index, 0), CAP) * STEP_MS}ms`,
  } as CSSProperties;
}
